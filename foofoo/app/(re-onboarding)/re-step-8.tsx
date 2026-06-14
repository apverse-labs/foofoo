import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { completeREOnboarding } from '../../src/repositories/re-onboarding.repository';
import { runCohortAssignment } from '../../src/repositories/re-cohort-resolver.repository';
import { COLORS, SPACING } from '../../src/config/constants';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';

/**
 * @summary RE Onboarding Step 8 — Cohort assignment + onboarding completion (no user-facing UI).
 *
 * @description Runs automatically on mount:
 *   1. runCohortAssignment — resolves state_id + city → cohort_id + overlay personas,
 *      writes to re_user_household_profiles.
 *   2. completeREOnboarding — sets re_engine_version='classfirst_v1' on production profile
 *      and inserts a re_user_engine_assignments audit row.
 *   On success, routes to /(tabs). On failure, shows an alert with a retry option.
 */
export default function REStep8() {
  const router = useRouter();

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_8');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }

      try {
        await runCohortAssignment(user.id);
        Logger.info('RE_STEP8', 'Cohort assignment complete', { userId: user.id });

        await completeREOnboarding(user.id);
        Logger.info('RE_STEP8', 're_engine_version set', { userId: user.id });

        router.replace('/(tabs)' as never);
      } catch (err: any) {
        Logger.error('RE_STEP8', 'Onboarding completion failed', { error: err?.message, userId: user.id });
        Alert.alert(
          'Almost there',
          'We could not finish setting up your profile. Please try again.',
          [{ text: 'Retry', onPress: () => router.replace('/(re-onboarding)/re-step-8' as never) }],
        );
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>Setting up your meal plan…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: SPACING.lg },
  text: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500' },
});
