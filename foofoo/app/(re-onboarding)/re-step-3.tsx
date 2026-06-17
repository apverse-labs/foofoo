import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseRE } from '../../src/services/supabase-re';
import REOnboardingLayout from '../../src/components/re/REOnboardingLayout';
import {
  fetchRESubcohorts, saveRESubcohort, fetchREMainCohorts,
  fetchREHouseholdProfile, requiresMemberStep, saveREOnboardingStep,
} from '../../src/repositories/re-onboarding.repository';
import PersonaCard, { PersonaTag } from '../../src/components/re/PersonaCard';
import AcknowledgementBubble from '../../src/components/re/AcknowledgementBubble';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { RESubcohort } from '../../src/types';

const DEFAULT_COPY = 'A bit more about your situation';

/**
 * @summary RE Onboarding Step 3 — Sub-cohort chip selection (conversational redesign).
 */
export default function REStep3() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [headerCopy, setHeaderCopy] = useState(DEFAULT_COPY);
  const [subcohorts, setSubcohorts] = useState<RESubcohort[]>([]);
  const [selected, setSelected] = useState<RESubcohort | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_3');
    (async () => {
      try {
        const { data: { user } } = await supabaseRE.auth.getUser();
        if (!user) { router.replace('/(auth)/sign-in' as never); return; }
        setUserId(user.id);

        const profile = await fetchREHouseholdProfile(user.id);
        const mcId = profile?.main_cohort_id ?? '';

        const [chips, cohorts] = await Promise.all([
          fetchRESubcohorts(mcId),
          fetchREMainCohorts(),
        ]);
        setSubcohorts(chips);
        const mc = cohorts.find((c) => c.main_cohort_id === mcId);
        if (mc?.subcohort_screen_copy) setHeaderCopy(mc.subcohort_screen_copy);

        if (profile?.sub_cohort_id) {
          const prior = chips.find((c) => c.sub_cohort_id === profile.sub_cohort_id);
          if (prior) setSelected(prior);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.error('RE_STEP3', 'init failed', { error: message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ackMessage = selected
    ? `Got it — ${selected.show_as_chip_text}. Your plan will reflect that.`
    : '';
  const tags: PersonaTag[] = selected
    ? [{ emoji: '✅', label: selected.show_as_chip_text }]
    : [];

  const handleNext = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await saveRESubcohort(userId, selected.sub_cohort_id, selected.maps_to_persona_id);
      await saveREOnboardingStep(userId, 3);
      Logger.info('RE_STEP3', 'subcohort saved', { userId, subcohort: selected.sub_cohort_id });
      await UserJourneyLogger.logOnboardingStep(userId, 3, 'RE Household Detail', {
        'Subcohort': selected.show_as_chip_text,
        'Persona': selected.maps_to_persona_id,
      });

      const nextRoute = requiresMemberStep(selected.sub_cohort_id)
        ? '/(re-onboarding)/re-step-4'
        : '/(re-onboarding)/re-step-5';
      router.replace(nextRoute as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown';
      Logger.error('RE_STEP3', 'save failed', { error: message, userId });
      Alert.alert('Save failed', 'Could not save your selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <REOnboardingLayout step={3} title={headerCopy} subtitle="" onNext={() => {}} nextDisabled>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      </REOnboardingLayout>
    );
  }

  return (
    <REOnboardingLayout
      step={3}
      title={headerCopy}
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

        <AcknowledgementBubble message={ackMessage} visible={selected !== null} />
        <View style={styles.personaWrap}>
          <PersonaCard tags={tags} />
        </View>
      </ScrollView>
    </REOnboardingLayout>
  );
}

const styles = StyleSheet.create({
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingBottom: SPACING.md },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full ?? 999, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  chipText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
  personaWrap: { marginTop: SPACING.lg, paddingBottom: SPACING.xl },
});
