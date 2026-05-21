/**
 * @summary Confirmation modal for 'Never suggest this dish again'.
 *
 * @description
 * Bottom-sheet-style modal. On confirm: writes to never_list + suggestion_logs.
 * Triggered by long press + drag down on MealCard.
 *
 * @param dish - The dish being dismissed
 * @param userId - Auth user ID
 * @param planDate - YYYY-MM-DD
 * @param onConfirm - Called after DB write — Home screen regenerates slot
 * @param onCancel - Dismisses modal, no action
 * @calledBy app/(tabs)/index.tsx
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../services/supabase';
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

export default function NeverModal({ dish, userId, planDate, mealSlot, onConfirm, onCancel }: NeverModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await supabase.from('never_list').insert({
        user_id: userId,
        dish_id: dish.id,
        ref_type: 'dish',
        is_active: true,
      });
      await supabase.from('suggestion_logs').insert({
        user_id: userId,
        dish_id: dish.id,
        plan_date: planDate,
        meal_slot: mealSlot,
        action: 'never',
        position: 0,
        re_version: 'v1',
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onConfirm();
    } catch {
      // Still dismiss — non-fatal
      onConfirm();
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
    flex: 1, backgroundColor: '#D84315',
    borderRadius: BORDER_RADIUS.full, paddingVertical: 14, alignItems: 'center',
  },
  neverText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
