/**
 * @summary Home screen — Day View showing today's B/L/D meal plan.
 *
 * @description
 * Primary screen. On mount: calls generate-daily-plan Edge Function, renders
 * 3 MealCards (breakfast, lunch, dinner). Supports pull-to-refresh. Shows
 * gesture tutorial overlay on first visit. Date navigator lets user browse days.
 *
 * @calledBy Expo Router — default tab screen
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { supabase } from '../../src/services/supabase';
import { generateDailyPlan, getCarouselForSlot, getTodayIST, logSuggestionAction, lockSlot, unlockSlot } from '../../src/repositories/plans.repository';
import MealCard from '../../src/components/dish/MealCard';
import GestureTutorial from '../../src/components/shared/GestureTutorial';
import NeverModal from '../../src/components/dish/NeverModal';
import NotTodayModal from '../../src/components/dish/NotTodayModal';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import type { GeneratedPlan, Dish } from '../../src/types';

declare const __DEV__: boolean;

const GESTURE_TUTORIAL_KEY = 'foofoo_gesture_tutorial_seen';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
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

  // Modals — store dish + which slot triggered it
  const [neverDish, setNeverDish] = useState<Dish | null>(null);
  const [neverSlot, setNeverSlot] = useState<string>('');
  const [notTodayDish, setNotTodayDish] = useState<Dish | null>(null);
  const [notTodaySlot, setNotTodaySlot] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
    checkTutorial();
    loadPlan(false);
  }, [planDate]); // loadPlan depends only on planDate (via useCallback), so planDate covers it

  const checkTutorial = async () => {
    try {
      const seen = await AsyncStorage.getItem(GESTURE_TUTORIAL_KEY);
      if (!seen) setShowTutorial(true);
    } catch {
      // ignore
    }
  };

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

  const loadPlan = useCallback(async (forceRegenerate: boolean) => {
    try {
      setError(null);
      const result = await generateDailyPlan(planDate, forceRegenerate);
      setPlan(result);
      setPlanId(result.planId);

      // Log RE decisions to user journey log (fire-and-forget)
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

      // Show primary dish immediately, then load full carousels in background
      const bDishes = result.breakfast.dish ? [result.breakfast.dish] : [];
      const lDishes = result.lunch.dish ? [result.lunch.dish] : [];
      const dDishes = result.dinner.dish ? [result.dinner.dish] : [];
      setCarousels({ breakfast: bDishes, lunch: lDishes, dinner: dDishes });

      // Load full carousel dishes asynchronously (don't await — non-blocking)
      loadCarousels(result.planId, result);
    } catch (err: any) {
      Logger.error('HOME', 'Failed to load plan', { message: err.message });
      setError(err.message || 'Failed to load plan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planDate, userId]);

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
    } catch {
      // Keep initial single-dish carousels on failure
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlan(true);
  }, [loadPlan]);

  const handleDishChange = (slot: string) => (dish: Dish, position: number) => {
    if (!userId) return;
    logSuggestionAction(userId, dish.id, planDate, slot, 'swiped', position);
  };

  const handleLock = (slot: string) => async () => {
    if (!planId || !plan) return;
    const currentDish = plan[slot as keyof GeneratedPlan] as any;
    const dish = currentDish?.dish;
    if (!dish) return;

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
  };

  const handleNever = (slot: string) => (dish: Dish) => {
    setNeverDish(dish);
    setNeverSlot(slot);
  };
  const handleNotToday = (slot: string) => (dish: Dish) => {
    setNotTodayDish(dish);
    setNotTodaySlot(slot);
  };

  const handleNeverConfirmed = () => {
    setNeverDish(null);
    setNeverSlot('');
    loadPlan(true);
  };

  const handleNotTodayConfirmed = () => {
    setNotTodayDish(null);
    setNotTodaySlot('');
    loadPlan(true);
  };

  const handleOpenDetail = (dish: Dish) => {
    if (!userId) return;
    logSuggestionAction(userId, dish.id, planDate, '', 'tapped_detail', 0);
    Alert.alert(dish.name, `${dish.cuisines?.name ?? ''} • ${dish.calories} kcal • ${dish.cook_time_mins}m`);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(planDate);
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    setPlanDate(d.toISOString().split('T')[0]);
    setLoading(true);
    setPlan(null);
  };

  const displayDate = new Date(planDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  if (loading && !refreshing) {
    return <LoadingScreen insetTop={insets.top} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={handleTitlePress} hitSlop={8}>
          <Text style={styles.appName}>Foofoo</Text>
        </Pressable>
        <View style={styles.topActions}>
          <Text style={styles.topIcon}>🔔</Text>
          <Text style={styles.topIcon}>🔍</Text>
        </View>
      </View>

      {/* Date navigator */}
      <View style={styles.dateNav}>
        <Pressable onPress={() => navigateDate('prev')} hitSlop={12}>
          <Text style={styles.dateArrow}>◀</Text>
        </Pressable>
        <Text style={styles.dateText}>{displayDate}</Text>
        <Pressable onPress={() => navigateDate('next')} hitSlop={12}>
          <Text style={styles.dateArrow}>▶</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {error ? (
          <ErrorState message={error} onRetry={() => loadPlan(false)} />
        ) : plan ? (
          <>
            {(['breakfast', 'lunch', 'dinner'] as const).map((slot) => {
              const slotData = plan[slot];
              return (
                <View key={slot} style={styles.cardWrapper}>
                  <MealCard
                    dish={slotData.dish}
                    carouselDishes={carousels[slot]}
                    mealSlot={slot}
                    planDate={planDate}
                    userId={userId ?? ''}
                    isLocked={lockedSlots.includes(slot)}
                    onLock={handleLock(slot)}
                    onDishChange={handleDishChange(slot)}
                    onOpenDetail={handleOpenDetail}
                    onNever={handleNever(slot)}
                    onNotToday={handleNotToday(slot)}
                  />
                  <Text style={styles.carouselHint}>
                    Swipe to explore {slotData.carouselCount} options
                  </Text>
                </View>
              );
            })}
          </>
        ) : (
          <EmptyState />
        )}
      </ScrollView>

      {showTutorial && (
        <GestureTutorial
          onDismiss={async () => {
            await AsyncStorage.setItem(GESTURE_TUTORIAL_KEY, 'true');
            setShowTutorial(false);
          }}
        />
      )}

      {neverDish && (
        <NeverModal
          dish={neverDish}
          userId={userId ?? ''}
          planDate={planDate}
          mealSlot={neverSlot}
          onConfirm={handleNeverConfirmed}
          onCancel={() => { setNeverDish(null); setNeverSlot(''); }}
        />
      )}

      {notTodayDish && (
        <NotTodayModal
          dish={notTodayDish}
          userId={userId ?? ''}
          planDate={planDate}
          mealSlot={notTodaySlot}
          onConfirm={handleNotTodayConfirmed}
          onCancel={() => { setNotTodayDish(null); setNotTodaySlot(''); }}
        />
      )}
    </View>
  );
}

function LoadingScreen({ insetTop }: { insetTop: number }) {
  return (
    <View style={[styles.container, { paddingTop: insetTop }]}>
      <View style={styles.topBar}>
        <Text style={styles.appName}>Foofoo</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {(['BREAKFAST', 'LUNCH', 'DINNER'] as const).map(label => (
          <View key={label} style={styles.cardWrapper}>
            <View style={styles.skeletonCard}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.skeletonText}>{label}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centerContent}>
      <Text style={styles.errorText}>Couldn't load your plan.</Text>
      <Text style={styles.errorSub}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.centerContent}>
      <Text style={styles.emptyText}>We're still adding dishes! Check back soon. 🍲</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  appName: { fontSize: 24, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  topActions: { flexDirection: 'row', gap: SPACING.md },
  topIcon: { fontSize: 20 },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.lg, paddingVertical: SPACING.sm,
  },
  dateArrow: { fontSize: 14, color: COLORS.textSecondary },
  dateText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { gap: SPACING.md, paddingTop: SPACING.sm, paddingHorizontal: SPACING.md },
  cardWrapper: { gap: 6 },
  carouselHint: { textAlign: 'center', fontSize: 11, color: COLORS.textSecondary },
  skeletonCard: {
    height: 220, borderRadius: BORDER_RADIUS.md, backgroundColor: '#e8e8e8',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  skeletonText: { color: '#9e9e9e', fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  errorText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  errorSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },
});
