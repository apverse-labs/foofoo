/**
 * @summary Confirmation modal for 'Never suggest this dish again'.
 *
 * @description
 * Bottom-sheet-style modal. On confirm: writes to never_list + suggestion_logs
 * via repository functions. Triggered by long press + drag down on MealCard.
 *
 * @calledBy app/(tabs)/index.tsx
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { addToNeverList, logSuggestionAction } from '../../repositories/plans.repository';
import { Logger } from '../../utils/systemLogger';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import type { Dish } from '../../types';

interface NeverModalProps {
  dish: Dish;
  userId: string;
  planDate: string;
  mealSlot: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * @summary Handles the Never confirmation — writes never_list + suggestion_logs then calls onConfirm.
 *
 * @description Non-fatal on DB error: the modal still dismisses so the user isn't blocked.
 *   Errors are logged to systemLogger for debugging.
 */
export default function NeverModal({ dish, userId, planDate, mealSlot, onConfirm, onCancel }: NeverModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await addToNeverList(userId, dish.id);
      await logSuggestionAction(userId, dish.id, planDate, mealSlot, 'never', 0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onConfirm();
    } catch (err: any) {
      Logger.error('NEVER-MODAL', 'Failed to write never list entry', { error: err?.message, dishId: dish.id });
      onConfirm(); // Still dismiss — non-fatal
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Never suggest {dish.name} again?</Text>
          <Text style={styles.subtitle}>It won't appear in your suggestions anymore.</Text>
          <View style={styles.buttons}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.neverBtn} onPress={handleConfirm} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.neverText}>Never</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.xl, gap: SPACING.md, paddingBottom: 40,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd',
    alignSelf: 'center', marginBottom: SPACING.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full, paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  neverBtn: {
    flex: 1, backgroundColor: COLORS.never,
    borderRadius: BORDER_RADIUS.full, paddingVertical: 14, alignItems: 'center',
  },
  neverText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
