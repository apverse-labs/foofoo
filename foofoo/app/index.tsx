import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/services/supabase';
import { resetOnboardingProgress } from '../src/repositories/profiles.repository';
import { COLORS, APP_NAME, STORAGE_KEYS } from '../src/config/constants';
import { Logger } from '../src/utils/systemLogger';
import { OneSignalService } from '../src/services/onesignal.service';
import { PostHogService } from '../src/services/posthog.service';

const INTRO_SEEN_KEY = STORAGE_KEYS.INTRO_SEEN;

/**
 * @summary App entry point — resolves the correct initial screen on every mount.
 *
 * @description Priority order:
 * 1. First launch (no AsyncStorage key) → /splash → intro flow
 * 2. No active session → /(auth)/auth-gate
 * 3. Session exists, onboarding incomplete → /(onboarding)/step-N (resume)
 * 4. Session exists, onboarding complete → /(tabs)
 *
 * Renders a loading screen while resolution is in progress.
 * In __DEV__, a "Reset App State" button clears storage + signs out so the
 * fresh-install flow can be re-tested without reinstalling.
 */
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkAndRoute();
  }, []);

  async function checkAndRoute() {
    try {
      const hasSeenIntro = await AsyncStorage.getItem(INTRO_SEEN_KEY);
      if (!hasSeenIntro) {
        // Do NOT mark intro as seen here — the user hasn't actually seen it yet.
        // The flag is written in the intro screen's exit handler instead, so a
        // force-quit during splash/intro re-shows the flow on the next launch.
        router.replace('/splash' as never);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/(auth)/auth-gate' as never);
        return;
      }

      // Fire-and-forget: store OneSignal subscription ID against this user.
      OneSignalService.registerDevice(session.user.id).catch(() => {});

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_step, food_pref, home_state, premium_tier')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        PostHogService.identify(session.user.id, {
          foodPref: profile.food_pref ?? '',
          homeState: profile.home_state ?? null,
          premiumTier: profile.premium_tier ?? 'free',
          onboardingCompleted: !!profile.onboarding_completed,
        });
      }

      if (profile?.onboarding_completed) {
        router.replace('/(tabs)' as never);
        return;
      }

      const step = Math.min(Math.max((profile?.onboarding_step ?? 0) + 1, 1), 7);
      router.replace(`/(onboarding)/step-${step}` as never);
    } catch {
      Logger.error('INDEX', 'Route resolution failed — defaulting to auth-gate');
      router.replace('/(auth)/auth-gate' as never);
    }
  }

  async function handleDevReset() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await resetOnboardingProgress(user.id);
    await AsyncStorage.removeItem(INTRO_SEEN_KEY);
    await supabase.auth.signOut();
    checkAndRoute();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{APP_NAME}</Text>
      {__DEV__ && (
        <TouchableOpacity style={styles.devReset} onPress={handleDevReset}>
          <Text style={styles.devResetText}>Reset App State</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  devReset: {
    position: 'absolute',
    bottom: 48,
  },
  devResetText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});
