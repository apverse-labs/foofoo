import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import { saveREHealthOverlay } from '../../src/repositories/re-onboarding.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { HealthOverlayCode, HealthScope } from '../../src/types';

interface HealthOption {
  value: HealthOverlayCode;
  label: string;
  allowsScope: boolean;
}

const HEALTH_OPTIONS: HealthOption[] = [
  { value: 'weight_loss',          label: 'Weight loss / calorie control', allowsScope: true },
  { value: 'high_protein_fitness', label: 'Gym / high protein',            allowsScope: true },
  { value: 'veg_protein_seeker',   label: 'Vegetarian protein focus',      allowsScope: true },
  { value: 'diabetic_management',  label: 'Diabetic / low-GI',             allowsScope: true },
  { value: 'hypertension_heart',   label: 'Hypertension / heart health',   allowsScope: true },
  { value: 'fasting_ritual',       label: 'Fasting / ritual days',         allowsScope: true },
  { value: 'pregnancy_support',    label: 'Pregnancy nutrition',           allowsScope: false },
  { value: 'postpartum_lactation', label: 'Postpartum / lactation',        allowsScope: false },
];

const SCOPE_OPTIONS: Array<{ value: HealthScope; label: string; description: string }> = [
  { value: 'all',         label: 'For everyone',   description: 'Health-appropriate classes enter the main weekly plan' },
  { value: 'member_only', label: 'One member only', description: 'Main family plan stays unchanged — add-on for that member only' },
];

/**
 * @summary RE Onboarding Step 7 — Health and lifestyle overlay (skippable).
 *
 * @description Always shown; user can skip by pressing "No health goals right now."
 *   Health scope (all vs. member_only) shown when the selected overlay supports it.
 *   Saves to re_user_household_profiles.health_overlay_code + health_scope.
 */
export default function REStep7() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [selectedOverlay, setSelectedOverlay] = useState<HealthOverlayCode | null>(null);
  const [selectedScope, setSelectedScope] = useState<HealthScope | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_7');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);
    })();
  }, []);

  const allowsScope = HEALTH_OPTIONS.find((o) => o.value === selectedOverlay)?.allowsScope ?? false;
  const isValid = selectedOverlay === null || !allowsScope || selectedScope !== null;

  const handleSave = async (overlay: HealthOverlayCode | null, scope: HealthScope | null) => {
    if (saving) return;
    setSaving(true);
    try {
      await saveREHealthOverlay(userId, overlay, scope);
      Logger.info('RE_STEP7', 'health overlay saved', { userId, overlay, scope });
      await UserJourneyLogger.logOnboardingStep(userId, 7, 'RE Health Overlay', {
        'Overlay': overlay ?? 'none',
        'Scope': scope ?? 'n/a',
      });
      router.replace('/(re-onboarding)/re-step-8' as never);
    } catch {
      Alert.alert('Save failed', 'Could not save health preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => handleSave(selectedOverlay, allowsScope ? selectedScope : null);
  const handleSkip = () => handleSave(null, null);

  return (
    <OnboardingLayout
      step={7}
      title="Any health goals for your household?"
      subtitle="We'll shape meals around it. You can skip this and set it later."
      onNext={handleNext}
      onBack={() => router.replace('/(re-onboarding)/re-step-6' as never)}
      nextDisabled={!isValid || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.chipGrid}>
          {HEALTH_OPTIONS.map((opt) => {
            const isSel = selectedOverlay === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.chip, isSel && styles.chipSelected]}
                onPress={() => { setSelectedOverlay(isSel ? null : opt.value); setSelectedScope(null); }}
              >
                <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {selectedOverlay && allowsScope && (
          <View style={styles.scopeSection}>
            <Text style={styles.sectionLabel}>This goal is for…</Text>
            {SCOPE_OPTIONS.map((s) => {
              const isSel = selectedScope === s.value;
              return (
                <Pressable
                  key={s.value}
                  style={[styles.scopeCard, isSel && styles.scopeCardSelected]}
                  onPress={() => setSelectedScope(s.value)}
                >
                  {isSel && <Text style={styles.scopeCheck}>✓</Text>}
                  <Text style={[styles.scopeLabel, isSel && styles.scopeLabelSelected]}>{s.label}</Text>
                  <Text style={styles.scopeDesc}>{s.description}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable style={styles.skipButton} onPress={handleSkip} disabled={saving}>
          <Text style={styles.skipText}>No health goals right now →</Text>
        </Pressable>
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full ?? 999, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  chipText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
  scopeSection: { gap: SPACING.sm, marginBottom: SPACING.lg },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  scopeCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border, padding: SPACING.md, gap: 4,
  },
  scopeCardSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}0F` },
  scopeCheck: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    fontSize: 14, color: COLORS.primary, fontWeight: '700',
  },
  scopeLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  scopeLabelSelected: { color: COLORS.primary },
  scopeDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  skipButton: { alignItems: 'center', paddingVertical: SPACING.lg, marginBottom: SPACING.xl },
  skipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
});
