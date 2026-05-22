/**
 * @summary Swipeable meal card showing one dish per slot with carousel navigation.
 *
 * @description
 * Core UI. Renders the hero photo + gradient overlay, dish name, cuisine tag,
 * cook time + calories, and three action icons. Gestures run on the UI thread
 * via react-native-gesture-handler v2 + Reanimated 3 — see Doc 09 §7 (60fps
 * non-negotiable). PanResponder was previously used here and dropped frames on
 * mid-range Android; do not bring it back without re-reading that section.
 *
 * Gesture model (race of three):
 *   Tap (≤250ms, ≤8px movement)  → onOpenDetail
 *   LongPress (≥300ms) + drag    → drag ≥30px down: Never; up: Not Today
 *   Pan (>10px translation)      → carousel swipe (≥50px left/right)
 *
 * @calledBy app/(tabs)/index.tsx — three instances, one per meal slot
 */

import React, { useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { Dish } from '../../types';
import { cookTimeLabel } from './MealCard.helpers';
import { TIMING } from '../../config/constants';
import { UserJourneyLogger } from '../../utils/userJourneyLogger';
import { logSuggestionAction } from '../../repositories/feedback.repository';
import { PostHogService } from '../../services/posthog.service';
import DatePickerModal from './DatePickerModal';
import { useResponsive } from '../../utils/responsive';
import { styles } from './MealCard.styles';

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

const SWIPE_THRESHOLD = TIMING.SWIPE_THRESHOLD; // px
const LONG_PRESS_MS = TIMING.LONG_PRESS_MS; // 300ms
// Minimum vertical drag distance (px) after long-press activation to classify Never (down) or Not Today (up)
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
  const { cardWidth } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const currentDish = carouselDishes[currentIndex] ?? dish;

  // Refs let worklet→JS callbacks always see the latest state without
  // capturing it through a stale closure inside a gesture worklet.
  const currentDishRef = useRef<Dish | null>(currentDish);
  currentDishRef.current = currentDish;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;
  const viewedLoggedRef = useRef<Set<number>>(new Set());

  // Log 'viewed' once per (dish.id) seen by this user — captures
  // every dish the user actually paused on, not just the carousel-shown set
  // that the Edge Function logs server-side.
  React.useEffect(() => {
    if (!userId || !currentDish) return;
    if (viewedLoggedRef.current.has(currentDish.id)) return;
    viewedLoggedRef.current.add(currentDish.id);
    logSuggestionAction(userId, currentDish.id, planDate, mealSlot, 'viewed', currentIndex).catch(() => {});
  }, [userId, currentDish, planDate, mealSlot, currentIndex]);

  // Shared values driven by the UI thread for GPU-accelerated transforms.
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isLongPressActive = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Visual tint overlays during the drag.
  // Red on downward drag (Never warning), orange on upward (Not Today).
  const neverOverlayStyle = useAnimatedStyle(() => ({
    opacity: isLongPressActive.value === 1
      ? interpolate(translateY.value, [0, 80], [0, 0.35], Extrapolation.CLAMP)
      : 0,
  }));
  const notTodayOverlayStyle = useAnimatedStyle(() => ({
    opacity: isLongPressActive.value === 1
      ? interpolate(translateY.value, [-80, 0], [0.35, 0], Extrapolation.CLAMP)
      : 0,
  }));

  const navigateCarousel = (direction: 'left' | 'right') => {
    if (isLockedRef.current || carouselDishes.length === 0) return;
    const i = currentIndexRef.current;
    let next = i + (direction === 'left' ? 1 : -1);
    if (next < 0) next = 0;
    if (next >= carouselDishes.length) next = carouselDishes.length - 1;
    if (next === i) return;

    const prevDish = carouselDishes[i];
    setCurrentIndex(next);
    const nextDish = carouselDishes[next];
    if (nextDish) {
      onDishChange(nextDish, next);
      if (userId) {
        // Split-action logging: 'swiped_past' for the dish we left, 'swiped_to'
        // for the one we landed on. RE v2 reads these as a paired signal.
        if (prevDish) {
          logSuggestionAction(userId, prevDish.id, planDate, mealSlot, 'swiped_past', i).catch(() => {});
        }
        logSuggestionAction(userId, nextDish.id, planDate, mealSlot, 'swiped_to', next).catch(() => {});
        PostHogService.capture('dish_swiped', {
          meal_slot: mealSlot,
          position: next,
          dish_id: nextDish.id,
          direction,
        });
        UserJourneyLogger.logGestureAction(userId, 'swiped', nextDish.name, mealSlot, next);
      }
    }
  };

  const handleOpenDetail = () => {
    const d = currentDishRef.current;
    if (d) onOpenDetail(d);
  };

  const handleNever = () => {
    const d = currentDishRef.current;
    if (!d) return;
    if (userId) {
      UserJourneyLogger.logGestureAction(userId, 'never', d.name, mealSlot, currentIndexRef.current);
    }
    onNever(d);
  };

  const handleNotToday = () => {
    const d = currentDishRef.current;
    if (!d) return;
    if (userId) {
      UserJourneyLogger.logGestureAction(userId, 'not_today', d.name, mealSlot, currentIndexRef.current);
    }
    onNotToday(d);
  };

  const triggerLongPressHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLock();
  };

  const handlePlus = () => {
    if (!currentDishRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowDatePicker(true);
  };

  // --- Gesture definitions (all worklets unless wrapped in runOnJS) ---

  const tap = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(8)
    .onEnd((_, success) => {
      'worklet';
      if (success) runOnJS(handleOpenDetail)();
    });

  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_MS)
    .maxDistance(1000) // don't cancel on drag — we use the drag direction post-activation
    .onStart(() => {
      'worklet';
      isLongPressActive.value = 1;
      scale.value = withTiming(0.97, { duration: 120 });
      runOnJS(triggerLongPressHaptic)();
    });

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
      'worklet';
      // When long-press is active, surface vertical drag for Never/Not Today
      // hint. Otherwise track horizontal drag for carousel swipe.
      if (isLongPressActive.value === 1) {
        translateY.value = e.translationY;
      } else {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (isLongPressActive.value === 1) {
        if (e.translationY > DRAG_DIRECTION_THRESHOLD) {
          runOnJS(handleNever)();
        } else if (e.translationY < -DRAG_DIRECTION_THRESHOLD) {
          runOnJS(handleNotToday)();
        }
      } else {
        if (e.translationX < -SWIPE_THRESHOLD) {
          runOnJS(navigateCarousel)('left');
        } else if (e.translationX > SWIPE_THRESHOLD) {
          runOnJS(navigateCarousel)('right');
        }
      }
      // Always settle the card back into place
      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      scale.value = withTiming(1, { duration: 150 });
      isLongPressActive.value = 0;
    })
    .onFinalize(() => {
      'worklet';
      // Safety net: if a gesture is interrupted mid-flight, reset visuals.
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withTiming(1, { duration: 150 });
      isLongPressActive.value = 0;
    });

  // Race: a clean tap beats long-press/pan. Otherwise long-press and pan
  // run together so a long-hold + drag can be classified.
  const composed = Gesture.Race(tap, Gesture.Simultaneous(longPress, pan));

  if (!currentDish) return <SkeletonCard mealSlot={mealSlot} width={cardWidth} />;

  const position = currentIndex + 1;
  const total = carouselDishes.length || 1;
  const cuisineName = currentDish.cuisines?.name ?? '';

  return (
    <>
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.card, { width: cardWidth }, isLocked && styles.cardLocked, animatedStyle]}>
        <Image
          source={{ uri: currentDish.hero_image_url ?? `https://picsum.photos/seed/${currentDish.slug ?? `dish-${currentDish.id}`}/400/300` }}
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

        <Text style={styles.slotLabel}>{SLOT_LABELS[mealSlot]}</Text>
        <Text style={styles.positionLabel}>{position}/{total}</Text>

        <View style={styles.infoContainer}>
          <Text style={styles.dishName} numberOfLines={2}>{currentDish.name}</Text>
          <View style={styles.metaRow}>
            {cuisineName ? <Text style={styles.tag}>{cuisineName}</Text> : null}
            <Text style={styles.metaText}>⏱ {cookTimeLabel(currentDish.cook_time_mins)}</Text>
            <Text style={styles.metaText}>🔥 {currentDish.calories} kcal</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.iconBtn} hitSlop={8} onPress={() => currentDish && onOpenDetail(currentDish)}>
            <Text style={styles.iconText}>📋</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} hitSlop={8} onPress={handleLock}>
            <Text style={styles.iconText}>{isLocked ? '🔒' : '🔓'}</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} hitSlop={8} onPress={handlePlus}>
            <Text style={styles.iconText}>➕</Text>
          </Pressable>
        </View>

        <Animated.View pointerEvents="none" style={[styles.tintOverlayNever, neverOverlayStyle]} />
        <Animated.View pointerEvents="none" style={[styles.tintOverlayNotToday, notTodayOverlayStyle]} />
      </Animated.View>
    </GestureDetector>
    {showDatePicker && currentDish && (
      <DatePickerModal
        dish={currentDish}
        userId={userId}
        currentSlot={mealSlot}
        onConfirm={() => setShowDatePicker(false)}
        onCancel={() => setShowDatePicker(false)}
      />
    )}
  </>);
}

function SkeletonCard({ mealSlot, width }: { mealSlot: string; width: number }) {
  return (
    <View style={[styles.skeleton, { width }]}>
      <Text style={styles.skeletonLabel}>{SLOT_LABELS[mealSlot]}</Text>
    </View>
  );
}
