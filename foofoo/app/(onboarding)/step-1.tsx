import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  Modal, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import {
  fetchProfile, saveProfileStep1, checkUsernameAvailable,
} from '../../src/repositories/profiles.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { INDIAN_STATES } from '../../src/utils/indian-states';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';

/**
 * @summary Onboarding Step 1 — collects name, username, and location.
 *
 * @description Pre-fills name from auth session. Debounces username uniqueness
 *   check against Supabase. State picker is a full-screen modal with FlatList.
 *   Saves to profiles table then navigates to Step 2.
 *
 * @calledBy `app/(onboarding)/_layout.tsx` — via Expo Router file routing
 */
export default function OnboardingStep1() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    PostHogService.screen('onboarding_step_1');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);
      const profile = await fetchProfile(user.id);
      if (profile) {
        setName(profile.name || user.user_metadata?.full_name || '');
        setUsername(profile.username || '');
        setCity(profile.current_city || '');
        setState(profile.home_state || '');
      } else {
        setName(user.user_metadata?.full_name || '');
      }
    })();
  }, []);

  const validateUsername = useCallback((value: string) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(value);
  }, []);

  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!validateUsername(value)) {
      setUsernameStatus(value.length === 0 ? 'idle' : 'invalid');
      return;
    }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const available = await checkUsernameAvailable(value, userId);
      setUsernameStatus(available ? 'ok' : 'taken');
    }, 500);
  }, [userId, validateUsername]);

  const isValid =
    name.trim().length > 0 &&
    usernameStatus === 'ok' &&
    city.trim().length > 0 &&
    state.length > 0;

  const handleNext = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const profileData = {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        home_state: state,
        current_city: city.trim(),
      };
      await saveProfileStep1(userId, profileData);
      await UserJourneyLogger.logOnboardingStep(userId, 1, 'Profile Setup', {
        Name: profileData.name,
        Username: `@${profileData.username}`,
        City: profileData.current_city,
        State: profileData.home_state,
      });
      router.replace('/(onboarding)/step-2' as never);
    } catch (err: any) {
      Logger.error('STEP1', 'save failed', { message: err?.message, code: err?.code });
      if (err?.code === 'USERNAME_TAKEN') {
        setUsernameStatus('taken');
        Alert.alert('Username taken', 'Someone just claimed this username. Please pick another.');
      } else {
        Alert.alert('Save failed', 'Could not save your profile. Please check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={1}
      title="Tell us about you"
      subtitle="We'll use this to personalise your meal plan."
      onNext={handleNext}
      nextDisabled={!isValid || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Priya Sharma"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.label}>Username</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.flex, usernameStatus === 'taken' && styles.inputError]}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="letters, numbers, underscore (3–20)"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameStatus === 'checking' && (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.statusIcon} />
          )}
          {usernameStatus === 'ok' && <Text style={[styles.statusIcon, styles.ok]}>✓</Text>}
          {usernameStatus === 'taken' && <Text style={[styles.statusIcon, styles.err]}>✗</Text>}
        </View>
        {usernameStatus === 'taken' && <Text style={styles.hint}>Username already taken</Text>}
        {usernameStatus === 'invalid' && username.length > 0 && (
          <Text style={styles.hint}>3–20 chars, letters/numbers/underscore only</Text>
        )}

        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Mumbai"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.label}>State</Text>
        <Pressable style={[styles.input, styles.picker]} onPress={() => setStatePickerOpen(true)}>
          <Text style={state ? styles.pickerText : styles.pickerPlaceholder}>
            {state || 'Select your state'}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      {/* State picker modal */}
      <Modal visible={statePickerOpen} animationType="slide" onRequestClose={() => setStatePickerOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select State</Text>
            <Pressable onPress={() => setStatePickerOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={INDIAN_STATES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.stateRow, item === state && styles.stateRowSelected]}
                onPress={() => { setState(item); setStatePickerOpen(false); }}
              >
                <Text style={[styles.stateText, item === state && styles.stateTextSelected]}>
                  {item}
                </Text>
                {item === state && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: SPACING.xs },
  flex: { flex: 1 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: 16,
    color: COLORS.textPrimary,
    minHeight: 48,
  },
  inputError: { borderColor: COLORS.error },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusIcon: { fontSize: 18, fontWeight: '700', width: 24, textAlign: 'center' },
  ok: { color: COLORS.success },
  err: { color: COLORS.error },
  hint: { fontSize: 12, color: COLORS.error, marginTop: 2 },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: { fontSize: 16, color: COLORS.textPrimary },
  pickerPlaceholder: { fontSize: 16, color: COLORS.textSecondary },
  chevron: { fontSize: 20, color: COLORS.textSecondary },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalClose: { fontSize: 20, color: COLORS.textSecondary, padding: SPACING.sm },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  stateRowSelected: { backgroundColor: `${COLORS.primary}10` },
  stateText: { fontSize: 16, color: COLORS.textPrimary },
  stateTextSelected: { color: COLORS.primary, fontWeight: '600' },
  checkmark: { fontSize: 16, color: COLORS.primary },
  separator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg },
});
