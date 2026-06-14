import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseRE } from '../../src/services/supabase-re';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import {
  fetchREMainCohorts, saveREMainCohort, fetchREHouseholdProfile,
} from '../../src/repositories/re-onboarding.repository';
import PersonaCard, { PersonaTag } from '../../src/components/re/PersonaCard';
import AcknowledgementBubble from '../../src/components/re/AcknowledgementBubble';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { REMainCohort } from '../../src/types';

const COHORT_EMOJI: Record<string, string> = {
  MC1: '🧍', MC2: '👫', MC3: '👨‍👩‍👧', MC4: '💛', MC5: '🏠',
};

const COHORT_ACK: Record<string, string> = {
  MC1: 'Just you — I\'ll keep things practical and zero-waste. No 5-litre dal batches. 😄',
  MC2: 'Two people to feed — I\'ll balance both tastes and scale portions right.',
  MC3: 'Family meals it is — everyone gets something good. 👨‍👩‍👧',
  MC4: 'Special care in the household — I\'ll be thoughtful about everyone\'s needs.',
  MC5: 'Limited kitchen, shared space — I know how to work with constraints.',
};

/**
 * @summary RE Onboarding Step 2 — "Who are you feeding?" (conversational redesign).
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
      try {
        const { data: { user } } = await supabaseRE.auth.getUser();
        if (!user) { router.replace('/(auth)/sign-in' as never); return; }
        setUserId(user.id);
        const [cohortsData, profile] = await Promise.all([
          fetchREMainCohorts(),
          fetchREHouseholdProfile(user.id),
        ]);
        setCohorts(cohortsData);
        if (profile?.main_cohort_id) setSelected(profile.main_cohort_id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.error('RE_STEP2', 'init failed', { error: message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCohort = cohorts.find((c) => c.main_cohort_id === selected) ?? null;
  const ackMessage = selected ? (COHORT_ACK[selected] ?? '') : '';
  const tags: PersonaTag[] = selectedCohort
    ? [{ emoji: COHORT_EMOJI[selectedCohort.main_cohort_id] ?? '👥', label: selectedCohort.user_understands_as }]
    : [];

  const handleNext = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await saveREMainCohort(userId, selected);
      const label = selectedCohort?.main_cohort_label ?? selected;
      Logger.info('RE_STEP2', 'main cohort saved', { userId, cohort: selected });
      await UserJourneyLogger.logOnboardingStep(userId, 2, 'RE Household Type', {
        'Selected cohort': label,
      });
      router.replace('/(re-onboarding)/re-step-3' as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown';
      Logger.error('RE_STEP2', 'save failed', { error: message, userId });
      Alert.alert('Save failed', 'Could not save your household type. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <OnboardingLayout step={2} title="Who are you feeding?" subtitle="" onNext={() => {}} nextDisabled>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      step={2}
      title="Who are you feeding?"
      subtitle="Tell me about your home."
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
                <Text style={styles.cardEmoji}>{COHORT_EMOJI[c.main_cohort_id] ?? '👥'}</Text>
                <View style={styles.cardBody}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {c.user_understands_as}
                  </Text>
                  <Text style={styles.cardDesc}>{c.main_cohort_label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <AcknowledgementBubble message={ackMessage} visible={selected !== null} />
        <View style={styles.personaWrap}>
          <PersonaCard tags={tags} />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  cardList: { gap: SPACING.md, paddingBottom: SPACING.md },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border, padding: SPACING.lg,
  },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}0F` },
  cardEmoji: { fontSize: 30 },
  cardBody: { flex: 1, gap: SPACING.xs },
  checkmark: {
    position: 'absolute', top: 0, right: 0,
    fontSize: 14, color: COLORS.primary, fontWeight: '700',
  },
  cardLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardLabelSelected: { color: COLORS.primary },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  personaWrap: { marginTop: SPACING.lg, paddingBottom: SPACING.xl },
});
