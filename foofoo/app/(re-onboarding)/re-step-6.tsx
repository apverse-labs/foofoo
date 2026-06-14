import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import {
  saveRECookDependency, fetchREHouseholdProfile,
} from '../../src/repositories/re-onboarding.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { CookDependency } from '../../src/types';

interface CookOption {
  value: CookDependency;
  emoji: string;
  label: string;
  description: string;
}

const COOK_OPTIONS: CookOption[] = [
  { value: 'self_cook',           emoji: '🧑‍🍳', label: 'I cook myself',                    description: 'You plan and cook — full flexibility' },
  { value: 'skilled_cook',        emoji: '👨‍🍳', label: 'Skilled cook / knows recipes',       description: 'Cook knows dishes, needs a list' },
  { value: 'cook_needs_instruction', emoji: '📋', label: 'Cook needs step-by-step instructions', description: 'Simpler dishes, detailed guidance' },
  { value: 'maid_simple',         emoji: '🧹', label: 'Maid / helper — simple dishes only',  description: 'Basic, repeat-friendly recipes' },
  { value: 'tiffin_pg_no_kitchen', emoji: '🥡', label: 'Tiffin / PG / hostel',               description: 'No kitchen — planning meals to order' },
  { value: 'delivery_heavy',      emoji: '🛵', label: 'Mostly delivery + occasional home',   description: 'Mixed home and ordered meals' },
];

/**
 * @summary RE Onboarding Step 6 — Cooking system / cook dependency.
 *
 * @description Selection written to re_user_household_profiles.cook_dependency.
 *   Influences meal complexity, instruction depth, and class pool in BUILD-04.
 */
export default function REStep6() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState<CookDependency | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_6');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);
      const profile = await fetchREHouseholdProfile(user.id);
      if (profile?.cook_dependency) setSelected(profile.cook_dependency);
    })();
  }, []);

  const handleNext = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await saveRECookDependency(userId, selected);
      Logger.info('RE_STEP6', 'cook dependency saved', { userId, cookDependency: selected });
      await UserJourneyLogger.logOnboardingStep(userId, 6, 'RE Cooking System', {
        'Cook type': selected,
      });
      router.replace('/(re-onboarding)/re-step-7' as never);
    } catch {
      Alert.alert('Save failed', 'Could not save your cooking setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={6}
      title="How does cooking work in your home?"
      subtitle="This shapes how detailed and flexible your meal plan will be."
      onNext={handleNext}
      onBack={() => router.replace('/(re-onboarding)/re-step-5' as never)}
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
                  <View style={styles.cardText}>
                    <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.cardDesc}>{opt.description}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  cardList: { gap: SPACING.md, paddingBottom: SPACING.xl },
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
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardLabelSelected: { color: COLORS.primary },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
});
