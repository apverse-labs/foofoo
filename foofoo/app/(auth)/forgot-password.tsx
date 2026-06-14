import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useClientInsets } from '../../src/hooks/useClientInsets';
import { supabase } from '../../src/services/supabase';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { Logger } from '../../src/utils/systemLogger';
import { isValidEmail } from '../../src/utils/validators';

/**
 * @summary Forgot-password screen that dispatches a Supabase password reset email.
 *
 * @description Accepts the user's registered email address and calls
 * supabase.auth.resetPasswordForEmail. Shows a confirmation card on success
 * so the user knows to check their inbox.
 *
 * @calledBy
 * - `app/(auth)/sign-in.tsx` — "Forgot password?" link
 */
export default function ForgotPassword() {
  const router = useRouter();
  const insets = useClientInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  /**
   * @summary Sends a password reset link to the provided email address.
   *
   * @throws {AuthError} When Supabase resetPasswordForEmail fails
   *
   * @calledBy Send Reset Link button and keyboard submit
   */
  const handleReset = async () => {
    if (!isValidEmail(email) || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setSent(true);
    } catch (err) {
      Logger.error('AUTH', 'Password reset email failed', { message: (err as any)?.message });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + SPACING.xxl }]}>
        <Text style={styles.icon}>✉️</Text>
        <Text style={styles.title}>Reset link sent</Text>
        <Text style={styles.body}>
          Check <Text style={styles.bold}>{email}</Text> for a password reset
          link. It may take a minute to arrive.
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const canSubmit = isValidEmail(email);

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.xxl }]}>
      <Pressable style={styles.backLink} onPress={() => router.back()}>
        <Text style={styles.backLinkText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Forgot password?</Text>
      <Text style={styles.body}>
        Enter your email and we'll send you a link to reset your password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={COLORS.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="send"
        onSubmitEditing={handleReset}
      />

      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
        onPress={handleReset}
        disabled={!canSubmit || loading}
      >
        <Text style={styles.submitText}>
          {loading ? 'Sending…' : 'Send Reset Link'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  backLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backLinkText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  icon: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.textPrimary },
  body: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  bold: { fontWeight: '600', color: COLORS.textPrimary },
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
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  backButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
});
