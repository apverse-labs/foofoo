import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
// expo-notifications is not functional on web — import is deferred to the handler
import type { PermissionStatus } from 'expo-notifications';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import {
  completeOnboarding, saveNotificationSettings,
} from '../../src/repositories/profiles.repository';
import { recordConsent } from '../../src/repositories/meal-prefs.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { UserRole } from '../../src/types';

type RoleOption = { value: UserRole; label: string; description: string };

const ROLES: RoleOption[] = [
  { value: 'cook',    label: '🍳 I cook',                description: 'I decide what to make and cook myself.' },
  { value: 'instruct', label: '📣 I get told what to cook', description: 'Someone else cooks — I just suggest.' },
];

/**
 * @summary Onboarding Step 7 — role, notifications, and completion.
 *
 * @description Collects role preference (cook vs instruct), requests notification
 *   permission, sets preferred notification time (default 08:00), and marks
 *   onboarding_completed = true. Records data consent in user_consent table.
 *   Navigates to /(tabs) home screen on completion.
 *
 * @calledBy `app/(onboarding)/_layout.tsx` — step-7 route
 */
export default function OnboardingStep7() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<UserRole>('cook');
  const [notifGranted, setNotifGranted] = useState(false);
  const [notifHour, setNotifHour] = useState(8);
  const [notifMinute, setNotifMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('onboarding_step_7');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);
    })();
  }, []);

  const requestNotifications = async () => {
    if (Platform.OS === 'web') return;
    try {
      // Lazy-import so the module never loads on web (avoids startup warning)
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifGranted(status === ('granted' as PermissionStatus));
    } catch (err: any) {
      Logger.warn('STEP7', 'notification permission failed', { message: err?.message });
    }
  };

  const adjustHour = (delta: number) => {
    setNotifHour((h) => (h + delta + 24) % 24);
  };

  const adjustMinute = (delta: number) => {
    setNotifMinute((m) => (m + delta + 60) % 60);
  };

  const formatTime = () => {
    const h = String(notifHour).padStart(2, '0');
    const m = String(notifMinute).padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleStart = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const time = formatTime();
      await Promise.all([
        completeOnboarding(userId, role),
        saveNotificationSettings(userId, time, notifGranted),
        recordConsent(userId),
      ]);
      Logger.info('STEP7', 'onboarding_step_complete', { step: 7, user_id: userId });
      Logger.info('STEP7', 'onboarding_complete', { user_id: userId });
      await UserJourneyLogger.logOnboardingStep(userId, 7, 'Role & Notifications', {
        'Role': role === 'cook' ? 'I cook (decides what to make)' : 'I get told what to cook (suggests to someone else)',
        'Notifications': notifGranted ? `Enabled — daily reminder at ${time}` : 'Not granted (can enable in Settings)',
        'Consent': 'Data usage consent recorded',
        'Status': 'Onboarding complete — navigating to Home screen',
      });
      router.replace('/(tabs)' as never);
    } catch (err: any) {
      Logger.error('STEP7', 'completion failed', { message: err?.message });
      Alert.alert('Setup failed', 'Could not complete your setup. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={7}
      title="Almost there! 🎉"
      subtitle="Just a couple of final touches."
      onNext={handleStart}
      onBack={() => router.replace('/(onboarding)/step-6' as never)}
      nextDisabled={saving}
      nextLabel={saving ? 'Setting up…' : 'Start Using Foofoo'}
    >
      {/* Role selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>How will you use Foofoo?</Text>
        <View style={styles.roleRow}>
          {ROLES.map((opt) => {
            const active = role === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.roleCard, active && styles.roleCardActive]}
                onPress={() => setRole(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.roleDesc}>{opt.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Morning reminders</Text>
        {!notifGranted ? (
          <Pressable style={styles.notifBtn} onPress={requestNotifications}>
            <Text style={styles.notifBtnText}>🔔 Enable notifications</Text>
          </Pressable>
        ) : (
          <View style={styles.timePickerCard}>
            <Text style={styles.timePickerLabel}>Preferred reminder time</Text>
            <View style={styles.timePicker}>
              <View style={styles.timeUnit}>
                <Pressable style={styles.timeBtn} onPress={() => adjustHour(1)} hitSlop={8}>
                  <Text style={styles.timeBtnText}>▲</Text>
                </Pressable>
                <Text style={styles.timeValue}>{String(notifHour).padStart(2, '0')}</Text>
                <Pressable style={styles.timeBtn} onPress={() => adjustHour(-1)} hitSlop={8}>
                  <Text style={styles.timeBtnText}>▼</Text>
                </Pressable>
              </View>
              <Text style={styles.timeSep}>:</Text>
              <View style={styles.timeUnit}>
                <Pressable style={styles.timeBtn} onPress={() => adjustMinute(15)} hitSlop={8}>
                  <Text style={styles.timeBtnText}>▲</Text>
                </Pressable>
                <Text style={styles.timeValue}>{String(notifMinute).padStart(2, '0')}</Text>
                <Pressable style={styles.timeBtn} onPress={() => adjustMinute(-15)} hitSlop={8}>
                  <Text style={styles.timeBtnText}>▼</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.timeHint}>You'll get your meal plan at {formatTime()} every morning.</Text>
          </View>
        )}
        {Platform.OS === 'web' && (
          <Text style={styles.webNote}>Push notifications are not supported on web.</Text>
        )}
      </View>

      {/* Completion message */}
      <View style={styles.completionCard}>
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={styles.completionEmoji}>🍽️</Text>
        )}
        <Text style={styles.completionText}>
          Your personalised meal plan is being prepared…
        </Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: SPACING.lg },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  roleRow: { gap: SPACING.sm },
  roleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}0F`,
  },
  roleLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  roleLabelActive: { color: COLORS.primary },
  roleDesc: { fontSize: 13, color: COLORS.textSecondary },
  notifBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  timePickerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timePickerLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  timeUnit: { alignItems: 'center', gap: SPACING.xs },
  timeBtn: {
    width: 40,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: BORDER_RADIUS.sm,
  },
  timeBtnText: { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
  timeValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    width: 56,
    textAlign: 'center',
  },
  timeSep: { fontSize: 32, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  timeHint: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  webNote: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  completionCard: {
    marginTop: SPACING.xl,
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  completionEmoji: { fontSize: 36 },
  completionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
});
