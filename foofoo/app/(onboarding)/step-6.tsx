import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import { BucketSelector } from '../../src/components/shared/BucketSelector';
import {
  fetchLunchDinnerDishes, saveMealBuckets, fetchFOCuisineIds,
} from '../../src/repositories/meal-prefs.repository';
import { updateOnboardingStep } from '../../src/repositories/profiles.repository';
import { COLORS, SPACING } from '../../src/config/constants';
import type { BucketItem, BucketMap } from '../../src/types';

/**
 * @summary Onboarding Step 6 — sort lunch + dinner dishes into F/O/N buckets.
 *
 * @description Same flow as Step 5 but for lunch/dinner meal types (combined + deduplicated).
 *   Filters by the user's F+O cuisines. Limits to 30 dishes.
 *   Saves to user_category_preferences with category_type='meal_item'.
 *
 * @calledBy `app/(onboarding)/_layout.tsx` — step-6 route
 */
export default function OnboardingStep6() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<BucketItem[]>([]);
  const [dishIds, setDishIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const cuisineIds = await fetchFOCuisineIds(user.id);
      const dishes = await fetchLunchDinnerDishes(cuisineIds);

      const ids = dishes.map((d) => String(d.id));
      setDishIds(ids);
      setItems(
        dishes.map((d) => ({
          id: String(d.id),
          label: d.name,
        }))
      );
      setLoading(false);
    })();
  }, []);

  const handleComplete = async (buckets: BucketMap) => {
    if (saving) return;
    setSaving(true);
    try {
      await saveMealBuckets(userId, buckets, dishIds);
      await updateOnboardingStep(userId, 6);
      router.push('/(onboarding)/step-7' as never);
    } catch (err) {
      console.error('[STEP6] save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const noData = !loading && items.length === 0;

  return (
    <OnboardingLayout
      step={6}
      title="Lunch & Dinner dishes"
      subtitle="Sort your lunch and dinner dishes. Tap to cycle: Frequently → Occasionally → Never."
      onNext={() => router.push('/(onboarding)/step-7' as never)}
      onBack={() => router.back()}
      nextDisabled={!noData}
      hideFooter={!noData}
    >
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading lunch & dinner dishes…</Text>
        </View>
      ) : noData ? (
        <View style={styles.loader}>
          <Text style={styles.emptyTitle}>No dishes found</Text>
          <Text style={styles.loadingText}>
            No lunch/dinner items for your selected cuisines yet. Tap Next to continue.
          </Text>
        </View>
      ) : (
        <BucketSelector items={items} onComplete={handleComplete} />
      )}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, paddingTop: 60 },
  loadingText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
});
