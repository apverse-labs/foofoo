import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import {
  fetchREMainCohorts, saveREMainCohort, fetchREHouseholdProfile,
} from '../../src/repositories/re-onboarding.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { REMainCohort } from '../../src/types';

/**
 * @summary RE Onboarding Step 2 — Main cohort selection (5 household cards).
 *
 * @description Card labels and copy are loaded from re_main_cohorts — not hardcoded.
 *   Selection written to re_user_household_profiles.main_cohort_id.
 */
export default function REStep2() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [cohorts, setCohorts] = useState<REMainCohort[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_2');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);

      const [cohortsData, profile] = await Promise.all([
        fetchREMainCohorts(),
        fetchREHouseholdProfile(user.id),
      ]);
      setCohorts(cohortsData);
      if (profile?.main_cohort_id) setSelected(profile.main_cohort_id);
      setLoading(false);
    })();
  }, []);

  const handleNext = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await saveREMainCohort(userId, selected);
      const label = cohorts.find((c) => c.main_cohort_id === selected)?.main_cohort_label ?? selected;
      Logger.info('RE_STEP2', 'main cohort saved', { userId, cohort: selected });
      await UserJourneyLogger.logOnboardingStep(userId, 2, 'RE Household Type', {
        'Selected cohort': label,
      });
      router.replace('/(re-onboarding)/re-step-3' as never);
    } catch {
      Alert.alert('Save failed', 'Could not save your household type. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <OnboardingLayout step={2} title="What kind of household are you?" subtitle="" onNext={() => {}} nextDisabled>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      step={2}
      title="What kind of household are you?"
      subtitle="Choose the one that best describes who eats together every day."
      onNext={handleNext}
      onBack={() => router.replace('/(re-onboarding)/re-step-1' as never)}
      nextDisabled={!selected || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.cardList}>
          {cohorts.map((c) => {
            const isSelected = selected === c.main_cohort_id;
            return (
              <Pressable
                key={c.main_cohort_id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(c.main_cohort_id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                  {c.main_cohort_label}
                </Text>
                <Text style={styles.cardDesc}>{c.user_understands_as}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  cardList: { gap: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border,
    padding: SPACING.lg, gap: SPACING.xs,
  },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}0F` },
  checkmark: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    fontSize: 14, color: COLORS.primary, fontWeight: '700',
  },
  cardLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardLabelSelected: { color: COLORS.primary },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
