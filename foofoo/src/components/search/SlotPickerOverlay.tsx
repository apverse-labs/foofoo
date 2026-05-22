/**
 * @summary Compact slot picker shown after long-pressing a search result.
 *
 * @description
 * Quick-add UI: "Add to today's [Breakfast / Lunch / Dinner]?" with a row of
 * 3 buttons. Single tap commits the add via search.repository.addDishToSlot
 * and dismisses. Errors (locked slot) surface as a one-line inline message.
 *
 * @calledBy app/(tabs)/search.tsx
 */

import React, { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import { addDishToSlot } from '../../repositories/search.repository';
import { logSuggestionAction, logFeatureTap } from '../../repositories/feedback.repository';
import { UserJourneyLogger } from '../../utils/userJourneyLogger';
import { Logger } from '../../utils/systemLogger';
import type { SearchResult } from '../../repositories/search.repository';

interface Props {
  dish: SearchResult;
  userId: string;
  planDate: string;
  onClose: () => void;
  onSuccess: (slot: 'breakfast' | 'lunch' | 'dinner') => void;
}

type Slot = 'breakfast' | 'lunch' | 'dinner';
const SLOTS: { value: Slot; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '🍱' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
];

/**
 * @summary Renders the SlotPickerOverlay modal.
 * @param {Props} props - dish, userId, planDate, callbacks
 * @returns {JSX.Element}
 */
export default function SlotPickerOverlay({ dish, userId, planDate, onClose, onSuccess }: Props) {
  const [busy, setBusy] = useState<Slot | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePick = async (slot: Slot) => {
    if (busy) return;
    setBusy(slot);
    setErrorMsg(null);
    try {
      const result = await addDishToSlot(userId, dish.id, planDate, slot);
      if (!result.ok) {
        setErrorMsg(result.error ?? 'Could not add — slot may be locked.');
        return;
      }
      logSuggestionAction(userId, dish.id, planDate, slot, 'added_to_date', 0).catch(() => {});
      logFeatureTap(userId, 'search_quick_add', { screen: 'search', dishId: dish.id, slot, planDate });
      UserJourneyLogger.logGestureAction(userId, 'added_to_date', dish.name, slot, 0).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSuccess(slot);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Logger.error('SLOT-PICKER', 'addDishToSlot failed', { error: msg, dishId: dish.id, slot });
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>Add to today&apos;s meal?</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{dish.name}</Text>

          <View style={styles.row}>
            {SLOTS.map(s => {
              const isBusy = busy === s.value;
              return (
                <Pressable
                  key={s.value}
                  style={[styles.slotBtn, isBusy && styles.slotBtnBusy]}
                  onPress={() => handlePick(s.value)}
                  disabled={!!busy}
                >
                  {isBusy ? (
                    <ActivityIndicator color={COLORS.primary} size="small" />
                  ) : (
                    <>
                      <Text style={styles.slotEmoji}>{s.emoji}</Text>
                      <Text style={styles.slotLabel}>{s.label}</Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>

          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={!!busy}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: {
    width: '85%', maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', gap: SPACING.sm },
  slotBtn: {
    flex: 1,
    backgroundColor: '#F1F3F2',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center', gap: 4,
  },
  slotBtnBusy: { opacity: 0.7 },
  slotEmoji: { fontSize: 22 },
  slotLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  cancelBtn: {
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  errorText: { fontSize: 12, color: COLORS.error, textAlign: 'center' },
});
