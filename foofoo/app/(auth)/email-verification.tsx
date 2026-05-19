import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';

const POLL_MS = 5_000;
const RESEND_COOLDOWN_S = 60;

/**
 * @summary Email verification screen that polls Supabase until the link is clicked.
 *
 * @description Calls supabase.auth.getSession every 5 seconds. When
 * session.user.email_confirmed_at is set the polling stops and the user is
 * routed to onboarding. A resend button with a 60-second cooldown prevents
 * confirmation email spam.
 *
 * @calledBy
 * - `app/(auth)/sign-up.tsx` — immediately after successful signUp()
 */
export default function EmailVerification() {
  const router = useRouter();
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pollRef.current = setInterval(checkVerification, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  /**
   * @summary Polls Supabase session for email_confirmed_at and routes on success.
   *
   * @description Errors are caught and logged; polling continues on failure so
   * a transient network issue does not strand the user on this screen.
   */
  const checkVerification = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        if (pollRef.current) clearInterval(pollRef.current);
        router.replace('/(onboarding)/step-1');
      }
    } catch {
      console.warn('[AUTH] Email verification poll failed — will retry');
    }
  };

  /**
   * @summary Resends the signup confirmation email and starts the cooldown timer.
   *
   * @throws {AuthError} When Supabase resend() fails
   *
   * @calledBy Resend button onPress
   */
  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error('No email on current session');
      await supabase.auth.resend({ type: 'signup', email: session.user.email });
      startCooldown();
    } catch {
      console.warn('[AUTH] Resend confirmation email failed');
    } finally {
      setResending(false);
    }
  };

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_S);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const resendLabel = resending
    ? 'Sending…'
    : cooldown > 0
    ? `Resend in ${cooldown}s`
    : 'Resend email';

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📬</Text>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We've sent a confirmation link. Open it on your phone and you'll be
        automatically signed in here.
      </Text>

      <Pressable
        style={[styles.resendButton, cooldown > 0 && styles.resendDisabled]}
        onPress={handleResend}
        disabled={cooldown > 0 || resending}
      >
        <Text style={styles.resendText}>{resendLabel}</Text>
      </Pressable>

      <Pressable
        style={styles.backLink}
        onPress={() => router.replace('/(auth)/sign-in')}
      >
        <Text style={styles.backText}>← Back to sign in</Text>
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
  icon: { fontSize: 64 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  resendButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 200,
  },
  resendDisabled: { borderColor: COLORS.border, opacity: 0.6 },
  resendText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  backLink: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  backText: { fontSize: 15, color: COLORS.textSecondary },
});
