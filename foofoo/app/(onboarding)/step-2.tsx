import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import { saveFoodPref, fetchUserDietRules } from '../../src/repositories/onboarding.repository';
import { updateOnboardingStep } from '../../src/repositories/profiles.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import type { FoodPref } from '../../src/types';

interface PrefOption {
  value: FoodPref;
  emoji: string;
  label: string;
  description: string;
}

const OPTIONS: PrefOption[] = [
  { value: 'veg',     emoji: '🌱', label: 'Veg',     description: 'No meat, poultry, or seafood' },
  { value: 'non_veg', emoji: '🍗', label: 'Non-Veg',  description: 'Includes meat, poultry, seafood' },
  { value: 'egg',     emoji: '🥚', label: 'Egg',      description: 'Vegetarian + eggs' },
  { value: 'vegan',   emoji: '🌿', label: 'Vegan',    description: 'No animal products at all' },
  { value: 'jain',    emoji: '✨', label: 'Jain',     description: 'No root vegetables, no onion/garlic' },
];

/**
 * @summary Onboarding Step 2 — single-select food preference (Veg/Non-Veg/Egg/Vegan/Jain).
 *
 * @description Saves to both user_diet_rules.food_pref and profiles.food_pref.
 *   Pre-fills from existing diet rules on mount (resume support).
 *   Displays 5 large icon cards in a 2-column grid.
 *
 * @calledBy `app/(onboarding)/_layout.tsx` — step-2 route
 */
export default function OnboardingStep2() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState<FoodPref | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);
      const rules = await fetchUserDietRules(user.id);
      if (rules?.food_pref) setSelected(rules.food_pref as FoodPref);
    })();
  }, []);

  const handleNext = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await saveFoodPref(userId, selected);
      await updateOnboardingStep(userId, 2);
      const label = OPTIONS.find(o => o.value === selected)?.label ?? selected;
      await UserJourneyLogger.logOnboardingStep(userId, 2, 'Food Preference', {
        'Selected preference': label,
        'Impact': selected === 'veg' ? 'Only veg, vegan, and jain dishes — non-veg permanently excluded'
          : selected === 'vegan' ? 'Only vegan dishes — all animal products excluded'
          : selected === 'jain' ? 'Only veg and jain dishes — root vegetables, onion, garlic excluded'
          : selected === 'egg' ? 'Veg + egg dishes — meat and poultry excluded'
          : 'All dishes including meat, poultry, and seafood',
      });
      router.replace('/(onboarding)/step-3' as never);
    } catch (err: any) {
      Logger.error('STEP2', 'save failed', { message: err?.message });
      Alert.alert('Save failed', 'Could not save your food preference. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={2}
      title="What's your food preference?"
      subtitle="This is the core filter for your meal plan. You can change it anytime."
      onNext={handleNext}
      onBack={() => router.replace('/(onboarding)/step-1' as never)}
      nextDisabled={!selected || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <View style={styles.grid}>
        {OPTIONS.map((opt) => {
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
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                {opt.label}
              </Text>
              <Text style={styles.cardDesc}>{opt.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  card: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: 120,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}0F`,
  },
  checkmark: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  emoji: { fontSize: 36 },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  cardLabelSelected: { color: COLORS.primary },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
