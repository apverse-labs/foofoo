import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import { saveREDietPrefs } from '../../src/repositories/re-onboarding.repository';
import { fetchUserDietRules } from '../../src/repositories/onboarding.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { FoodPref } from '../../src/types';

interface DietOption { value: FoodPref; emoji: string; label: string; description: string; }
const DIET_OPTIONS: DietOption[] = [
  { value: 'veg',     emoji: '🌱', label: 'Veg',    description: 'No meat, poultry, or seafood' },
  { value: 'non_veg', emoji: '🍗', label: 'Non-Veg', description: 'Includes meat, poultry, seafood' },
  { value: 'egg',     emoji: '🥚', label: 'Egg',     description: 'Vegetarian + eggs' },
  { value: 'vegan',   emoji: '🌿', label: 'Vegan',   description: 'No animal products at all' },
  { value: 'jain',    emoji: '✨', label: 'Jain',    description: 'No root vegetables, no onion/garlic' },
];

const NONVEG_FREQ_OPTIONS = [
  { label: '1–2 times/week', value: 1 },
  { label: '3–4 times/week', value: 3 },
  { label: 'Daily',          value: 7 },
];

const PROTEIN_OPTIONS = [
  { label: 'Chicken', value: 'chicken' },
  { label: 'Mutton',  value: 'mutton' },
  { label: 'Fish',    value: 'fish' },
  { label: 'Prawn / Seafood', value: 'prawn_seafood' },
  { label: 'Egg',     value: 'egg' },
];

/**
 * @summary RE Onboarding Step 5 — Diet preference + non-veg guardrails.
 *
 * @description Saves food_pref to production (user_diet_rules + profiles) and
 *   nonveg_meals_per_week + preferred_protein_types to RE household profile.
 *   Non-veg frequency and protein chips shown only when food_pref = 'non_veg'.
 */
export default function REStep5() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [foodPref, setFoodPref] = useState<FoodPref | null>(null);
  const [nonvegFreq, setNonvegFreq] = useState<number | null>(null);
  const [proteins, setProteins] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_5');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);
      const rules = await fetchUserDietRules(user.id);
      if (rules?.food_pref) setFoodPref(rules.food_pref);
    })();
  }, []);

  const isNonVeg = foodPref === 'non_veg';
  const isValid = foodPref !== null && (!isNonVeg || (nonvegFreq !== null && proteins.length > 0));

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
      Logger.info('RE_STEP5', 'diet prefs saved', { userId, foodPref });
      await UserJourneyLogger.logOnboardingStep(userId, 5, 'RE Diet Preference', {
        'Diet': foodPref,
        'NonVeg freq': isNonVeg ? String(nonvegFreq) : 'n/a',
      });
      router.replace('/(re-onboarding)/re-step-6' as never);
    } catch {
      Alert.alert('Save failed', 'Could not save diet preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={5}
      title="What does your household eat?"
      subtitle="This is the core filter for your meal plan."
      onNext={handleNext}
      onBack={() => router.replace('/(re-onboarding)/re-step-4' as never)}
      nextDisabled={!isValid || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {DIET_OPTIONS.map((opt) => {
            const isSelected = foodPref === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setFoodPref(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                <Text style={styles.emoji}>{opt.emoji}</Text>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>{opt.label}</Text>
                <Text style={styles.cardDesc}>{opt.description}</Text>
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
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.lg },
  card: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border, padding: SPACING.md,
    alignItems: 'center', gap: SPACING.xs, minHeight: 110, justifyContent: 'center',
  },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}0F` },
  checkmark: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    fontSize: 14, color: COLORS.primary, fontWeight: '700',
  },
  emoji: { fontSize: 32 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  cardLabelSelected: { color: COLORS.primary },
  cardDesc: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 15 },
  nonvegSection: { gap: SPACING.sm, marginBottom: SPACING.xl },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full ?? 999, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  chipText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
});
