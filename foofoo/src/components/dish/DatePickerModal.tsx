/**
 * @summary Bottom-sheet modal for adding a dish to a future date and slot.
 *
 * @description
 * Opens when user taps the Plus icon on a MealCard or Meal Detail page.
 * Shows next 7 days as selectable date chips + breakfast/lunch/dinner slot
 * selector. On confirm: writes to planner for that date/slot.
 * Does not affect today's plan.
 *
 * @calledBy MealCard Plus icon, Meal Detail 'Add to date' button
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../services/supabase';
import { Logger } from '../../utils/systemLogger';
import { UserJourneyLogger } from '../../utils/userJourneyLogger';
import { logSuggestionAction, logFeatureTap } from '../../repositories/feedback.repository';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import type { Dish } from '../../types';

interface Props {
  dish: Dish;
  userId: string;
  currentSlot: 'breakfast' | 'lunch' | 'dinner';
  onConfirm: (planDate: string, slot: string) => void;
  onCancel: () => void;
}

type SlotChoice = 'breakfast' | 'lunch' | 'dinner';

/**
 * @summary Returns IST today + N days as YYYY-MM-DD strings.
 * @param {number} days - Number of days to include starting at today
 * @returns {string[]} ISO date strings
 */
function nextNDates(days: number): string[] {
  const out: string[] = [];
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
}

/**
 * @summary Renders the DatePickerModal bottom sheet.
 *
 * @description On confirm performs an upsert on planner for (user_id, plan_date)
 *   so other slots are preserved. Shows a confirm prompt before overwriting an
 *   existing dish in the chosen slot.
 *
 * @param {Props} props - dish, userId, current slot, callbacks
 * @returns {JSX.Element}
 * @calledBy MealCard, Meal Detail
 */
export default function DatePickerModal({ dish, userId, currentSlot, onConfirm, onCancel }: Props) {
  // nextNDates() calls Date.now() which differs between SSR and client render.
  // Initialise with empty array (safe on server) and populate after mount to avoid #418.
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<SlotChoice>(currentSlot);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = nextNDates(7);
    setDates(d);
    setSelectedDate(d[1] ?? d[0] ?? ''); // default tomorrow
  }, []);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Check existing slot to warn before overwrite
      const { data: existing } = await supabase
        .from('planner')
        .select(`id, ${selectedSlot}_ref_id, locked_slots`)
        .eq('user_id', userId)
        .eq('plan_date', selectedDate)
        .maybeSingle();

      const existingRefId = (existing as Record<string, unknown> | null)?.[`${selectedSlot}_ref_id`];
      const lockedSlots: string[] = (existing as { locked_slots?: string[] } | null)?.locked_slots ?? [];

      if (lockedSlots.includes(selectedSlot)) {
        setLoading(false);
        Alert.alert(
          'Slot is locked',
          `Your ${selectedSlot} is locked on ${formatDateLabel(selectedDate)}. Unlock it before adding.`,
        );
        return;
      }

      if (existingRefId != null && existingRefId !== dish.id) {
        const proceed = await confirmOverwrite(selectedSlot, selectedDate);
        if (!proceed) {
          setLoading(false);
          return;
        }
      }

      const upsertPayload: Record<string, unknown> = {
        user_id: userId,
        plan_date: selectedDate,
        [`${selectedSlot}_ref_type`]: 'dish',
        [`${selectedSlot}_ref_id`]: dish.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('planner')
        .upsert(upsertPayload, { onConflict: 'user_id,plan_date' });

      if (error) throw new Error(error.message);

      logSuggestionAction(userId, dish.id, selectedDate, selectedSlot, 'added_to_date', 0).catch(() => {});
      logFeatureTap(userId, 'added_to_date', { screen: 'date_picker', date: selectedDate, slot: selectedSlot });
      UserJourneyLogger.logGestureAction(userId, 'added_to_date', dish.name, selectedSlot, 0).catch(() => {});

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onConfirm(selectedDate, selectedSlot);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Logger.error('DATE-PICKER', 'Add to date failed', { error: msg, dishId: dish.id });
      Alert.alert('Could not add to plan', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add to plan</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{dish.name}</Text>

          <Text style={styles.section}>Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {dates.map((d, i) => (
              <Pressable
                key={d}
                style={[styles.dateChip, selectedDate === d && styles.dateChipActive]}
                onPress={() => setSelectedDate(d)}
              >
                <Text style={[styles.dateChipText, selectedDate === d && styles.dateChipTextActive]}>
                  {i === 0 ? 'Today' : shortDay(d)}
                </Text>
                <Text style={[styles.dateChipDay, selectedDate === d && styles.dateChipTextActive]}>
                  {dayNum(d)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.section}>Meal slot</Text>
          <View style={styles.slotRow}>
            {(['breakfast', 'lunch', 'dinner'] as SlotChoice[]).map(s => (
              <Pressable
                key={s}
                style={[styles.slotPill, selectedSlot === s && styles.slotPillActive]}
                onPress={() => setSelectedSlot(s)}
              >
                <Text style={[styles.slotText, selectedSlot === s && styles.slotTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.buttons}>
            <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.confirmText}>Add to plan</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function confirmOverwrite(slot: string, date: string): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Replace existing dish?',
      `Your ${slot} on ${formatDateLabel(date)} already has a dish. Replace it?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
      ],
    );
  });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function shortDay(iso: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(iso + 'T00:00:00').getDay()];
}

function dayNum(iso: string): string {
  return String(new Date(iso + 'T00:00:00').getDate());
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.xl, gap: SPACING.md, paddingBottom: 36,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd',
    alignSelf: 'center', marginBottom: SPACING.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.sm },
  section: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  dateRow: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  dateChip: {
    width: 56, paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#F1F3F2', borderRadius: BORDER_RADIUS.md,
    gap: 2,
  },
  dateChipActive: { backgroundColor: COLORS.primary },
  dateChipText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  dateChipDay: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  dateChipTextActive: { color: '#fff' },
  slotRow: { flexDirection: 'row', gap: SPACING.sm },
  slotPill: {
    flex: 1, paddingVertical: 12, borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#F1F3F2', alignItems: 'center',
  },
  slotPillActive: { backgroundColor: COLORS.primary },
  slotText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  slotTextActive: { color: '#fff' },
  buttons: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full, paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  confirmBtn: {
    flex: 1, backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full, paddingVertical: 14, alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
