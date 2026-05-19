import { useEffect, useState } from 'react';
import { Redirect, type Href } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../src/services/supabase';
import { COLORS, APP_NAME } from '../src/config/constants';

const INTRO_SEEN_KEY = 'has_seen_intro';

// expo-router typed-routes only knows paths after `expo start` regenerates types;
// cast through unknown so we can reference routes created this session without any.
const hr = (path: string) => path as unknown as Href;

type AppRoute = 'splash' | 'auth-gate' | 'onboarding' | 'home';

/**
 * @summary App entry point that resolves the correct initial screen.
 *
 * @description Priority order:
 * 1. First launch (no AsyncStorage key) → /splash → intro flow
 * 2. No active session → /(auth)/auth-gate
 * 3. Session exists, onboarding incomplete → /(onboarding)/step-1
 * 4. Session exists, onboarding complete → /(tabs)
 *
 * Renders a minimal loading view while resolution is in progress so
 * there is no blank-screen flash on startup.
 */
export default function Index() {
  const [route, setRoute] = useState<AppRoute | null>(null);

  useEffect(() => {
    resolveRoute().then(setRoute);
  }, []);

  if (!route) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>{APP_NAME}</Text>
      </View>
    );
  }

  if (route === 'splash') return <Redirect href={hr('/splash')} />;
  if (route === 'auth-gate') return <Redirect href={hr('/(auth)/auth-gate')} />;
  if (route === 'onboarding') return <Redirect href={hr('/(onboarding)/step-1')} />;
  return <Redirect href={hr('/(tabs)')} />;
}

/**
 * @summary Determines the initial route by checking storage, session, and profile.
 *
 * @description Sets the intro-seen flag before routing to /splash so that if
 * the user force-quits during the splash they do not see it again. Falls back
 * to auth-gate on any unexpected error to avoid a stuck state.
 *
 * @returns {Promise<AppRoute>} The resolved route identifier
 */
async function resolveRoute(): Promise<AppRoute> {
  try {
    const hasSeen = await AsyncStorage.getItem(INTRO_SEEN_KEY);
    if (!hasSeen) {
      await AsyncStorage.setItem(INTRO_SEEN_KEY, 'true');
      return 'splash';
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 'auth-gate';

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single();

    return profile?.onboarding_completed ? 'home' : 'onboarding';
  } catch {
    console.error('[INDEX] Route resolution failed — defaulting to auth-gate');
    return 'auth-gate';
  }
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
});
