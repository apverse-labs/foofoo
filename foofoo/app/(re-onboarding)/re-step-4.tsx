import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseRE } from '../../src/services/supabase-re';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import {
  fetchREHouseholdProfile, saveREHouseholdMembers,
} from '../../src/repositories/re-onboarding.repository';
import PersonaCard, { PersonaTag } from '../../src/components/re/PersonaCard';
import AcknowledgementBubble from '../../src/components/re/AcknowledgementBubble';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { MemberSegment } from '../../src/types';

interface AgeBandOption { label: string; value: string; }

interface MemberConfig {
  segment: MemberSegment;
  label: string;
  ageBands: AgeBandOption[];
}

/** Static member config derived from ONBOARDING_FIELD_MAPPING.md RE-4 spec. */
const MEMBER_CONFIG_BY_SUBCOHORT: Record<string, MemberConfig> = {
  SC2D: { segment: 'pregnant_member', label: 'Pregnant member', ageBands: [] },
  SC2E: { segment: 'baby_6_18m',  label: 'Infant / baby', ageBands: [{ label: '0–6 months', value: '0-6m' }, { label: '6–18 months', value: '6-18m' }] },
  SC2F: { segment: 'baby_6_18m',  label: 'Baby (6–18 months)', ageBands: [{ label: '6–18 months', value: '6-18m' }] },
  SC3A: { segment: 'toddler',     label: 'Toddler', ageBands: [{ label: '2–3 years', value: '2-3' }, { label: '3–5 years', value: '3-5' }] },
  SC3B: { segment: 'school_child', label: 'School-going child', ageBands: [{ label: '6–9 years', value: '6-9' }, { label: '10–12 years', value: '10-12' }] },
  SC3C: { segment: 'teen_high_appetite', label: 'Teen', ageBands: [{ label: '13–16 years', value: '13-16' }, { label: '16–18 years', value: '16-18' }] },
  SC3D: { segment: 'picky_child', label: 'Picky child', ageBands: [{ label: '4–8 years', value: '4-8' }, { label: '8–12 years', value: '8-12' }] },
  SC4A: { segment: 'elderly_member', label: 'Elderly member', ageBands: [{ label: '60–70 years', value: '60-70' }, { label: '70+ years', value: '70+' }] },
  SC4B: { segment: 'elderly_member', label: 'Elderly couple', ageBands: [{ label: '60–70 years', value: '60-70' }, { label: '70+ years', value: '70+' }] },
  SC4C: { segment: 'recovery_member', label: 'Recovery member', ageBands: [] },
  SC4D: { segment: 'diabetic_member', label: 'Diabetic member', ageBands: [] },
  SC4E: { segment: 'hypertension_heart_member', label: 'Hypertension / heart member', ageBands: [] },
  SC4F: { segment: 'elderly_member', label: 'Composite elderly household', ageBands: [{ label: '60–70 years', value: '60-70' }, { label: '70+ years', value: '70+' }] },
};

/**
 * @summary RE Onboarding Step 4 — Household member details (conditional).
 *
 * @description Shown only for sub-cohorts that require member-specific add-ons.
 *   If no config found for the selected sub-cohort, redirects to RE-step-5.
 */
export default function REStep4() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [memberConfig, setMemberConfig] = useState<MemberConfig | null>(null);
  const [selectedAgeBand, setSelectedAgeBand] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_4');
    (async () => {
      try {
        const { data: { user } } = await supabaseRE.auth.getUser();
        if (!user) { router.replace('/(auth)/sign-in' as never); return; }
        setUserId(user.id);

        const profile = await fetchREHouseholdProfile(user.id);
        const subCohortId = profile?.sub_cohort_id ?? '';
        const config = MEMBER_CONFIG_BY_SUBCOHORT[subCohortId] ?? null;

        if (!config) {
          router.replace('/(re-onboarding)/re-step-5' as never);
          return;
        }
        setMemberConfig(config);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.error('RE_STEP4', 'init failed', { error: message });
      }
    })();
  }, []);

  const needsAgeBand = (memberConfig?.ageBands?.length ?? 0) > 0;
  const isValid = !needsAgeBand || selectedAgeBand !== null;

  const ackMessage = isValid && memberConfig
    ? 'Got it — I\'ll make sure their needs are covered, without changing your family\'s main meals.'
    : '';
  const tags: PersonaTag[] = isValid && memberConfig
    ? [{ emoji: '🍽️', label: memberConfig.label }]
    : [];

  const handleNext = async () => {
    if (!isValid || saving || !memberConfig) return;
    setSaving(true);
    try {
      await saveREHouseholdMembers(userId, [{
        member_segment: memberConfig.segment,
        age_band: selectedAgeBand,
      }]);
      Logger.info('RE_STEP4', 'household member saved', { userId, segment: memberConfig.segment });
      await UserJourneyLogger.logOnboardingStep(userId, 4, 'RE Household Members', {
        'Member type': memberConfig.label,
        'Age band': selectedAgeBand ?? 'n/a',
      });
      router.replace('/(re-onboarding)/re-step-5' as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown';
      Logger.error('RE_STEP4', 'save failed', { error: message, userId });
      Alert.alert('Save failed', 'Could not save household member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!memberConfig) return null;

  return (
    <OnboardingLayout
      step={4}
      title="I noticed you mentioned someone special."
      subtitle="This helps me add the right side dishes for them."
      onNext={handleNext}
      onBack={() => router.replace('/(re-onboarding)/re-step-3' as never)}
      nextDisabled={!isValid || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.segmentBadge}>
            <Text style={styles.segmentText}>{memberConfig.label}</Text>
          </View>

          {needsAgeBand && (
            <>
              <Text style={styles.label}>Age band</Text>
              <View style={styles.bandRow}>
                {memberConfig.ageBands.map((band) => {
                  const isSel = selectedAgeBand === band.value;
                  return (
                    <Pressable
                      key={band.value}
                      style={[styles.bandChip, isSel && styles.bandChipSelected]}
                      onPress={() => setSelectedAgeBand(band.value)}
                    >
                      <Text style={[styles.bandText, isSel && styles.bandTextSelected]}>
                        {band.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <AcknowledgementBubble message={ackMessage} visible={isValid} />
        <View style={styles.personaWrap}>
          <PersonaCard tags={tags} />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.md, paddingBottom: SPACING.xl },
  segmentBadge: {
    alignSelf: 'flex-start', backgroundColor: `${COLORS.primary}15`,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.sm },
  bandRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  bandChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full ?? 999, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  bandChipSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  bandText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  bandTextSelected: { color: COLORS.primary, fontWeight: '700' },
  personaWrap: { marginTop: SPACING.lg, paddingBottom: SPACING.xl },
});
