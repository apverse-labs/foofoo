import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  Modal, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { OnboardingLayout } from '../../src/components/shared/OnboardingLayout';
import { fetchREStates, saveRELocation } from '../../src/repositories/re-onboarding.repository';
import { fetchProfile } from '../../src/repositories/profiles.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/config/constants';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { Logger } from '../../src/utils/systemLogger';
import { PostHogService } from '../../src/services/posthog.service';
import type { REState } from '../../src/types';

/**
 * @summary RE Onboarding Step 1 — Home state and current city.
 *
 * @description Loads state options from re_states (staging) — not from the
 *   hardcoded INDIAN_STATES list — so new signups write the canonical RE state name.
 *   City is free text for now; BUILD-03 resolves it to a destination group code.
 */
export default function REStep1() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [city, setCity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [states, setStates] = useState<REState[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PostHogService.screen('re_onboarding_step_1');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/sign-in' as never); return; }
      setUserId(user.id);

      const [profile, reStates] = await Promise.all([
        fetchProfile(user.id),
        fetchREStates(),
      ]);

      if (profile) {
        setCity(profile.current_city ?? '');
        setSelectedState(profile.home_state ?? '');
      }
      setStates(reStates);
      setLoadingStates(false);
    })();
  }, []);

  const isValid = city.trim().length > 0 && selectedState.length > 0;

  const handleNext = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await saveRELocation(userId, selectedState, city.trim());
      Logger.info('RE_STEP1', 'location saved', { userId, state: selectedState });
      await UserJourneyLogger.logOnboardingStep(userId, 1, 'RE Location', {
        State: selectedState,
        City: city.trim(),
      });
      router.replace('/(re-onboarding)/re-step-2' as never);
    } catch {
      Alert.alert('Save failed', 'Could not save your location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={1}
      title="Where are you from?"
      subtitle="Your home state shapes your food identity. Your city adds a lifestyle layer."
      onNext={handleNext}
      nextDisabled={!isValid || saving}
      nextLabel={saving ? 'Saving…' : 'Next'}
    >
      <View style={styles.form}>
        <Text style={styles.label}>Home State</Text>
        <Pressable
          style={[styles.input, styles.picker]}
          onPress={() => !loadingStates && setStatePickerOpen(true)}
        >
          {loadingStates
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : (
              <>
                <Text style={selectedState ? styles.pickerText : styles.pickerPlaceholder}>
                  {selectedState || 'Select your home state'}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </>
            )
          }
        </Pressable>

        <Text style={styles.label}>Current City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Mumbai"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <Modal visible={statePickerOpen} animationType="slide" onRequestClose={() => setStatePickerOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Home State</Text>
            <Pressable onPress={() => setStatePickerOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={states}
            keyExtractor={(item) => item.state_id}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.stateRow, item.state_ut === selectedState && styles.stateRowSelected]}
                onPress={() => { setSelectedState(item.state_ut); setStatePickerOpen(false); }}
              >
                <Text style={[styles.stateText, item.state_ut === selectedState && styles.stateTextSelected]}>
                  {item.state_ut}
                </Text>
                {item.state_ut === selectedState && <Text style={styles.checkmark}>✓</Text>}
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
  label: {
    fontSize: 14, fontWeight: '600', color: COLORS.textSecondary,
    marginTop: SPACING.md, marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4, fontSize: 16, color: COLORS.textPrimary, minHeight: 48,
  },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 16, color: COLORS.textPrimary },
  pickerPlaceholder: { fontSize: 16, color: COLORS.textSecondary },
  chevron: { fontSize: 20, color: COLORS.textSecondary },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalClose: { fontSize: 20, color: COLORS.textSecondary, padding: SPACING.sm },
  stateRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  stateRowSelected: { backgroundColor: `${COLORS.primary}10` },
  stateText: { fontSize: 16, color: COLORS.textPrimary },
  stateTextSelected: { color: COLORS.primary, fontWeight: '600' },
  checkmark: { fontSize: 16, color: COLORS.primary },
  separator: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg },
});
