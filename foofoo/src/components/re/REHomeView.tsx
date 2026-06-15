/**
 * REHomeView — mounts the full RE day view using useTodayView hook.
 *
 * Gestures (D2, confirmed):
 *   swipe-left  → Not Today (skip today, 3-day cooldown)
 *   long-press  → Never (permanent — confirm via REErrorState or inline confirm)
 *   Buttons in REMealControls serve as accessible fallback for all gestures.
 *
 * Each slot renders: REMealCard (primary) + REAddonSubCard (member add-ons below).
 * Feedback is submitted through the resolver service via useSubmitFeedback.
 */
import React, { useRef, useState } from 'react';
import {
  View, Text, PanResponder, StyleSheet, Alert,
} from 'react-native';
import { SPACING, getREPalette } from '../../config/re-theme';
import { useTodayView, useSubmitFeedback } from '../../modules/recommendation-engine/hooks/useREHome';
import REMealCard, { SLOT_LABEL } from './home/REMealCard';
import RESkeleton from './foundation/RESkeleton';
import REEmptyState from './foundation/REEmptyState';
import REErrorState from './foundation/REErrorState';
import RESwapSheet from './weekly/RESwapSheet';
import { buildSwapTiers } from '../../utils/re-weekly';
import type { REDishCandidate, REMealClassRef, REAddonComponent } from '../../types';

const SWIPE_THRESHOLD = 60; // px left to trigger Not Today

type Slot = 'breakfast' | 'lunch' | 'snack' | 'dinner';
const SLOTS: Slot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

interface SwapState {
  visible: boolean;
  slot: Slot | null;
  classRef: REMealClassRef | null;
  candidates: REDishCandidate[];
}

/**
 * @summary Full RE day view: 4 meal slot cards + member add-ons + feedback + swap sheet.
 *
 * @param {{ userId: string }} props
 *
 * @calledBy app/(tabs)/index.tsx — for RE users in Day View.
 */
export default function REHomeView({ userId }: { userId: string }) {
  const c = getREPalette('light');
  const { data, isLoading, error, refetch } = useTodayView(userId);
  const { mutate: submitFeedback } = useSubmitFeedback(userId);
  const [swap, setSwap] = useState<SwapState>({ visible: false, slot: null, classRef: null, candidates: [] });

  if (isLoading) return <RESkeleton variant="card" />;
  if (error) return <REErrorState code="GENERATION_FAILED" onRetry={() => refetch()} />;
  if (!data?.dayPlan) return <REEmptyState kind="no-plan" />;

  const { dayPlan, addons, dishes } = data;

  function openSwap(slot: Slot) {
    const slotDishes = dishes?.[slot]?.topDishes ?? [];
    const classRef = dayPlan[slot];
    setSwap({ visible: true, slot, classRef, candidates: slotDishes });
  }

  function handleSwapSelect(dish: REDishCandidate) {
    if (!swap.slot || !swap.classRef) return;
    submitFeedback({ dishOptionId: dish.dishOptionId, mealClassCode: swap.classRef.classCode, signal: 'ACCEPT' });
    setSwap((s) => ({ ...s, visible: false }));
  }

  return (
    <View style={styles.container}>
      {SLOTS.map((slot) => {
        const classRef = dayPlan[slot];
        const topDish = dishes?.[slot]?.topDishes?.[0] ?? null;
        const slotAddons: REAddonComponent[] = addons[slot] ?? [];
        return (
          <SwipeableSlot
            key={slot}
            onSwipeLeft={() => {
              if (!topDish || !classRef) return;
              submitFeedback({ dishOptionId: topDish.dishOptionId, mealClassCode: classRef.classCode, signal: 'NOT_TODAY' });
            }}
          >
            <REMealCard
              slot={slot}
              classRef={classRef}
              topDish={topDish}
              addons={slotAddons}
              onKeep={() => {
                if (!topDish || !classRef) return;
                submitFeedback({ dishOptionId: topDish.dishOptionId, mealClassCode: classRef.classCode, signal: 'ACCEPT' });
              }}
              onSwap={() => openSwap(slot)}
              onLock={() => {
                if (!topDish || !classRef) return;
                submitFeedback({ dishOptionId: topDish.dishOptionId, mealClassCode: classRef.classCode, signal: 'LOCK' });
              }}
              onNotToday={() => {
                if (!topDish || !classRef) return;
                submitFeedback({ dishOptionId: topDish.dishOptionId, mealClassCode: classRef.classCode, signal: 'NOT_TODAY' });
              }}
              onNever={() => {
                if (!topDish || !classRef) return;
                Alert.alert(
                  'Never suggest this?',
                  `We'll remove "${topDish.dishName}" from your suggestions permanently.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Yes, never',
                      style: 'destructive',
                      onPress: () => submitFeedback({
                        dishOptionId: topDish.dishOptionId,
                        mealClassCode: classRef.classCode,
                        signal: 'NEVER',
                      }),
                    },
                  ],
                );
              }}
            />
          </SwipeableSlot>
        );
      })}

      {swap.visible && swap.slot && swap.classRef && (
        <RESwapSheet
          visible={swap.visible}
          onClose={() => setSwap((s) => ({ ...s, visible: false }))}
          slotLabel={SLOT_LABEL[swap.slot]}
          tiers={buildSwapTiers(swap.classRef.classCode)}
          candidatesByTier={{ same: swap.candidates, different: [], broader: [] }}
          onSelectDish={handleSwapSelect}
        />
      )}

      <Text style={[styles.hint, { color: c.textSecondary }]}>
        Swipe left — Not today · Long press — Never
      </Text>
    </View>
  );
}

/** Wraps a child in a PanResponder that fires onSwipeLeft when threshold crossed. */
function SwipeableSlot({ children, onSwipeLeft }: { children: React.ReactNode; onSwipeLeft: () => void }) {
  const startX = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: (_, gs) => { startX.current = gs.x0; },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -SWIPE_THRESHOLD) onSwipeLeft();
      },
    }),
  ).current;

  return <View {...pan.panHandlers}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { gap: SPACING.sm, paddingHorizontal: SPACING.md },
  hint: { textAlign: 'center', fontSize: 11, marginTop: SPACING.xs, marginBottom: SPACING.sm },
});
