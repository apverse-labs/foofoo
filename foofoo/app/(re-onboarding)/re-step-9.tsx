import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseRE } from '../../src/services/supabase-re';
import { completeREOnboarding } from '../../src/repositories/re-onboarding.repository';
import { runCohortAssignment } from '../../src/repositories/re-cohort-resolver.repository';
import { generateWeeklyPlan } from '../../src/services/re-engine.service';
import { COLORS, SPACING } from '../../src/config/constants';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';

/**
 * @summary RE Onboarding Step 9 — Cohort assignment + onboarding completion (processing).
 *
 * @description Runs automatically on mount:
 *   1. runCohortAssignment — resolves state_id + city → cohort_id + overlay personas.
 *   2. completeREOnboarding — sets re_engine_version + audit row.
 *   3. generateWeeklyPlan (RE service) — resolves engine version, builds the first weekly plan.
 *   On success, briefly shows "Done ✓" then routes to /(tabs). On failure, retries.
 */
export default function REStep9() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_9');
    (async () => {
      const { data: { user } } = await supabaseRE.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }

      try {
        await runCohortAssignment(user.id);
        Logger.info('RE_STEP9', 'Cohort assignment complete', { userId: user.id });

        await completeREOnboarding(user.id);
        Logger.info('RE_STEP9', 're_engine_version set', { userId: user.id });

        await generateWeeklyPlan(user.id, true);
        Logger.info('RE_STEP9', 'weekly plan generated', { userId: user.id });

        setDone(true);
        setTimeout(() => router.replace('/(tabs)' as never), 900);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.error('RE_STEP9', 'Onboarding completion failed', { error: message, userId: user.id });
        Alert.alert(
          'Almost there',
          'We could not finish setting up your profile. Please try again.',
          [{ text: 'Retry', onPress: () => router.replace('/(re-onboarding)/re-step-9' as never) }],
        );
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      {done ? (
        <Text style={styles.done}>Done ✓</Text>
      ) : (
        <Animated.View style={{ opacity: pulse, alignItems: 'center', gap: SPACING.lg }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.text}>Matching you to your meal profile…</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: SPACING.lg },
  text: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500' },
  done: { fontSize: 22, color: COLORS.primary, fontWeight: '800' },
});
