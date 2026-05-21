/**
 * @summary Swipeable meal card showing one dish per meal slot with carousel navigation.
 *
 * @description
 * Core UI component of FooFoo. Shows hero photo with gradient overlay, dish name,
 * cuisine tag, cook time + calories, and 3 action icons. Supports horizontal swipe
 * to browse carousel and long-press for Never/Not Today flows.
 *
 * @calledBy app/(tabs)/index.tsx — 3 instances, one per meal slot
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, Pressable, PanResponder,
  GestureResponderEvent, PanResponderGestureState,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { Dish } from '../../types';
import { cookTimeLabel } from './MealCard.helpers';
import { TIMING } from '../../config/constants';
import { UserJourneyLogger } from '../../utils/userJourneyLogger';
import { styles, CARD_HEIGHT, SCREEN_WIDTH } from './MealCard.styles';

interface MealCardProps {
  dish: Dish | null;
  carouselDishes: Dish[];
  mealSlot: 'breakfast' | 'lunch' | 'dinner';
  planDate: string;
  userId: string;
  isLocked: boolean;
  onLock: () => void;
  onDishChange: (dish: Dish, position: number) => void;
  onOpenDetail: (dish: Dish) => void;
  onNever: (dish: Dish) => void;
  onNotToday: (dish: Dish) => void;
}

const SWIPE_THRESHOLD = TIMING.SWIPE_THRESHOLD;
const LONG_PRESS_MS = TIMING.LONG_PRESS_MS;
// Minimum vertical drag distance (px) before a long-press is classified as Never or Not Today
const DRAG_DIRECTION_THRESHOLD = 30;
const PLACEHOLDER_HASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

const SLOT_LABELS: Record<string, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
};

export default function MealCard({
  dish,
  carouselDishes,
  mealSlot,
  planDate,
  userId,
  isLocked,
  onLock,
  onDishChange,
  onOpenDetail,
  onNever,
  onNotToday,
}: MealCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActive = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentDish = carouselDishes[currentIndex] ?? dish;

  /**
   * @summary Advances or retreats the carousel index and notifies the parent of the new dish.
   * @param {'left' | 'right'} direction - 'left' moves to the next option, 'right' goes back
   */
  const navigateCarousel = (direction: 'left' | 'right') => {
    if (isLocked || carouselDishes.length === 0) return;
    let next = currentIndex + (direction === 'left' ? 1 : -1);
    if (next < 0) next = 0;
    if (next >= carouselDishes.length) next = carouselDishes.length - 1;
    if (next === currentIndex) return;
    setCurrentIndex(next);
    const nextDish = carouselDishes[next];
    if (nextDish) {
      onDishChange(nextDish, next);
      if (userId) {
        UserJourneyLogger.logGestureAction(userId, 'swiped', nextDish.name, mealSlot, next);
      }
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) =>
      !longPressActive.current && (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5),

    onPanResponderGrant: (e: GestureResponderEvent) => {
      dragStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      longPressActive.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressActive.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, LONG_PRESS_MS);
    },

    onPanResponderMove: (_, gs: PanResponderGestureState) => {
      if (longPressActive.current) {
        if (gs.dy > DRAG_DIRECTION_THRESHOLD && currentDish) {
          if (userId) UserJourneyLogger.logGestureAction(userId, 'never', currentDish.name, mealSlot, currentIndex);
          onNever(currentDish);
          longPressActive.current = false;
        } else if (gs.dy < -DRAG_DIRECTION_THRESHOLD && currentDish) {
          if (userId) UserJourneyLogger.logGestureAction(userId, 'not_today', currentDish.name, mealSlot, currentIndex);
          onNotToday(currentDish);
          longPressActive.current = false;
        }
      }
    },

    onPanResponderRelease: (_, gs: PanResponderGestureState) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);

      if (!longPressActive.current) {
        if (gs.dx < -SWIPE_THRESHOLD) navigateCarousel('left');
        else if (gs.dx > SWIPE_THRESHOLD) navigateCarousel('right');
        else if (Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5 && currentDish) {
          onOpenDetail(currentDish);
        }
      }
      longPressActive.current = false;
    },

    onPanResponderTerminate: () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressActive.current = false;
    },
  });

  /**
   * @summary Triggers haptic feedback and calls the parent's onLock handler.
   */
  const handleLock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLock();
  };

  if (!currentDish) return <SkeletonCard mealSlot={mealSlot} />;

  const position = currentIndex + 1;
  const total = carouselDishes.length || 1;
  const cuisineName = currentDish.cuisines?.name ?? '';

  return (
    <View style={[styles.card, isLocked && styles.cardLocked]} {...panResponder.panHandlers}>
      <Image
        source={{ uri: currentDish.hero_image_url ?? `https://picsum.photos/seed/${currentDish.slug}/400/300` }}
        placeholder={currentDish.blurhash ?? PLACEHOLDER_HASH}
        contentFit="cover"
        style={styles.image}
        transition={TIMING.IMAGE_TRANSITION_MS}
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Top-left: slot label */}
      <Text style={styles.slotLabel}>{SLOT_LABELS[mealSlot]}</Text>

      {/* Top-right: position indicator */}
      <Text style={styles.positionLabel}>{position}/{total}</Text>

      {/* Bottom-left: dish info */}
      <View style={styles.infoContainer}>
        <Text style={styles.dishName} numberOfLines={2}>{currentDish.name}</Text>
        <View style={styles.metaRow}>
          {cuisineName ? <Text style={styles.tag}>{cuisineName}</Text> : null}
          <Text style={styles.metaText}>⏱ {cookTimeLabel(currentDish.cook_time_mins)}</Text>
          <Text style={styles.metaText}>🔥 {currentDish.calories} kcal</Text>
        </View>
      </View>

      {/* Bottom-right: action icons */}
      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} hitSlop={8} onPress={() => currentDish && onOpenDetail(currentDish)}>
          <Text style={styles.iconText}>📋</Text>
        </Pressable>
        <Pressable style={styles.iconBtn} hitSlop={8} onPress={handleLock}>
          <Text style={styles.iconText}>{isLocked ? '🔒' : '🔓'}</Text>
        </Pressable>
        <Pressable style={styles.iconBtn} hitSlop={8}>
          <Text style={styles.iconText}>➕</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * @summary Placeholder card shown while the dish data is loading.
 * @param {{ mealSlot: string }} props - The slot label to display (BREAKFAST / LUNCH / DINNER)
 */
function SkeletonCard({ mealSlot }: { mealSlot: string }) {
  return (
    <View style={styles.skeleton}>
      <Text style={styles.skeletonLabel}>{SLOT_LABELS[mealSlot]}</Text>
    </View>
  );
}

