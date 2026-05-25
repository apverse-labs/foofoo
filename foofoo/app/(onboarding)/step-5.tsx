import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import { BucketSelector } from '../../src/components/shared/BucketSelector';
import {
  fetchBreakfastDishes, saveMealBuckets, fetchFOCuisineIds, fetchUserMealBuckets,
} from '../../src/repositories/meal-prefs.repository';
import { updateOnboardingStep, fetchProfile } from '../../src/repositories/profiles.repository';
import { COLORS, SPACING } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { BucketItem, BucketMap } from '../../src/types';

/**
 * @summary Onboarding Step 5 — sort breakfast dishes into F/O/N buckets.
 *
 * @description Filters dishes by the user's Frequently + Occasionally cuisines
 *   from Step 4 (up to 20 results). Saves to user_category_preferences
 *   with category_type='meal_item' and category_id=dish.id::text.
 *
 * @calledBy `app/(onboarding)/_layout.tsx` — step-5 route
 */
export default function OnboardingStep5() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<BucketItem[]>([]);
  const [dishIds, setDishIds] = useState<string[]>([]);
  const [initialBuckets, setInitialBuckets] = useState<BucketMap | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('onboarding_step_5');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);

      const [profile, cuisineIds] = await Promise.all([
        fetchProfile(user.id),
        fetchFOCuisineIds(user.id),
      ]);
      const dishes = await fetchBreakfastDishes(cuisineIds, profile?.food_pref ?? null);

      const ids = dishes.map((d) => String(d.id));
      setDishIds(ids);
      setItems(
        dishes.map((d) => ({
          id: String(d.id),
          label: d.name,
        }))
      );

      // Pre-populate prior selections for back-nav resume (Fix 5)
      const existing = await fetchUserMealBuckets(user.id, ids);
      const hasExisting = existing.F.length + existing.O.length + existing.N.length > 0;
      if (hasExisting) setInitialBuckets(existing);

      setLoading(false);
    })();
  }, []);

  const handleComplete = async (buckets: BucketMap) => {
    if (saving) return;
    setSaving(true);
    try {
      await saveMealBuckets(userId, buckets, dishIds);
      await updateOnboardingStep(userId, 5);
      Logger.info('STEP5', 'onboarding_step_complete', { step: 5, user_id: userId });
      const getDishNames = (ids: string[]) =>
        ids.map(id => items.find(i => i.id === id)?.label ?? id).join(', ') || '(none)';
      await UserJourneyLogger.logOnboardingStep(userId, 5, 'Breakfast Preferences', {
        'Frequently': getDishNames(buckets.F),
        'Occasionally': getDishNames(buckets.O),
        'Never': getDishNames(buckets.N),
        'Unselected (default Occasional)': getDishNames(
          dishIds.filter(id => !buckets.F.includes(id) && !buckets.O.includes(id) && !buckets.N.includes(id))
        ),
      });
      router.replace('/(onboarding)/step-6' as never);
    } catch (err: any) {
      Logger.error('STEP5', 'save failed', { message: err?.message });
      Alert.alert('Save failed', 'Could not save your breakfast preferences. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const noData = !loading && items.length === 0;

  return (
    <OnboardingLayout
      step={5}
      title="Breakfast dishes"
      subtitle="Sort breakfast dishes from your favourite cuisines. Tap to cycle: Frequently → Occasionally → Never."
      onNext={() => router.replace('/(onboarding)/step-6' as never)}
      onBack={() => router.replace('/(onboarding)/step-4' as never)}
      nextDisabled={!noData}
      hideFooter={!noData}
    >
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading breakfast dishes…</Text>
        </View>
      ) : noData ? (
        <View style={styles.loader}>
          <Text style={styles.emptyTitle}>No breakfast dishes found</Text>
          <Text style={styles.loadingText}>
            We don't have breakfast items for your selected cuisines yet. Tap Next to continue.
          </Text>
        </View>
      ) : (
        <BucketSelector items={items} onComplete={handleComplete} initialBuckets={initialBuckets} />
      )}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, paddingTop: 60 },
  loadingText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
});
