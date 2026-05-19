import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, APP_NAME } from '../../src/config/constants';

/**
 * @summary Onboarding step 1 — diet and cuisine preferences (Sprint 2+).
 *
 * @description Placeholder until the full 7-step onboarding flow is built in
 * Sprint 2. Routes here from email-verification or sign-in when
 * onboarding_completed = false.
 */
export default function OnboardingStep1() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{APP_NAME}</Text>
      <Text style={styles.title}>Let's personalise your experience</Text>
      <Text style={styles.body}>Onboarding flow — coming in Sprint 2</Text>

      <Pressable style={styles.button} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.buttonText}>Skip for now →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
