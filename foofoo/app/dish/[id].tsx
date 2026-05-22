/**
 * @summary Meal Detail screen — full info for one dish.
 *
 * @description
 * Dynamic route /dish/[id]. Renders the hero image (40% height), key stats bar
 * (cook time, calories, difficulty, spice), auto-derived dietary badges, Food
 * DNA chips, ingredient list (Level 2), recipe placeholder, action buttons,
 * and similar dishes rail. All data fetched via getDishById + getSimilarDishes.
 *
 * Logs to suggestion_logs ('tapped_detail' on mount, 'tapped_ingredients' on
 * ingredient section visible) + UserJourneyLogger + app_events (screen_view).
 *
 * @calledBy Expo Router — navigated from MealCard tap and similar dishes rail
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, Share, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/services/supabase';
import { getDishById, getSimilarDishes } from '../../src/repositories/dishes.repository';
import {
  logSuggestionAction, logScreenView, logFeatureTap,
} from '../../src/repositories/feedback.repository';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { PostHogService } from '../../src/services/posthog.service';
import { Logger } from '../../src/utils/systemLogger';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { APP_NAME } from '../../src/config/constants';
import DishDetailHeader from '../../src/components/dish/DishDetailHeader';
import FoodDNAChips from '../../src/components/dish/FoodDNAChips';
import DietaryBadges from '../../src/components/dish/DietaryBadges';
import IngredientList from '../../src/components/dish/IngredientList';
import DatePickerModal from '../../src/components/dish/DatePickerModal';
import { spiceLabel } from '../../src/components/dish/MealCard.helpers';
import type { FullDish, SimilarDishRow } from '../../src/types';

/**
 * @summary Capitalises the first character.
 * @param {string} s - any string
 * @returns {string} same string with first char uppercased
 */
function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function DishDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const dishId = Number(params.id);

  const [dish, setDish] = useState<FullDish | null>(null);
  const [similar, setSimilar] = useState<SimilarDishRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ingredientsLogged, setIngredientsLogged] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!dishId || Number.isNaN(dishId)) {
      setError('Invalid dish ID.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [d, sim] = await Promise.all([
          getDishById(dishId),
          getSimilarDishes(dishId, 4),
        ]);
        if (cancelled) return;
        if (!d) {
          setError('We couldn\'t find that dish.');
        } else {
          setDish(d);
          setSimilar(sim);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          Logger.error('DISH-DETAIL', 'Load failed', { dishId, error: msg });
          setError('Could not load dish details. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dishId]);

  // Log tapped_detail + screen_view once dish + userId both known
  useEffect(() => {
    if (!dish || !userId) return;
    const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
    logSuggestionAction(userId, dish.id, today, dish.meal_types?.[0] ?? 'all', 'tapped_detail', 0).catch(() => {});
    logScreenView(userId, 'dish_detail', { dishId: dish.id, dishName: dish.name });
    PostHogService.screen('dish_detail', { dishId: dish.id, dishName: dish.name });
    PostHogService.capture('dish_detail_opened', { dish_id: dish.id, dish_name: dish.name });
    UserJourneyLogger.logGestureAction(userId, 'tapped_detail', dish.name, dish.meal_types?.[0] ?? 'all', 0).catch(() => {});
  }, [dish, userId]);

  const stats = useMemo(() => {
    if (!dish) return null;
    return [
      { emoji: '🕐', label: `${dish.cook_time_mins} min` },
      { emoji: '🔥', label: `${dish.calories} kcal` },
      { emoji: '📊', label: cap(dish.difficulty ?? 'easy') },
      { emoji: '🌶', label: spiceLabel(dish.spice_level ?? 2) },
    ];
  }, [dish]);

  const handleShare = async () => {
    if (!dish) return;
    try {
      await Share.share({ message: `Try ${dish.name} on ${APP_NAME}!` });
      if (userId) logFeatureTap(userId, 'share', { screen: 'dish_detail', dishId: dish.id });
    } catch {
      // user cancelled
    }
  };

  const handleLock = () => {
    if (!dish || !userId) return;
    if (userId) logFeatureTap(userId, 'lock_from_detail', { screen: 'dish_detail', dishId: dish.id });
    Alert.alert('Lock this meal', 'Locking from the Detail page will be wired in the next iteration. For now, lock from the Home card.');
  };

  const handleAddToDate = () => {
    if (!dish || !userId) return;
    setShowDatePicker(true);
  };

  // Log tapped_ingredients when user scrolls and the section becomes visible
  const handleScroll = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (ingredientsLogged || !dish || !userId) return;
    // Heuristic: after ~hero (40% screen) + stats/badges/chips section, ingredients begin
    if (e.nativeEvent.contentOffset.y > 60) {
      setIngredientsLogged(true);
      const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
      logSuggestionAction(userId, dish.id, today, dish.meal_types?.[0] ?? 'all', 'tapped_ingredients', 0).catch(() => {});
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error || !dish) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>{error ?? 'Dish not found'}</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const ingredientCount = (dish.meal_ingredients ?? []).filter(mi => mi.ingredients).length;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={250}
      >
        <DishDetailHeader dish={dish} onBack={() => router.back()} />

        <View style={styles.body}>
          {/* Row 1 — Stats bar */}
          {stats && (
            <View style={styles.statsRow}>
              {stats.map((s, i) => (
                <View key={i} style={styles.statItem}>
                  <Text style={styles.statEmoji}>{s.emoji}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Row 2 — Dietary badges */}
          <DietaryBadges dish={dish} />

          {/* Row 3 — Food DNA chips */}
          <FoodDNAChips tags={dish.dish_tags ?? []} />

          {/* Description (optional, only if present) */}
          {dish.description ? (
            <Text style={styles.description}>{dish.description}</Text>
          ) : null}

          {/* Row 4 — Ingredients header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Ingredients{ingredientCount > 0 ? ` · ${ingredientCount}` : ''}
            </Text>
            <Text style={styles.sectionSub}>Simple ingredient list — full recipe coming soon</Text>
          </View>

          {/* Row 5 — Ingredient list */}
          <IngredientList ingredients={dish.meal_ingredients ?? []} />

          {/* Row 6 — Recipe placeholder */}
          <View style={styles.recipeCard}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.recipeTitle}>Full recipe with quantities &amp; steps coming soon!</Text>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>

          {/* Row 7 — Action buttons */}
          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={handleLock}>
              <Text style={styles.actionText}>🔒 Lock</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleAddToDate}>
              <Text style={styles.actionText}>📅 Add to date</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleShare}>
              <Text style={styles.actionText}>📤 Share</Text>
            </Pressable>
          </View>

          {/* Row 8 — Similar dishes (only if available) */}
          {similar.length > 0 && (
            <View style={styles.similarBlock}>
              <Text style={styles.sectionTitle}>You might also like</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
                {similar.map(s => {
                  const sd = s.dishes;
                  if (!sd) return null;
                  return (
                    <Pressable
                      key={sd.id}
                      style={styles.similarCard}
                      onPress={() => router.push(`/dish/${sd.id}` as never)}
                    >
                      <Image
                        source={{ uri: sd.hero_image_url ?? `https://picsum.photos/seed/${sd.id}/200/200` }}
                        placeholder={sd.blurhash ?? 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'}
                        contentFit="cover"
                        style={styles.similarImage}
                      />
                      <Text style={styles.similarName} numberOfLines={1}>{sd.name}</Text>
                      <Text style={styles.similarMeta} numberOfLines={1}>
                        {sd.cuisines?.name ?? ''} · {sd.cook_time_mins}m
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {showDatePicker && (
        <DatePickerModal
          dish={dish}
          userId={userId}
          currentSlot={(dish.meal_types?.[0] as 'breakfast' | 'lunch' | 'dinner') ?? 'lunch'}
          onConfirm={(date, slot) => {
            setShowDatePicker(false);
            Alert.alert('Added!', `Added to ${cap(slot)} on ${formatDateLabel(date)}. 🎉`);
          }}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
    </View>
  );
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, gap: SPACING.md },
  errorTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  backLink: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  backLinkText: { color: COLORS.primary, fontWeight: '600' },

  body: { padding: SPACING.md, gap: SPACING.lg },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 20 },
  statLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },

  description: {
    fontSize: 14, lineHeight: 20, color: COLORS.textPrimary,
  },

  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  sectionSub: { fontSize: 12, color: COLORS.textSecondary },

  recipeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', gap: SPACING.sm,
  },
  lockIcon: { fontSize: 22 },
  recipeTitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  progressTrack: {
    width: '60%', height: 4, borderRadius: 2,
    backgroundColor: '#F1F3F2', overflow: 'hidden',
  },
  progressFill: { width: '30%', height: 4, backgroundColor: COLORS.primary },

  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: {
    flex: 1, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center',
  },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

  similarBlock: { gap: SPACING.sm },
  similarRow: { gap: SPACING.md, paddingRight: SPACING.md },
  similarCard: { width: 130, gap: 6 },
  similarImage: { width: 130, height: 90, borderRadius: BORDER_RADIUS.md, backgroundColor: '#eee' },
  similarName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  similarMeta: { fontSize: 11, color: COLORS.textSecondary },
});
