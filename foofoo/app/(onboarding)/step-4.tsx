import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import { BucketSelector } from '../../src/components/shared/BucketSelector';
import {
  fetchCuisines, saveCuisineBuckets, fetchUserCuisineBuckets,
} from '../../src/repositories/onboarding.repository';
import { updateOnboardingStep } from '../../src/repositories/profiles.repository';
import { COLORS, SPACING } from '../../src/config/constants';
import type { BucketItem, BucketMap } from '../../src/types';

/**
 * @summary Onboarding Step 4 — sort cuisines into Frequently / Occasionally / Never buckets.
 *
 * @description Loads active user-facing cuisines from cuisines_master ordered by
 *   tier + display_order. Pre-populates from existing preferences on resume.
 *   Saves to user_category_preferences (category_type='cuisine', category_id=cuisine.code).
 *
 * @calledBy `app/(onboarding)/_layout.tsx` — step-4 route
 */
export default function OnboardingStep4() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<BucketItem[]>([]);
  const [initial, setInitial] = useState<BucketMap | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);

      const [cuisines, existing] = await Promise.all([
        fetchCuisines(),
        fetchUserCuisineBuckets(user.id),
      ]);

      setItems(
        cuisines.map((c) => ({
          id: c.code,
          label: c.display_name || c.name,
          emoji: undefined,
        }))
      );

      const hasExisting =
        existing.F.length + existing.O.length + existing.N.length > 0;
      if (hasExisting) setInitial(existing);
      setLoading(false);
    })();
  }, []);

  const handleComplete = async (buckets: BucketMap) => {
    if (saving) return;
    setSaving(true);
    try {
      await saveCuisineBuckets(userId, buckets);
      await updateOnboardingStep(userId, 4);
      router.replace('/(onboarding)/step-5' as never);
    } catch (err) {
      console.error('[STEP4] save failed:', err);
      Alert.alert('Save failed', 'Could not save your cuisine preferences. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={4}
      title="Cuisines you love"
      subtitle="Sort every cuisine into a bucket. Tap a chip to cycle it through Frequently → Occasionally → Never → back."
      onNext={() => {}}
      onBack={() => router.replace('/(onboarding)/step-3' as never)}
      hideFooter
    >
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading cuisines…</Text>
        </View>
      ) : (
        <BucketSelector
          items={items}
          onComplete={handleComplete}
          initialBuckets={initial}
        />
      )}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, paddingTop: 60 },
  loadingText: { fontSize: 15, color: COLORS.textSecondary },
});
