import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseRE } from '../../src/services/supabase-re';
import REOnboardingLayout from '../../src/components/re/REOnboardingLayout';
import {
  saveRECookDependency, fetchREHouseholdProfile, saveREOnboardingStep,
} from '../../src/repositories/re-onboarding.repository';
import PersonaCard, { PersonaTag } from '../../src/components/re/PersonaCard';
import AcknowledgementBubble from '../../src/components/re/AcknowledgementBubble';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { CookDependency } from '../../src/types';

interface CookOption { value: CookDependency; emoji: string; label: string; ack: string; }

const COOK_OPTIONS: CookOption[] = [
  { value: 'self_cook', emoji: '🍳', label: 'I cook myself',
    ack: 'Home cook — the best kind. I\'ll give you variety without complexity.' },
  { value: 'skilled_cook', emoji: '👨‍🍳', label: 'We have a skilled cook',
    ack: 'Lucky you! I\'ll suggest things worth the cook\'s talent.' },
  { value: 'cook_needs_instruction', emoji: '📋', label: 'Cook who needs guidance',
    ack: 'Got it — I\'ll keep recipes straightforward and predictable.' },
  { value: 'maid_simple', emoji: '🧹', label: 'Maid / helper (simple dishes only)',
    ack: 'Simple and reliable — I know what works.' },
  { value: 'tiffin_pg_no_kitchen', emoji: '📦', label: 'Tiffin service / no kitchen',
    ack: 'No kitchen? No problem. I\'ll plan around what you can get.' },
  { value: 'delivery_heavy', emoji: '🛵', label: 'Mostly delivery',
    ack: 'Delivery-friendly plan coming up — I\'ll mix healthy with convenient.' },
];

/**
 * @summary RE Onboarding Step 5 — "How does cooking happen at home?" (conversational redesign).
 *
 * @description Selection written to re_user_household_profiles.cook_dependency.
 */
export default function REStep5() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState<CookDependency | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_5');
    (async () => {
      try {
        const { data: { user } } = await supabaseRE.auth.getUser();
        if (!user) { router.replace('/(auth)/sign-in' as never); return; }
        setUserId(user.id);
        const profile = await fetchREHouseholdProfile(user.id);
        if (profile?.cook_dependency) setSelected(profile.cook_dependency);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.error('RE_STEP5', 'init failed', { error: message });
      }
    })();
  }, []);

  const selectedOption = COOK_OPTIONS.find((o) => o.value === selected) ?? null;
  const ackMessage = selectedOption?.ack ?? '';
  const tags: PersonaTag[] = selectedOption
    ? [{ emoji: selectedOption.emoji, label: selectedOption.label }]
    : [];

  const handleNext = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await saveRECookDependency(userId, selected);
      await saveREOnboardingStep(userId, 5);
      Logger.info('RE_STEP5', 'cook dependency saved', { userId, cookDependency: selected });
      await UserJourneyLogger.logOnboardingStep(userId, 5, 'RE Cooking System', {
        'Cook type': selected,
      });
      router.replace('/(re-onboarding)/re-step-6' as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown';
      Logger.error('RE_STEP5', 'save failed', { error: message, userId });
      Alert.alert('Save failed', 'Could not save your cooking setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <REOnboardingLayout
      step={5}
      title="How does cooking happen at home?"
      subtitle="Tell me about your kitchen setup."
      onNext={handleNext}
      onBack={() => router.replace('/(re-onboarding)/re-step-4' as never)}
      nextDisabled={!selected || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.cardList}>
          {COOK_OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                <View style={styles.cardContent}>
                  <Text style={styles.emoji}>{opt.emoji}</Text>
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {opt.label}
                  </Text>
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
    </REOnboardingLayout>
  );
}

const styles = StyleSheet.create({
  cardList: { gap: SPACING.md, paddingBottom: SPACING.md },
  card: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border, padding: SPACING.md,
  },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}0F` },
  checkmark: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    fontSize: 14, color: COLORS.primary, fontWeight: '700',
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  emoji: { fontSize: 28 },
  cardLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardLabelSelected: { color: COLORS.primary },
  personaWrap: { marginTop: SPACING.lg, paddingBottom: SPACING.xl },
});
