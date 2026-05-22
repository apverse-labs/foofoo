import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { PostHogService } from '../../src/services/posthog.service';

/**
 * @summary Sign-in screen with email and password authentication.
 *
 * @description Calls Supabase signInWithPassword, then queries
 * profiles.onboarding_completed to route the user to the correct next screen:
 * true → /(tabs), false/missing → /(onboarding)/step-1.
 *
 * @calledBy
 * - `app/(auth)/auth-gate.tsx` — "I already have an account" button
 * - `app/(auth)/sign-up.tsx` — "Already have an account?" link
 * - `app/(auth)/email-verification.tsx` — "Back to sign in" link
 */
export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  /**
   * @summary Authenticates user and routes to onboarding or home tab.
   *
   * @description Fetches the user's profile after successful auth to decide
   * whether onboarding is still pending. Gracefully falls back to onboarding
   * if the profile row does not yet exist.
   *
   * @throws {AuthError} When Supabase signInWithPassword rejects credentials
   *
   * @calledBy Sign In button onPress and password field onSubmitEditing
   */
  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error('No user returned from sign-in');
      PostHogService.capture('sign_in', { method: 'email' });

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_step')
        .eq('id', userId)
        .single();

      if (profile?.onboarding_completed) {
        router.replace('/(tabs)' as never);
      } else {
        // Resume at the last incomplete step
        const next = Math.min(Math.max((profile?.onboarding_step ?? 0) + 1, 1), 7);
        router.replace(`/(onboarding)/step-${next}` as never);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      // Surface a friendlier message for the common "email not confirmed" case
      const msg = raw.toLowerCase().includes('email not confirmed')
        ? 'Please verify your email before signing in. Check your inbox.'
        : raw;
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to your Foofoo account.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={handleSignIn}
        />
        <Pressable
          style={styles.forgotLink}
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
        onPress={handleSignIn}
        disabled={!canSubmit || loading}
      >
        <Text style={styles.submitText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </Pressable>

      <Pressable style={styles.signUpLink} onPress={() => router.replace('/(auth)/sign-up')}>
        <Text style={styles.signUpText}>
          New to Foofoo?{' '}
          <Text style={styles.signUpBold}>Create account</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 15, color: COLORS.textSecondary },
  form: { gap: SPACING.md },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    height: 52,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  signUpLink: { alignItems: 'center', paddingVertical: SPACING.sm },
  signUpText: { fontSize: 15, color: COLORS.textSecondary },
  signUpBold: { color: COLORS.primary, fontWeight: '600' },
  errorBox: {
    backgroundColor: `${COLORS.error}12`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: { fontSize: 14, color: COLORS.error, lineHeight: 20 },
});
