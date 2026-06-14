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
import { supabaseRE } from '../../src/services/supabase-re';
import { COLORS, SPACING, BORDER_RADIUS, RE_FEATURE_FLAGS } from '../../src/config/constants';
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
   * @summary Authenticates user against the correct Supabase project and routes accordingly.
   *
   * @description When RE_FEATURE_FLAGS.ONBOARDING_ENABLED is true, tries staging
   * (supabaseRE) first — this handles users who signed up after RE was enabled.
   * If staging auth fails, falls back to production (supabase) for legacy users
   * who exist only in the production project.
   *
   * Routing post-auth:
   * - RE staging user → `/(re-onboarding)/re-step-1` or `/(tabs)` (RE home)
   * - Legacy production user → `/(onboarding)/step-N` or `/(tabs)` (legacy home)
   *
   * @throws {AuthError} When both staging and production reject credentials
   *
   * @calledBy Sign In button onPress and password field onSubmitEditing
   */
  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setErrorMsg('');
    try {
      let userId: string | undefined;
      let isREUser = false;

      if (RE_FEATURE_FLAGS.ONBOARDING_ENABLED) {
        // Try staging first (RE users). If it fails, fall through to production.
        const { data: reData, error: reError } = await supabaseRE.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!reError && reData.user) {
          userId = reData.user.id;
          isREUser = true;
        }
      }

      if (!userId) {
        // Production auth — handles legacy users and RE-disabled mode.
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        userId = data.user?.id;
      }

      if (!userId) throw new Error('No user returned from sign-in');
      PostHogService.capture('sign_in', { method: 'email', flow: isREUser ? 're' : 'legacy' });

      if (isREUser) {
        const { data: profile } = await supabaseRE
          .from('profiles')
          .select('re_engine_version, onboarding_completed')
          .eq('id', userId)
          .single();
        // RE onboarding incomplete → resume it; otherwise go to tabs (RE home).
        if (!profile?.onboarding_completed) {
          router.replace('/(re-onboarding)/re-step-1' as never);
        } else {
          router.replace('/(tabs)' as never);
        }
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, onboarding_step')
          .eq('id', userId)
          .single();
        if (profile?.onboarding_completed) {
          router.replace('/(tabs)' as never);
        } else {
          const next = Math.min(Math.max((profile?.onboarding_step ?? 0) + 1, 1), 7);
          router.replace(`/(onboarding)/step-${next}` as never);
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      const lower = raw.toLowerCase();
      let friendly: string;
      if (lower.includes('email not confirmed')) {
        friendly = 'Please verify your email before signing in. Check your inbox.';
      } else if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
        friendly = 'Wrong email or password. Please try again.';
      } else if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
        friendly = 'No internet connection. Please check and try again.';
      } else if (lower.includes('rate limit') || lower.includes('too many')) {
        friendly = 'Too many attempts. Please wait a minute and try again.';
      } else {
        friendly = 'Sign in failed. Please try again.';
      }
      setErrorMsg(friendly);
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
