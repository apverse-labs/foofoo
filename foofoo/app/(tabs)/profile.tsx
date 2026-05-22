/**
 * @summary Profile tab — avatar, preferences summary, notifications, account, premium placeholder.
 *
 * @description
 * Six sections:
 *  1. Avatar + Name (initials fallback — no edit yet)
 *  2. Food Preferences (tap to re-edit via onboarding step 2)
 *  3. Notifications (toggle + time picker)
 *  4. Account (change password, email, member since)
 *  5. Subscription placeholder (free → premium upsell)
 *  6. App Info + Sign Out
 *
 * Mounts logScreenView('profile') once. Reads counts via getProfileSummary
 * in a single async batch.
 *
 * @calledBy Expo Router tabs
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Switch, TextInput, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, APP_VERSION, APP_NAME } from '../../src/config/constants';
import { supabase } from '../../src/services/supabase';
import { Logger } from '../../src/utils/systemLogger';
import { logScreenView, logFeatureTap } from '../../src/repositories/feedback.repository';
import { PostHogService } from '../../src/services/posthog.service';
import {
  getProfileSummary, updateProfileSettings, changePassword, signOut,
  formatNotificationTime, formatMemberSince, initialsFromName, dietLabel,
  type ProfileSummary,
} from '../../src/repositories/profile-settings.repository';

export default function ProfileTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showPwForm, setShowPwForm] = useState(false);
  const [busySection, setBusySection] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        setSummary(null);
        return;
      }
      logScreenView(uid, 'profile');
      PostHogService.screen('profile');
      const s = await getProfileSummary(uid);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (!summary) return;
    setBusySection('notifications');
    try {
      await updateProfileSettings(summary.id, { notifications_enabled: value });
      setSummary({ ...summary, notifications_enabled: value });
      logFeatureTap(summary.id, 'profile_notifications_toggle', { value });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Could not update', msg);
    } finally {
      setBusySection(null);
    }
  };

  const handleTimeChange = async (newTime: string) => {
    if (!summary) return;
    setBusySection('notifications');
    try {
      await updateProfileSettings(summary.id, { notification_time: newTime });
      setSummary({ ...summary, notification_time: newTime });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Could not update time', msg);
    } finally {
      setBusySection(null);
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = (globalThis as { confirm?: (m: string) => boolean }).confirm?.('Sign out of Foofoo?');
      if (ok) confirmSignOut();
      return;
    }
    Alert.alert('Sign out', 'Sign out of Foofoo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: confirmSignOut },
    ]);
  };

  const confirmSignOut = async () => {
    try {
      if (summary) logFeatureTap(summary.id, 'sign_out');
      await signOut();
      router.replace('/' as never);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Logger.error('PROFILE', 'signOut failed', { error: msg });
      Alert.alert('Sign out failed', msg);
    }
  };

  const handleEditPrefs = () => {
    router.push('/(onboarding)/step-2' as never);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errText}>Sign in to view your profile.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1 — Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFromName(summary.name)}</Text>
          </View>
          <Text style={styles.userName}>{summary.name || 'You'}</Text>
          {summary.username ? <Text style={styles.userHandle}>@{summary.username}</Text> : null}
          <Pressable
            onPress={() => showToast('Edit photo — coming in Phase 0.5')}
            hitSlop={6}
          >
            <Text style={styles.editPhoto}>Edit photo</Text>
          </Pressable>
        </View>

        {/* Section 2 — Food Preferences */}
        <Pressable style={styles.card} onPress={handleEditPrefs}>
          <Text style={styles.cardTitle}>Food Preferences</Text>
          <Text style={styles.cardSummary}>
            {dietLabel(summary.food_pref)}  •  {summary.allergenCount} {summary.allergenCount === 1 ? 'allergy' : 'allergies'}  •  {summary.cuisineCount} cuisines set
          </Text>
          <Text style={styles.cardArrow}>›</Text>
        </Pressable>

        {/* Section 3 — Notifications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.rowLabel}>Morning meal plan</Text>
            <Switch
              value={summary.notifications_enabled}
              onValueChange={handleToggleNotifications}
              disabled={busySection === 'notifications'}
              trackColor={{ true: COLORS.primary, false: '#ddd' }}
              thumbColor="#fff"
            />
          </View>
          {summary.notifications_enabled && (
            <TimePickerRow
              value={summary.notification_time ?? '08:00:00'}
              onChange={handleTimeChange}
              disabled={busySection === 'notifications'}
            />
          )}
          <Text style={styles.cardNote}>We&apos;ll send your plan for the day at this time.</Text>
        </View>

        {/* Section 4 — Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>

          <Pressable
            style={styles.rowBetween}
            onPress={() => setShowPwForm(v => !v)}
          >
            <Text style={styles.rowLabel}>Change password</Text>
            <Text style={styles.rowArrow}>{showPwForm ? '×' : '›'}</Text>
          </Pressable>

          {showPwForm && (
            <ChangePasswordForm
              onDone={(msg) => { setShowPwForm(false); showToast(msg); }}
            />
          )}

          <View style={styles.rowBetween}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{summary.email || '—'}</Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.rowLabel}>Member since</Text>
            <Text style={styles.rowValue}>{formatMemberSince(summary.created_at)}</Text>
          </View>
        </View>

        {/* Section 5 — Subscription placeholder */}
        <View style={styles.premiumCard}>
          <Text style={styles.premiumHeader}>{APP_NAME} Premium</Text>
          <Text style={styles.premiumPlan}>You&apos;re on the Free plan</Text>
          <View style={styles.premiumBenefits}>
            <Text style={styles.benefit}>✓ Unlimited meal planning</Text>
            <Text style={styles.benefit}>✓ Ad-free experience</Text>
            <Text style={styles.benefit}>✓ Advanced meal insights</Text>
          </View>
          <Pressable
            style={styles.premiumBtn}
            onPress={() => {
              if (summary) logFeatureTap(summary.id, 'premium_tap');
              showToast('Premium coming soon! You\'ll be notified when it launches.');
            }}
          >
            <Text style={styles.premiumBtnText}>Upgrade · ₹99/month</Text>
          </Pressable>
        </View>

        {/* Section 6 — App info + Sign out */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.rowLabel}>About {APP_NAME}</Text>
            <Text style={styles.rowValue}>v{APP_VERSION}</Text>
          </View>
          <Pressable
            style={styles.rowBetween}
            onPress={() => showToast('Privacy Policy — coming soon')}
          >
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <Pressable
            style={styles.rowBetween}
            onPress={() => showToast('Terms of Service — coming soon')}
          >
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
        </View>

        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      {toast && (
        <View style={[styles.toast, { bottom: insets.bottom + 16 }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * @summary HH:MM time picker row (two number inputs).
 *
 * @description Simple cross-platform picker — two TextInputs for hour and
 *   minute, plus AM/PM tap-to-toggle. Commits on blur. Works identically on
 *   iOS/Android/Web without pulling in a native picker library.
 *
 * @param {{ value: string; onChange: (v: string) => void; disabled?: boolean }} props
 * @returns {JSX.Element}
 */
function TimePickerRow({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const initial = useMemo(() => parseTime(value), [value]);
  const [h, setH] = useState<string>(String(initial.hour12).padStart(2, '0'));
  const [m, setM] = useState<string>(String(initial.minute).padStart(2, '0'));
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initial.ampm);

  const commit = (nextH = h, nextM = m, nextAp = ampm) => {
    const hourNum = Math.max(1, Math.min(12, Number(nextH) || 12));
    const minNum = Math.max(0, Math.min(59, Number(nextM) || 0));
    const hour24 = nextAp === 'AM'
      ? (hourNum === 12 ? 0 : hourNum)
      : (hourNum === 12 ? 12 : hourNum + 12);
    const newTime = `${String(hour24).padStart(2, '0')}:${String(minNum).padStart(2, '0')}:00`;
    onChange(newTime);
  };

  return (
    <View style={styles.rowBetween}>
      <Text style={styles.rowLabel}>Notify me at</Text>
      <View style={styles.timePickerWrap}>
        <TextInput
          style={styles.timeInput}
          value={h}
          onChangeText={setH}
          onBlur={() => { setH(prev => String(Math.max(1, Math.min(12, Number(prev) || 12))).padStart(2, '0')); commit(); }}
          keyboardType="number-pad"
          maxLength={2}
          editable={!disabled}
        />
        <Text style={styles.timeColon}>:</Text>
        <TextInput
          style={styles.timeInput}
          value={m}
          onChangeText={setM}
          onBlur={() => { setM(prev => String(Math.max(0, Math.min(59, Number(prev) || 0))).padStart(2, '0')); commit(); }}
          keyboardType="number-pad"
          maxLength={2}
          editable={!disabled}
        />
        <Pressable
          style={styles.ampmBtn}
          onPress={() => {
            const next: 'AM' | 'PM' = ampm === 'AM' ? 'PM' : 'AM';
            setAmpm(next);
            commit(h, m, next);
          }}
          disabled={disabled}
        >
          <Text style={styles.ampmText}>{ampm}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * @summary Parses a Postgres time string into 12-hour parts.
 * @param {string} t - HH:MM:SS or HH:MM
 * @returns {{ hour12: number; minute: number; ampm: 'AM' | 'PM' }}
 */
function parseTime(t: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour12, minute: m, ampm };
}

/**
 * @summary Inline change-password form (current + new + confirm).
 *
 * @description Validates length and confirm-match, then calls changePassword.
 *   On success, fires the onDone callback with a toast string.
 *
 * @param {{ onDone: (msg: string) => void }} props
 * @returns {JSX.Element}
 */
function ChangePasswordForm({ onDone }: { onDone: (msg: string) => void }) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (next.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (next !== confirm) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await changePassword(next);
      setNext(''); setConfirm('');
      onDone('Password updated');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.pwForm}>
      <TextInput
        style={styles.pwInput}
        placeholder="New password (min 8 chars)"
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry
        value={next}
        onChangeText={setNext}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.pwInput}
        placeholder="Confirm new password"
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="none"
      />
      {err && <Text style={styles.pwError}>{err}</Text>}
      <Pressable style={styles.pwBtn} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.pwBtnText}>Save password</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  errText: { color: COLORS.textSecondary, fontSize: 14 },
  avatarSection: { alignItems: 'center', paddingVertical: SPACING.lg, gap: 4 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  userHandle: { fontSize: 13, color: COLORS.textSecondary },
  editPhoto: { fontSize: 12, color: COLORS.textSecondary, paddingVertical: 4 },

  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    position: 'relative',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  cardSummary: { fontSize: 14, color: COLORS.textPrimary, paddingRight: 20 },
  cardArrow: { position: 'absolute', right: SPACING.md, top: '50%', fontSize: 20, color: COLORS.textSecondary },
  cardNote: { fontSize: 11, color: COLORS.textSecondary },

  rowBetween: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: { fontSize: 14, color: COLORS.textPrimary },
  rowValue: { fontSize: 13, color: COLORS.textSecondary, flexShrink: 1, marginLeft: SPACING.md },
  rowArrow: { fontSize: 18, color: COLORS.textSecondary },

  timePickerWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  timeInput: {
    width: 36, paddingVertical: 6, textAlign: 'center',
    backgroundColor: '#F1F3F2',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: 14, fontWeight: '700', color: COLORS.textPrimary,
  },
  timeColon: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  ampmBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  ampmText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  pwForm: { gap: SPACING.sm, paddingTop: SPACING.sm },
  pwInput: {
    backgroundColor: '#F1F3F2',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    fontSize: 14, color: COLORS.textPrimary,
  },
  pwError: { fontSize: 12, color: COLORS.error },
  pwBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 12, alignItems: 'center',
  },
  pwBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  premiumCard: {
    marginHorizontal: SPACING.md, marginVertical: SPACING.xs,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFF6E5',
    gap: SPACING.sm,
    borderWidth: 1, borderColor: '#FFE08F',
  },
  premiumHeader: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  premiumPlan: { fontSize: 12, color: COLORS.textSecondary },
  premiumBenefits: { gap: 4, marginVertical: SPACING.xs },
  benefit: { fontSize: 13, color: COLORS.textPrimary },
  premiumBtn: {
    marginTop: SPACING.sm,
    backgroundColor: '#D7D7D7',
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  premiumBtnText: { color: '#5C5C5C', fontSize: 14, fontWeight: '700' },

  signOutBtn: {
    marginHorizontal: SPACING.md, marginTop: SPACING.lg,
    borderWidth: 1.5, borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: { color: COLORS.error, fontSize: 14, fontWeight: '700' },

  toast: {
    position: 'absolute', left: SPACING.lg, right: SPACING.lg,
    backgroundColor: COLORS.textPrimary,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
