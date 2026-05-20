import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, APP_NAME, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { supabase } from '../../src/services/supabase';
import { resetOnboardingProgress } from '../../src/repositories/profiles.repository';

const INTRO_SEEN_KEY = 'foofoo_has_seen_intro';

/**
 * @summary Home tab — meal planner (Sprint 2+).
 *
 * @description Placeholder until the Recommendation Engine and daily plan
 * screens are built in Sprint 2. Routes here after successful sign-in when
 * onboarding_completed = true. Sign-out is handled here until the Profile tab
 * is built; navigation after sign-out is driven by onAuthStateChange in _layout.tsx.
 */
export default function HomeTab() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    // _layout.tsx onAuthStateChange handles the redirect to auth-gate
  };

  const handleDevReset = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await resetOnboardingProgress(user.id);
    await AsyncStorage.removeItem(INTRO_SEEN_KEY);
    await supabase.auth.signOut();
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{APP_NAME}</Text>
      <Text style={styles.label}>Home — coming in Sprint 2</Text>

      <View style={styles.actions}>
        <Pressable style={styles.signOutButton} onPress={handleSignOut} disabled={loading}>
          <Text style={styles.signOutText}>{loading ? 'Signing out…' : 'Sign Out'}</Text>
        </Pressable>
        {__DEV__ && (
          <Pressable style={styles.devReset} onPress={handleDevReset} disabled={loading}>
            <Text style={styles.devResetText}>Reset App State</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  label: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  actions: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  signOutButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  devReset: {
    paddingVertical: SPACING.sm,
  },
  devResetText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
