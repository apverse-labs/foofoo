/**
 * REWeekView — 7-day RE class-first grid for RE users.
 *
 * Replaces the legacy WeekView (dishes-based) for users on classfirst_v1.
 * Each cell shows the class display name. Tap → opens RESwapSheet.
 * Uses re_user_weekly_plans directly via the RE supabase client.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { supabaseRE } from '../../../services/supabase-re';
import { getWeekStartMondayIST, deriveMealClassDisplayName } from '../../../repositories/re-plan.repository';
import { getTodayIST } from '../../../repositories/plans.repository';
import { fetchSwapCandidatesForClass } from '../../../repositories/re-dish-expander.repository';
import { buildSwapTiers } from '../../../utils/re-weekly';
import { SPACING, BORDER_RADIUS, RE_TYPE, getREPalette } from '../../../config/re-theme';
import REWeekCell from './REWeekCell';
import RESwapSheet from './RESwapSheet';
import { Logger } from '../../../utils/systemLogger';
import type { REDishCandidate } from '../../../types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOT_KEYS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
type SlotKey = typeof SLOT_KEYS[number];

interface WeekRow {
  day: string;        // e.g. "Monday"
  date: string;        // YYYY-MM-DD calendar date for this column
  weekdayWeekend: string;
  breakfast: string | null;
  lunch:     string | null;
  snack:     string | null;
  dinner:    string | null;
  breakfastDisplay: string | null;
  lunchDisplay:     string | null;
  snackDisplay:     string | null;
  dinnerDisplay:    string | null;
}

interface SwapSheet {
  visible: boolean;
  day: string;
  slot: SlotKey;
  classCode: string;
  classDisplay: string;
  candidates: REDishCandidate[];
  loadingCandidates: boolean;
}

const ORDERED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * @summary Weekly RE plan grid for RE users — class-based cells with tap-to-swap.
 *
 * @param {{ userId: string }} props
 *
 * @calledBy app/(tabs)/index.tsx — week view for RE users.
 */
export default function REWeekView({ userId }: { userId: string }) {
  const c = getREPalette('light');
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<SwapSheet | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ws = getWeekStartMondayIST();
        const { data, error } = await supabaseRE
          .from('re_user_weekly_plans')
          .select(
            'day_of_week, weekday_weekend, '
            + 'breakfast_class, lunch_class, snack_class, dinner_class, '
            + 'breakfast_display, lunch_display, snack_display, dinner_display',
          )
          .eq('profile_id', userId)
          .eq('plan_week_start', ws);
        if (error) throw error;
        if (!active) return;

        type RawRow = {
          day_of_week: string; weekday_weekend?: string;
          breakfast_class?: string | null; lunch_class?: string | null;
          snack_class?: string | null; dinner_class?: string | null;
          breakfast_display?: string | null; lunch_display?: string | null;
          snack_display?: string | null; dinner_display?: string | null;
        };
        const mapped: WeekRow[] = ORDERED_DAYS.map((day, i) => {
          const r = (data as unknown as RawRow[]).find((d) => d.day_of_week === day);
          const dateObj = new Date(`${ws}T00:00:00`);
          dateObj.setDate(dateObj.getDate() + i);
          return {
            day,
            date: dateObj.toISOString().slice(0, 10),
            weekdayWeekend: r?.weekday_weekend ?? 'Weekday',
            breakfast: r?.breakfast_class ?? null,
            lunch:     r?.lunch_class ?? null,
            snack:     r?.snack_class ?? null,
            dinner:    r?.dinner_class ?? null,
            breakfastDisplay: r?.breakfast_display ?? null,
            lunchDisplay:     r?.lunch_display ?? null,
            snackDisplay:     r?.snack_display ?? null,
            dinnerDisplay:    r?.dinner_display ?? null,
          };
        });
        setRows(mapped);
      } catch (err: unknown) {
        Logger.error('RE_WEEK_VIEW', 'fetch failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  if (loading) return <ActivityIndicator style={styles.loader} color={c.primary} />;

  function openSheet(day: string, date: string, slot: SlotKey, classCode: string, classDisplay: string, isWeekend: boolean) {
    setSheet({ visible: true, day, slot, classCode, classDisplay, candidates: [], loadingCandidates: true });
    fetchSwapCandidatesForClass(userId, classCode, classDisplay, isWeekend).then((result) => {
      setSheet((s) => (s && s.day === day && s.slot === slot
        ? { ...s, candidates: result.topDishes, loadingCandidates: false }
        : s));
    });
  }

  const sheetTiers = sheet ? buildSwapTiers(sheet.classCode) : [];
  const todayISO = getTodayIST();

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.slotLabel} />
            {rows.map((r, i) => {
              const isToday = r.date === todayISO;
              return (
                <View key={r.day} style={styles.dayHead}>
                  <Text style={[styles.dayShort, { color: isToday ? c.primary : c.textSecondary }]}>
                    {DAY_LABELS[i]} {Number(r.date.slice(8, 10))}
                  </Text>
                  {r.weekdayWeekend === 'Weekend' && (
                    <Text style={[styles.weekendDot, { color: c.accent }]}>●</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Slot rows */}
          {SLOT_KEYS.map((slot) => (
            <View key={slot} style={styles.slotRow}>
              <View style={styles.slotLabel}>
                <Text style={[styles.slotLabelText, { color: c.textSecondary }]}>
                  {slot.charAt(0).toUpperCase()}
                </Text>
              </View>
              {rows.map((r) => {
                const classCode = r[slot];
                const displayKey = `${slot}Display` as `${SlotKey}Display`;
                const display = r[displayKey];
                const friendlyClass = display ?? (classCode ? deriveMealClassDisplayName(classCode) : '—');
                const isWeekend = r.weekdayWeekend === 'Weekend';
                return (
                  <REWeekCell
                    key={r.day + slot}
                    day={r.day}
                    slot={slot}
                    friendlyClass={friendlyClass}
                    isToday={r.date === todayISO}
                    isWeekend={isWeekend}
                    locked={false}
                    onPress={() => classCode && openSheet(r.day, r.date, slot, classCode, friendlyClass, isWeekend)}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {sheet && (
        <RESwapSheet
          visible={sheet.visible}
          onClose={() => setSheet(null)}
          slotLabel={`${sheet.day} ${sheet.slot}`}
          tiers={sheetTiers}
          candidatesByTier={{ same: sheet.candidates, different: [], broader: [] }}
          onSelectDish={() => setSheet(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { marginTop: SPACING.xl },
  headerRow: { flexDirection: 'row', paddingBottom: SPACING.xs },
  dayHead: { width: 72, alignItems: 'center', gap: 2 },
  dayShort: { ...RE_TYPE.caption, fontWeight: '700' },
  weekendDot: { fontSize: 8 },
  slotRow: { flexDirection: 'row', marginBottom: 2 },
  slotLabel: {
    width: 28, justifyContent: 'center', alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm, marginRight: 2,
  },
  slotLabelText: { ...RE_TYPE.caption, fontWeight: '700' },
});
