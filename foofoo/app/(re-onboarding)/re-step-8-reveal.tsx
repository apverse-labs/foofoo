import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseRE } from '../../src/services/supabase-re';
import REOnboardingLayout from '../../src/components/re/REOnboardingLayout';
import { fetchREHouseholdProfile } from '../../src/repositories/re-onboarding.repository';
import PersonaCard, { PersonaTag } from '../../src/components/re/PersonaCard';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { FoodPref } from '../../src/types';

interface RevealData {
  homeState: string | null;
  currentCity: string | null;
  foodPref: FoodPref | null;
  personaName: string | null;
}

/**
 * @summary RE Onboarding Step 8 (reveal) — "Here's your food identity."
 *
 * @description Assembles the persona card from saved profile data and shows the
 *   food-personality name. Renders gracefully with fallbacks if reads fail.
 */
export default function REStep8Reveal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RevealData>({
    homeState: null, currentCity: null, foodPref: null, personaName: null,
  });

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_8_reveal');
    (async () => {
      try {
        const { data: { user } } = await supabaseRE.auth.getUser();
        if (!user) { router.replace('/(auth)/sign-in' as never); return; }

        let homeState: string | null = null;
        let currentCity: string | null = null;
        let foodPref: FoodPref | null = null;
        let personaName: string | null = null;

        try {
          const { data: profile, error } = await supabaseRE
            .from('profiles')
            .select('home_state,current_city,food_pref')
            .eq('id', user.id)
            .maybeSingle();
          if (error) throw error;
          if (profile) {
            homeState = (profile.home_state as string | null) ?? null;
            currentCity = (profile.current_city as string | null) ?? null;
            foodPref = (profile.food_pref as FoodPref | null) ?? null;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'unknown';
          Logger.error('RE_STEP8_REVEAL', 'profile read failed', { error: message });
        }

        try {
          const household = await fetchREHouseholdProfile(user.id);
          const personaId = household?.persona_id ?? null;
          if (personaId) {
            const { data: persona, error } = await supabaseRE
              .from('re_personas')
              .select('persona_name')
              .eq('persona_id', personaId)
              .maybeSingle();
            if (error) throw error;
            personaName = (persona?.persona_name as string | null) ?? null;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'unknown';
          Logger.error('RE_STEP8_REVEAL', 'persona read failed', { error: message });
        }

        setData({ homeState, currentCity, foodPref, personaName });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.error('RE_STEP8_REVEAL', 'init failed', { error: message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tags: PersonaTag[] = [];
  if (data.homeState) tags.push({ emoji: '🏠', label: data.homeState });
  if (data.currentCity) tags.push({ emoji: '🌆', label: data.currentCity });
  if (data.foodPref) tags.push({ emoji: '🥗', label: data.foodPref });

  const identityLine = (() => {
    if (data.personaName && data.homeState && data.currentCity) {
      return `${data.personaName} from ${data.homeState}, living in ${data.currentCity}`;
    }
    if (data.personaName) return data.personaName;
    return 'Your food identity';
  })();

  const handleNext = () => router.replace('/(re-onboarding)/re-step-9' as never);

  if (loading) {
    return (
      <REOnboardingLayout
        step={8}
        title="Here's your food identity."
        subtitle="This is what I know about you. Your plan will be built around this."
        onNext={() => {}}
        nextDisabled
      >
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      </REOnboardingLayout>
    );
  }

  return (
    <REOnboardingLayout
      step={8}
      title="Here's your food identity."
      subtitle="This is what I know about you. Your plan will be built around this."
      onNext={handleNext}
      nextDisabled={false}
      nextLabel="Build my meal plan →"
    >
      <View style={styles.identityCard}>
        <Text style={styles.identityName}>{identityLine}</Text>
      </View>

      <View style={styles.personaWrap}>
        <PersonaCard tags={tags} />
      </View>

      <View style={styles.blendCard}>
        <Text style={styles.blendTitle}>Your meal blend</Text>
        <Text style={styles.blendText}>🏠 Home food 70% · 🌆 City food 20% · 🌍 Modern 10%</Text>
      </View>
    </REOnboardingLayout>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    backgroundColor: `${COLORS.primary}0F`, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.lg, alignItems: 'center',
  },
  identityName: {
    fontSize: 18, fontWeight: '800', color: COLORS.primary, textAlign: 'center', lineHeight: 26,
  },
  personaWrap: { marginBottom: SPACING.lg },
  blendCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.xs,
  },
  blendTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  blendText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 22 },
});
