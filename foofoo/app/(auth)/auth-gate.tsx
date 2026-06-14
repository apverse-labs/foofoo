import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { COLORS, SPACING, BORDER_RADIUS, APP_NAME } from '../../src/config/constants';

/**
 * @summary Auth entry screen presenting sign-up and sign-in options.
 *
 * @description Shown to returning users who have already seen the intro and
 * are not logged in. Primary CTA routes to sign-up; secondary outlined button
 * routes to sign-in. T&C footer links are present for DPDP compliance.
 *
 * @calledBy
 * - `app/index.tsx` — when has_seen_intro is set but no active session
 * - `app/(intro)/intro-1.tsx` — skip button and final CTA
 */
export default function AuthGate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // useSafeAreaInsets() returns 0 on the server and real values on the client.
  // Applying insets before mount causes React hydration error #418 on Expo Web.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const paddingTop = mounted ? insets.top + SPACING.xxl : SPACING.xxl;
  const paddingBottom = mounted ? insets.bottom + SPACING.xl : SPACING.xl;

  return (
    <View
      style={[
        styles.container,
        { paddingTop, paddingBottom },
      ]}
    >
      <View style={styles.logoSection}>
        <Text style={styles.logo}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Your personal meal planner</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/sign-up')}
        >
          <Text style={styles.primaryText}>Create Account</Text>
        </Pressable>

        <Pressable
          style={styles.outlineButton}
          onPress={() => router.push('/(auth)/sign-in')}
        >
          <Text style={styles.outlineText}>I already have an account</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        By creating an account, you agree to our{' '}
        <Text style={styles.link}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={styles.link}>Privacy Policy</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  buttons: {
    gap: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.primary,
  },
  footer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
