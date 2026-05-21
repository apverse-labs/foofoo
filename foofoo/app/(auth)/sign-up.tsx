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
import { Logger } from '../../src/utils/systemLogger';

type PasswordStrength = 'weak' | 'medium' | 'strong';

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak: COLORS.error,
  medium: '#F4A261',
  strong: COLORS.success,
};

/**
 * @summary Evaluates password against DPDP-compliant strength criteria.
 *
 * @param {string} password - Raw password to evaluate
 * @returns {{ strength: PasswordStrength; missing: string[] }} Result object
 */
function evaluatePassword(password: string): { strength: PasswordStrength; missing: string[] } {
  const missing: string[] = [];
  if (password.length < 8) missing.push('8+ characters');
  if (!/[A-Z]/.test(password)) missing.push('uppercase letter');
  if (!/[0-9]/.test(password)) missing.push('number');

  if (missing.length === 0) return { strength: 'strong', missing: [] };
  if (missing.length === 1) return { strength: 'medium', missing };
  return { strength: 'weak', missing };
}

/**
 * @summary Records DPDP-compliant consent after account creation.
 *
 * @description Non-blocking: a failure here does not prevent the user
 * from proceeding. Consent type 'dpdp_terms' aligns with India's Digital
 * Personal Data Protection Act requirement to record explicit consent.
 *
 * @param {string} userId - Supabase UUID of the newly created user
 * @returns {Promise<void>}
 */
async function recordConsent(userId: string): Promise<void> {
  try {
    await supabase.from('user_consent').upsert(
      { user_id: userId, data_consent_at: new Date().toISOString() },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );
  } catch {
    Logger.warn('AUTH', 'DPDP consent record failed — non-blocking');
  }
}

/**
 * @summary Sign-up screen with full name, email, and password fields.
 *
 * @description Validates password strength in real-time (8+ chars, 1 uppercase,
 * 1 number). On success calls Supabase signUp, records DPDP user consent, then
 * navigates to email verification.
 *
 * @calledBy
 * - `app/(auth)/auth-gate.tsx` — "Create Account" primary button
 */
export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { strength, missing } = evaluatePassword(password);
  const canSubmit =
    fullName.trim().length > 0 && email.includes('@') && strength === 'strong';

  /**
   * @summary Creates a Supabase account and routes to email verification.
   *
   * @throws {AuthError} When Supabase signUp rejects the credentials
   *
   * @calledBy Create Account button onPress
   */
  const handleSignUp = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw error;
      if (data.user) {
        await recordConsent(data.user.id);
        // If session exists, email confirm is disabled → go straight to onboarding
        if (data.session) {
          router.replace('/(onboarding)/step-1' as never);
        } else {
          // Email confirmation required → show verification screen
          router.replace('/(auth)/email-verification' as never);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join Foofoo — free forever.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={COLORS.textSecondary}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
        />
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
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
        />

        {password.length > 0 && (
          <View style={styles.strengthRow}>
            <View style={[styles.strengthBar, { backgroundColor: STRENGTH_COLOR[strength] }]} />
            <Text style={[styles.strengthLabel, { color: STRENGTH_COLOR[strength] }]}>
              {strength.charAt(0).toUpperCase() + strength.slice(1)}
              {missing.length > 0 ? ` — needs ${missing.join(', ')}` : ''}
            </Text>
          </View>
        )}
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
        onPress={handleSignUp}
        disabled={!canSubmit || loading}
      >
        <Text style={styles.submitText}>
          {loading ? 'Creating account…' : 'Create Account'}
        </Text>
      </Pressable>

      <Pressable style={styles.signInLink} onPress={() => router.replace('/(auth)/sign-in')}>
        <Text style={styles.signInText}>
          Already have an account?{' '}
          <Text style={styles.signInBold}>Sign in</Text>
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
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  strengthBar: { height: 4, width: 64, borderRadius: 2 },
  strengthLabel: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  signInLink: { alignItems: 'center', paddingVertical: SPACING.sm },
  signInText: { fontSize: 15, color: COLORS.textSecondary },
  signInBold: { color: COLORS.primary, fontWeight: '600' },
  errorBox: {
    backgroundColor: `${COLORS.error}12`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: { fontSize: 14, color: COLORS.error, lineHeight: 20 },
});
