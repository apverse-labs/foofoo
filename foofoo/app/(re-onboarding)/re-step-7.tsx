import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseRE } from '../../src/services/supabase-re';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import { saveREDietPrefs } from '../../src/repositories/re-onboarding.repository';
import { fetchUserDietRules } from '../../src/repositories/onboarding.repository';
import PersonaCard, { PersonaTag } from '../../src/components/re/PersonaCard';
import AcknowledgementBubble from '../../src/components/re/AcknowledgementBubble';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { FoodPref } from '../../src/types';

interface DietOption { value: FoodPref; label: string; ack: string; }
const DIET_OPTIONS: DietOption[] = [
  { value: 'veg', label: 'Veg',
    ack: 'Pure veg — I\'ve got a huge range for you. Indian vegetarian is its own universe.' },
  { value: 'non_veg', label: 'Non-Veg',
    ack: 'Good variety — I\'ll mix non-veg days naturally so it feels balanced.' },
  { value: 'egg', label: 'Eggetarian',
    ack: 'Egg-friendly — one of the most versatile ingredients. Great.' },
  { value: 'jain', label: 'Jain',
    ack: 'Jain preferences noted — I\'ll keep root vegetables and underground produce out.' },
  { value: 'vegan', label: 'Vegan',
    ack: 'Plant-based all the way — I\'ll make sure it\'s satisfying, not just healthy.' },
];

const NONVEG_FREQ_OPTIONS = [
  { label: '1-2 times/week', value: 2 },
  { label: '3-4 times/week', value: 4 },
  { label: '5-6 times/week', value: 6 },
  { label: 'Daily',          value: 7 },
];

const PROTEIN_OPTIONS = [
  { label: 'Chicken', value: 'chicken' },
  { label: 'Fish',    value: 'fish' },
  { label: 'Mutton',  value: 'mutton' },
  { label: 'Egg',     value: 'egg' },
  { label: 'Prawn',   value: 'prawn' },
];

/**
 * @summary RE Onboarding Step 7 — "What do you eat?" (diet + proteins combined).
 *
 * @description Saves food_pref to production and nonveg frequency + protein types
 *   to the RE household profile. Allergens are not collected in this flow ([]).
 */
export default function REStep7() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [foodPref, setFoodPref] = useState<FoodPref | null>(null);
  const [nonvegFreq, setNonvegFreq] = useState<number | null>(null);
  const [proteins, setProteins] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_7');
    (async () => {
      try {
        const { data: { user } } = await supabaseRE.auth.getUser();
        if (!user) { router.replace('/(auth)/sign-in' as never); return; }
        setUserId(user.id);
        const rules = await fetchUserDietRules(user.id);
        if (rules?.food_pref) setFoodPref(rules.food_pref);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.error('RE_STEP7', 'init failed', { error: message });
      }
    })();
  }, []);

  const isNonVeg = foodPref === 'non_veg';
  const isValid = foodPref !== null && (!isNonVeg || (nonvegFreq !== null && proteins.length > 0));

  const selectedOption = DIET_OPTIONS.find((o) => o.value === foodPref) ?? null;
  const ackMessage = selectedOption?.ack ?? '';
  const tags: PersonaTag[] = selectedOption
    ? [{ emoji: '🥗', label: selectedOption.label }]
    : [];

  const toggleProtein = (value: string) => {
    setProteins((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleNext = async () => {
    if (!isValid || saving || !foodPref) return;
    setSaving(true);
    try {
      await saveREDietPrefs(
        userId, foodPref, [],
        isNonVeg ? nonvegFreq : null,
        isNonVeg ? proteins : [],
      );
      Logger.info('RE_STEP7', 'diet prefs saved', { userId, foodPref });
      await UserJourneyLogger.logOnboardingStep(userId, 7, 'RE Diet Preference', {
        'Diet': foodPref,
        'NonVeg freq': isNonVeg ? String(nonvegFreq) : 'n/a',
      });
      router.replace('/(re-onboarding)/re-step-8-reveal' as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown';
      Logger.error('RE_STEP7', 'save failed', { error: message, userId });
      Alert.alert('Save failed', 'Could not save diet preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={7}
      title="Almost there — just your diet."
      subtitle="What do you eat?"
      onNext={handleNext}
      onBack={() => router.replace('/(re-onboarding)/re-step-6' as never)}
      nextDisabled={!isValid || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {DIET_OPTIONS.map((opt) => {
            const isSel = foodPref === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.chip, isSel && styles.chipSelected]}
                onPress={() => setFoodPref(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSel }}
              >
                <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {isNonVeg && (
          <View style={styles.nonvegSection}>
            <Text style={styles.sectionLabel}>How often do you eat non-veg?</Text>
            <View style={styles.chipRow}>
              {NONVEG_FREQ_OPTIONS.map((f) => {
                const isSel = nonvegFreq === f.value;
                return (
                  <Pressable key={f.value} style={[styles.chip, isSel && styles.chipSelected]} onPress={() => setNonvegFreq(f.value)}>
                    <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Which proteins do you eat?</Text>
            <View style={styles.chipRow}>
              {PROTEIN_OPTIONS.map((p) => {
                const isSel = proteins.includes(p.value);
                return (
                  <Pressable key={p.value} style={[styles.chip, isSel && styles.chipSelected]} onPress={() => toggleProtein(p.value)}>
                    <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <AcknowledgementBubble message={ackMessage} visible={foodPref !== null} />
        <View style={styles.personaWrap}>
          <PersonaCard tags={tags} />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full ?? 999, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  chipText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
  nonvegSection: { gap: SPACING.sm, marginTop: SPACING.md },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md },
  personaWrap: { marginTop: SPACING.lg, paddingBottom: SPACING.xl },
});
