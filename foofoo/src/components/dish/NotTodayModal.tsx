/**
 * @summary Confirmation modal for 'Not today — skip this dish today only'.
 *
 * @description
 * Bottom-sheet-style modal. On confirm: logs not_today action via repository.
 * The calling screen then regenerates the plan for that slot.
 *
 * @calledBy app/(tabs)/index.tsx
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator } from 'react-native';
import { regenerateSlot } from '../../repositories/plans.repository';
import { logSuggestionAction, logFeatureTap } from '../../repositories/feedback.repository';
import { Logger } from '../../utils/systemLogger';
import { PostHogService } from '../../services/posthog.service';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import type { Dish } from '../../types';

interface NotTodayModalProps {
  dish: Dish;
  userId: string;
  planDate: string;
  mealSlot: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * @summary Handles the Not Today confirmation — logs the skip action then calls onConfirm.
 *
 * @description Non-fatal on DB error: the modal still dismisses so the user isn't blocked.
 *   Errors are logged to systemLogger for debugging.
 */
export default function NotTodayModal({ dish, userId, planDate, mealSlot, onConfirm, onCancel }: NotTodayModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      logSuggestionAction(userId, dish.id, planDate, mealSlot, 'not_today', 0).catch(() => {});
      logFeatureTap(userId, 'not_today_confirm', { screen: 'home', dishId: dish.id, mealSlot });
      PostHogService.capture('dish_not_today', {
        dish_id: dish.id,
        meal_slot: mealSlot,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      try {
        await regenerateSlot(planDate, mealSlot as 'breakfast' | 'lunch' | 'dinner', 'not_today', dish.id);
      } catch (regenErr: unknown) {
        const msg = regenErr instanceof Error ? regenErr.message : 'Unknown error';
        Logger.warn('NOT-TODAY-MODAL', 'regenerate-slot failed (non-fatal)', { error: msg, dishId: dish.id });
      }

      onConfirm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Logger.error('NOT-TODAY-MODAL', 'Failed to log not_today action', { error: msg, dishId: dish.id });
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
          <Text style={styles.title}>Not feeling {dish.name} today?</Text>
          <Text style={styles.subtitle}>We'll suggest it again tomorrow.</Text>
          <View style={styles.buttons}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.skipBtn} onPress={handleConfirm} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.skipText}>Skip Today</Text>}
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
  skipBtn: {
    flex: 1, backgroundColor: COLORS.warning,
    borderRadius: BORDER_RADIUS.full, paddingVertical: 14, alignItems: 'center',
  },
  skipText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
