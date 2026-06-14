import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseRE } from '../../src/services/supabase-re';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import { saveREHealthOverlay } from '../../src/repositories/re-onboarding.repository';
import PersonaCard, { PersonaTag } from '../../src/components/re/PersonaCard';
import AcknowledgementBubble from '../../src/components/re/AcknowledgementBubble';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { HealthOverlayCode, HealthScope } from '../../src/types';

interface HealthOption { value: HealthOverlayCode; emoji: string; label: string; }

const HEALTH_OPTIONS: HealthOption[] = [
  { value: 'weight_loss',          emoji: '⚖️', label: 'Weight management' },
  { value: 'high_protein_fitness', emoji: '💪', label: 'High protein / fitness' },
  { value: 'veg_protein_seeker',   emoji: '🌱', label: 'Vegetarian protein' },
  { value: 'diabetic_management',  emoji: '🩺', label: 'Diabetic / low GI' },
  { value: 'hypertension_heart',   emoji: '❤️', label: 'Heart / BP conscious' },
  { value: 'fasting_ritual',       emoji: '🙏', label: 'Fasting / ritual diet' },
  { value: 'pregnancy_support',    emoji: '🤰', label: 'Pregnancy support' },
  { value: 'postpartum_lactation', emoji: '👶', label: 'Postpartum / lactation' },
];

/**
 * @summary RE Onboarding Step 6 — "Any food goals right now?" (skippable).
 *
 * @description Single-select health overlay; saves to
 *   re_user_household_profiles.health_overlay_code (scope null). Skippable.
 */
export default function REStep6() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState<HealthOverlayCode | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_6');
    (async () => {
      try {
        const { data: { user } } = await supabaseRE.auth.getUser();
        if (!user) { router.replace('/(auth)/sign-in' as never); return; }
        setUserId(user.id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.error('RE_STEP6', 'init failed', { error: message });
      }
    })();
  }, []);

  const selectedOption = HEALTH_OPTIONS.find((o) => o.value === selected) ?? null;
  const ackMessage = selectedOption
    ? `I'll keep ${selectedOption.label} in mind. It'll shape your meal suggestions quietly, without making everything feel like a diet plan.`
    : '';
  const tags: PersonaTag[] = selectedOption
    ? [{ emoji: selectedOption.emoji, label: selectedOption.label }]
    : [];

  const handleSave = async (overlay: HealthOverlayCode | null) => {
    if (saving) return;
    setSaving(true);
    try {
      await saveREHealthOverlay(userId, overlay, null);
      Logger.info('RE_STEP6', 'health overlay saved', { userId, overlay });
      await UserJourneyLogger.logOnboardingStep(userId, 6, 'RE Health Overlay', {
        'Overlay': overlay ?? 'none',
      });
      router.replace('/(re-onboarding)/re-step-7' as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown';
      Logger.error('RE_STEP6', 'save failed', { error: message, userId });
      Alert.alert('Save failed', 'Could not save health preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={6}
      title="Last question — promise."
      subtitle="This is optional but helps a lot."
      onNext={() => handleSave(selected)}
      onBack={() => router.replace('/(re-onboarding)/re-step-5' as never)}
      nextDisabled={saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.chipGrid}>
          {HEALTH_OPTIONS.map((opt) => {
            const isSel = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.chip, isSel && styles.chipSelected]}
                onPress={() => setSelected(isSel ? null : opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSel }}
              >
                <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <AcknowledgementBubble message={ackMessage} visible={selected !== null} />
        {selected !== null && (
          <View style={styles.personaWrap}>
            <PersonaCard tags={tags} />
          </View>
        )}

        <Pressable style={styles.skipButton} onPress={() => handleSave(null)} disabled={saving}>
          <Text style={styles.skipText}>No goals right now →</Text>
        </Pressable>
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full ?? 999, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
  personaWrap: { marginTop: SPACING.lg },
  skipButton: { alignItems: 'center', paddingVertical: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.xl },
  skipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
});
