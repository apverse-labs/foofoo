import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import { recordFeedback } from '../../repositories/re-feedback.repository';
import { Logger } from '../../utils/systemLogger';
import type { REDishCandidate, REFeedbackSignal } from '../../types';

interface REDishPickProps {
  dish: REDishCandidate;
  userId: string;
  mealClassCode: string;
  onFeedback?: (dishId: string, signal: REFeedbackSignal) => void;
}

/**
 * @summary Single dish pick row with Lock, Skip, and Never/NotToday actions.
 *
 * @description Renders one ranked dish candidate with three gesture targets:
 *   - 👍 Lock → records LOCK signal (strong accept + repeat tolerance)
 *   - 👎 Skip → records NOT_TODAY signal (3-day cooldown)
 *   - ··· More → reveals Never option
 *
 * @calledBy REPlanToday component (within each meal slot).
 */
export default function REDishPick({
  dish,
  userId,
  mealClassCode,
  onFeedback,
}: REDishPickProps) {
  const [sent, setSent] = useState<REFeedbackSignal | null>(null);
  const [showMore, setShowMore] = useState(false);

  async function send(signal: REFeedbackSignal) {
    try {
      await recordFeedback(userId, dish.dishOptionId, mealClassCode, signal);
      setSent(signal);
      onFeedback?.(dish.dishOptionId, signal);
    } catch (err: unknown) {
      Logger.error('RE_DISH_PICK', 'feedback failed', {
        error: err instanceof Error ? err.message : String(err),
        dishId: dish.dishOptionId,
        signal,
      });
    } finally {
      setShowMore(false);
    }
  }

  if (sent === 'NEVER') {
    return (
      <View style={styles.row}>
        <Text style={styles.neverText}>🚫 {dish.dishName} removed</Text>
      </View>
    );
  }

  if (sent === 'LOCK') {
    return (
      <View style={styles.row}>
        <Text style={styles.lockedText}>🔒 {dish.dishName}</Text>
      </View>
    );
  }

  if (sent === 'NOT_TODAY') {
    return (
      <View style={styles.row}>
        <Text style={styles.skippedText}>⏭ {dish.dishName} · not today</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.dishName} numberOfLines={1}>{dish.dishName}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => send('LOCK')}
          accessibilityLabel={`Lock ${dish.dishName}`}
        >
          <Text style={styles.btnText}>🔒</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => send('NOT_TODAY')}
          accessibilityLabel={`Skip ${dish.dishName} today`}
        >
          <Text style={styles.btnText}>⏭</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => setShowMore(true)}
          accessibilityLabel="More options"
        >
          <Text style={styles.btnText}>···</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMore}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMore(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowMore(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{dish.dishName}</Text>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => send('ACCEPT')}>
              <Text style={styles.sheetBtnText}>✅ I had this — mark as eaten</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => send('NEVER')}>
              <Text style={[styles.sheetBtnText, styles.neverBtnText]}>🚫 Never suggest this</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => setShowMore(false)}>
              <Text style={styles.sheetBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: SPACING.xs,
  },
  dishName: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  actions: { flexDirection: 'row', gap: 2 },
  btn: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.background,
  },
  btnText: { fontSize: 13 },
  lockedText: { fontSize: 12, color: COLORS.primary, fontWeight: '600', flex: 1 },
  skippedText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', flex: 1 },
  neverText: { fontSize: 12, color: '#888', fontStyle: 'italic', flex: 1 },
  // Modal sheet
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  sheetTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sheetBtn: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.background,
  },
  sheetBtnText: { fontSize: 14, color: COLORS.textPrimary },
  neverBtnText: { color: '#C0392B' },
});
