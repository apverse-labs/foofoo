import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import {
  fetchRESubcohorts, saveRESubcohort,
  fetchREHouseholdProfile, requiresMemberStep,
} from '../../src/repositories/re-onboarding.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { RESubcohort } from '../../src/types';

/**
 * @summary RE Onboarding Step 3 — Sub-cohort chip selection.
 *
 * @description Chips loaded from re_subcohorts filtered by the main_cohort_id set
 *   in RE-step-2. The persona_id is derived from maps_to_persona_id and stored alongside.
 *   Navigation after save is conditional: sub-cohorts that require member capture
 *   go to RE-step-4; all others skip to RE-step-5.
 */
export default function REStep3() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [mainCohortId, setMainCohortId] = useState('');
  const [subcohortScreenCopy, setSubcohortScreenCopy] = useState('Which best describes your household?');
  const [subcohorts, setSubcohorts] = useState<RESubcohort[]>([]);
  const [selected, setSelected] = useState<RESubcohort | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_3');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);

      const profile = await fetchREHouseholdProfile(user.id);
      const mcId = profile?.main_cohort_id ?? '';
      setMainCohortId(mcId);

      const chips = await fetchRESubcohorts(mcId);
      setSubcohorts(chips);

      if (profile?.sub_cohort_id) {
        const prior = chips.find((c) => c.sub_cohort_id === profile.sub_cohort_id);
        if (prior) setSelected(prior);
      }
      setLoading(false);
    })();
  }, []);

  const handleNext = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await saveRESubcohort(userId, selected.sub_cohort_id, selected.maps_to_persona_id);
      Logger.info('RE_STEP3', 'subcohort saved', { userId, subcohort: selected.sub_cohort_id });
      await UserJourneyLogger.logOnboardingStep(userId, 3, 'RE Household Detail', {
        'Subcohort': selected.show_as_chip_text,
        'Persona': selected.maps_to_persona_id,
      });

      const nextRoute = requiresMemberStep(selected.sub_cohort_id)
        ? '/(re-onboarding)/re-step-4'
        : '/(re-onboarding)/re-step-5';
      router.replace(nextRoute as never);
    } catch {
      Alert.alert('Save failed', 'Could not save your selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <OnboardingLayout step={3} title={subcohortScreenCopy} subtitle="" onNext={() => {}} nextDisabled>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      step={3}
      title={subcohortScreenCopy}
      subtitle="Pick the one that fits most closely right now."
      onNext={handleNext}
      onBack={() => router.replace('/(re-onboarding)/re-step-2' as never)}
      nextDisabled={!selected || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.chipGrid}>
          {subcohorts.map((sc) => {
            const isSelected = selected?.sub_cohort_id === sc.sub_cohort_id;
            return (
              <Pressable
                key={sc.sub_cohort_id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setSelected(sc)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {sc.show_as_chip_text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingBottom: SPACING.xl },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full ?? 999, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  chipText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
});
