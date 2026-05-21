/**
 * @summary All state, effects, and event handlers for the Home screen Day View.
 *
 * @description Extracted from app/(tabs)/index.tsx to keep the screen file under 300 lines.
 *   Manages plan fetching, carousel loading, slot lock/unlock, modal triggers, and
 *   date navigation. Consumed exclusively by HomeScreen.
 *
 * @calledBy app/(tabs)/index.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/services/supabase';
import {
  generateDailyPlan, getCarouselForSlot, getTodayIST,
  logSuggestionAction, lockSlot, unlockSlot,
} from '../../src/repositories/plans.repository';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import type { GeneratedPlan, Dish } from '../../src/types';

declare const __DEV__: boolean;

const GESTURE_TUTORIAL_KEY = 'foofoo_gesture_tutorial_seen';

/**
 * @summary Returns all state and handlers required by the Home screen.
 *
 * @returns State variables, derived display values, and event handler functions
 *
 * @calledBy `app/(tabs)/index.tsx`
 */
export function useHomeScreen() {
  const router = useRouter();
  const [planDate, setPlanDate] = useState(getTodayIST);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [carousels, setCarousels] = useState<Record<string, Dish[]>>({
    breakfast: [], lunch: [], dinner: [],
  });
  const [lockedSlots, setLockedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [neverDish, setNeverDish] = useState<Dish | null>(null);
  const [neverSlot, setNeverSlot] = useState('');
  const [notTodayDish, setNotTodayDish] = useState<Dish | null>(null);
  const [notTodaySlot, setNotTodaySlot] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
    checkTutorial();
    loadPlan(false);
  }, [planDate]);

  /**
   * @summary Reads AsyncStorage to decide whether to show the gesture tutorial overlay.
   */
  const checkTutorial = async () => {
    try {
      const seen = await AsyncStorage.getItem(GESTURE_TUTORIAL_KEY);
      if (!seen) setShowTutorial(true);
    } catch { /* ignore */ }
  };

  /**
   * @summary Triple-tap on app title opens dev tools (dev mode only).
   */
  const handleTitlePress = () => {
    if (!__DEV__) return;
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 800);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      router.push('/(dev)/logs' as never);
    }
  };

  /**
   * @summary Fetches or generates the daily plan and seeds carousel state.
   * @param {boolean} forceRegenerate - When true, bypasses the cached plan
   */
  const loadPlan = useCallback(async (forceRegenerate: boolean) => {
    try {
      setError(null);
      const result = await generateDailyPlan(planDate, forceRegenerate);
      setPlan(result);
      setPlanId(result.planId);

      if (userId && result.reSummary) {
        const slots = ['breakfast', 'lunch', 'dinner'] as const;
        for (const slot of slots) {
          const s = result.reSummary[slot];
          if (s?.winner?.name) {
            UserJourneyLogger.logREDecision(userId, slot, planDate, s.winner, s.alternatives ?? [], s.reasoning ?? '')
              .catch(() => {});
          }
        }
      }

      setCarousels({
        breakfast: result.breakfast.dish ? [result.breakfast.dish] : [],
        lunch: result.lunch.dish ? [result.lunch.dish] : [],
        dinner: result.dinner.dish ? [result.dinner.dish] : [],
      });
      loadCarousels(result.planId, result);
    } catch (err: any) {
      Logger.error('HOME', 'Plan load failed', { error: err?.message, planDate });
      setError('Check your internet connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planDate, userId]);

  /**
   * @summary Loads full carousel dishes for all three slots in the background.
   * @param {string} id - planId returned by generateDailyPlan
   * @param {GeneratedPlan} result - Fallback plan if carousel fetch fails
   */
  const loadCarousels = useCallback(async (id: string, result: GeneratedPlan) => {
    try {
      const [b, l, d] = await Promise.all([
        getCarouselForSlot(id, 'breakfast'),
        getCarouselForSlot(id, 'lunch'),
        getCarouselForSlot(id, 'dinner'),
      ]);
      setCarousels({
        breakfast: b.length > 0 ? b : (result.breakfast.dish ? [result.breakfast.dish] : []),
        lunch: l.length > 0 ? l : (result.lunch.dish ? [result.lunch.dish] : []),
        dinner: d.length > 0 ? d : (result.dinner.dish ? [result.dinner.dish] : []),
      });
    } catch { /* Keep single-dish fallback */ }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlan(true);
  }, [loadPlan]);

  /**
   * @summary Returns a dish-change handler for a given meal slot.
   * @param {string} slot - 'breakfast', 'lunch', or 'dinner'
   */
  const handleDishChange = (slot: string) => (dish: Dish, position: number) => {
    if (!userId) return;
    logSuggestionAction(userId, dish.id, planDate, slot, 'swiped', position);
  };

  /**
   * @summary Returns a lock/unlock toggle handler for a given meal slot.
   * @param {string} slot - 'breakfast', 'lunch', or 'dinner'
   */
  const handleLock = (slot: string) => async () => {
    if (!planId || !plan) return;
    const currentDish = plan[slot as keyof GeneratedPlan] as any;
    const dish = currentDish?.dish;
    if (!dish) return;
    try {
      if (lockedSlots.includes(slot)) {
        await unlockSlot(planId, slot);
        setLockedSlots(prev => prev.filter(s => s !== slot));
        if (userId) UserJourneyLogger.logGestureAction(userId, 'unlocked', dish.name, slot, 0);
      } else {
        await lockSlot(planId, slot, dish.id);
        setLockedSlots(prev => [...prev, slot]);
        if (userId) {
          logSuggestionAction(userId, dish.id, planDate, slot, 'locked', 0);
          UserJourneyLogger.logGestureAction(userId, 'locked', dish.name, slot, 0);
        }
      }
    } catch (err: any) {
      Logger.error('HOME', 'Lock/unlock slot failed', { error: err?.message, slot, planId });
      Alert.alert('Could not update lock', 'Please try again.');
    }
  };

  /**
   * @summary Opens a native alert with brief dish details on card tap.
   * @param {Dish} dish - The dish the user tapped
   */
  const handleOpenDetail = (dish: Dish) => {
    if (!userId) return;
    logSuggestionAction(userId, dish.id, planDate, '', 'tapped_detail', 0);
    Alert.alert(dish.name, `${dish.cuisines?.name ?? ''} • ${dish.calories} kcal • ${dish.cook_time_mins}m`);
  };

  /**
   * @summary Shifts planDate by one day and resets loading state.
   * @param {'prev' | 'next'} direction - Which direction to move
   */
  const navigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(planDate);
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    setPlanDate(d.toISOString().split('T')[0]);
    setLoading(true);
    setPlan(null);
  };

  const handleNeverConfirmed = () => { setNeverDish(null); setNeverSlot(''); loadPlan(true); };
  const handleNotTodayConfirmed = () => { setNotTodayDish(null); setNotTodaySlot(''); loadPlan(true); };

  const displayDate = new Date(planDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  return {
    planDate, plan, planId, carousels, lockedSlots,
    loading, refreshing, error, showTutorial, userId,
    neverDish, neverSlot, notTodayDish, notTodaySlot,
    displayDate,
    setShowTutorial, setNeverDish, setNeverSlot, setNotTodayDish, setNotTodaySlot,
    handleTitlePress, loadPlan, onRefresh,
    handleDishChange, handleLock, handleOpenDetail, navigateDate,
    handleNeverConfirmed, handleNotTodayConfirmed,
    GESTURE_TUTORIAL_KEY,
  };
}
