import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import { fetchUserWeeklyPlan } from '../../repositories/re-plan.repository';
import { Logger } from '../../utils/systemLogger';
import type { REDayPlan, REMealClassRef } from '../../types';

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

const SLOT_META: Array<{ key: keyof Pick<REDayPlan, 'breakfast' | 'lunch' | 'snack' | 'dinner'>; label: string; emoji: string }> = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '☀️' },
  { key: 'snack', label: 'Snack', emoji: '🫖' },
  { key: 'dinner', label: 'Dinner', emoji: '🌙' },
];

/**
 * @summary Resolve an emoji from a class code prefix, with a slot fallback.
 */
function emojiForClass(ref: REMealClassRef | null, fallback: string): string {
  const code = ref?.classCode ?? '';
  if (code.startsWith('BF_')) return '🌅';
  if (code.startsWith('LD_') || code.startsWith('LN_')) return '☀️';
  if (code.startsWith('SN_')) return '🫖';
  if (code.startsWith('DN_')) return '🌙';
  return fallback;
}

function todayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

function formatWeekOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * @summary Home-screen section that renders today's class-first meal plan.
 *
 * @description Fetches the user's current-week RE plan and shows today's
 *   breakfast/lunch/snack/dinner meal classes as simple cards. Renders nothing
 *   when no plan exists for the week.
 *
 * @param {string} userId - Supabase auth UID.
 *
 * @calledBy app/(tabs)/index.tsx — for users on engine 'classfirst_v1'.
 */
export default function REPlanToday({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<REDayPlan | null>(null);
  const [weekStart, setWeekStart] = useState<string>('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const plan = await fetchUserWeeklyPlan(userId);
        if (!active) return;
        if (plan) {
          setWeekStart(plan.planWeekStart);
          const name = todayName();
          setToday(plan.days.find((d) => d.dayOfWeek === name) ?? plan.days[0] ?? null);
        }
      } catch (err: unknown) {
        Logger.error('RE_PLAN_TODAY', 'load failed', {
          error: err instanceof Error ? err.message : String(err), userId,
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }
  if (!today) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Today's plan</Text>
      <Text style={styles.subtitle}>
        Class-first plan · Week of {weekStart ? formatWeekOf(weekStart) : ''}
      </Text>
      <View style={styles.grid}>
        {SLOT_META.map(({ key, label, emoji }) => {
          const ref = today[key];
          return (
            <View key={key} style={styles.slot}>
              <Text style={styles.slotEmoji}>{emojiForClass(ref, emoji)}</Text>
              <Text style={styles.slotLabel}>{label}</Text>
              <Text style={styles.slotClass} numberOfLines={2}>
                {ref ? ref.display : '—'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    alignSelf: 'stretch',
    gap: SPACING.xs,
  },
  header: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  slot: {
    flexGrow: 1, flexBasis: '45%',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    gap: 2,
  },
  slotEmoji: { fontSize: 20 },
  slotLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase' },
  slotClass: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
});
