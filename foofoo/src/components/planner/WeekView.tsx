/**
 * @summary 7-day meal grid showing B/L/D for each day.
 *
 * @description
 * Displayed when user taps 'Week' toggle on Home screen.
 * Layout: 7 columns (days) × 3 rows (B/L/D). Today highlighted.
 * Past days greyed. Future empty cells show + to generate that day's plan.
 * Tapping a cell with a plan switches the Day View to that date.
 *
 * @calledBy app/(tabs)/index.tsx — when viewMode==='week'
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import {
  getWeekPlans, weekStartFromDate, addDays,
  type DayPlan,
} from '../../repositories/week.repository';
import { generateDailyPlan, getTodayIST } from '../../repositories/plans.repository';
import { Logger } from '../../utils/systemLogger';

interface Props {
  userId: string;
  initialDate: string; // YYYY-MM-DD
  onDaySelect: (date: string) => void;
}

const SLOT_ROWS: { key: 'breakfast' | 'lunch' | 'dinner'; label: string }[] = [
  { key: 'breakfast', label: 'B' },
  { key: 'lunch', label: 'L' },
  { key: 'dinner', label: 'D' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MAX_WEEKS_AHEAD = 4;

/**
 * @summary Compares two ISO date strings as calendar dates.
 * @param {string} a - YYYY-MM-DD
 * @param {string} b - YYYY-MM-DD
 * @returns {number} negative if a<b, 0 if equal, positive if a>b
 */
function cmp(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

/**
 * @summary Renders the Week View grid.
 *
 * @param {Props} props - userId, initialDate (anchor), day-tap callback
 * @returns {JSX.Element}
 */
export default function WeekView({ userId, initialDate, onDaySelect }: Props) {
  const { width } = useWindowDimensions();
  const today = getTodayIST();
  const [weekStart, setWeekStart] = useState<string>(() => weekStartFromDate(initialDate));
  const [days, setDays] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const load = useCallback(async (start: string) => {
    setLoading(true);
    try {
      const rows = await getWeekPlans(userId, start);
      setDays(rows);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load(weekStart);
  }, [userId, weekStart, load]);

  const maxFutureWeekStart = weekStartFromDate(addDays(today, MAX_WEEKS_AHEAD * 7));
  const canGoPrev = true; // past navigation always allowed
  const canGoNext = cmp(weekStart, maxFutureWeekStart) < 0;

  const goPrev = () => setWeekStart(addDays(weekStart, -7));
  const goNext = () => { if (canGoNext) setWeekStart(addDays(weekStart, 7)); };
  const goThis = () => setWeekStart(weekStartFromDate(today));

  const handleCellPress = (day: DayPlan, slot: 'breakfast' | 'lunch' | 'dinner') => {
    if (day.plan) {
      onDaySelect(day.date);
      return;
    }
    if (day.isPast) return; // no-op for past days
    if (generating) return;
    generatePlanFor(day.date);
  };

  const generatePlanFor = async (date: string) => {
    setGenerating(date);
    try {
      await generateDailyPlan(date, false);
      await load(weekStart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Logger.error('WEEK-VIEW', 'generatePlanFor failed', { error: msg, date });
    } finally {
      setGenerating(null);
    }
  };

  const handleDayHeaderPress = (day: DayPlan) => {
    if (day.plan) onDaySelect(day.date);
    else if (!day.isPast) generatePlanFor(day.date);
  };

  // Layout: SLOT_LABEL_COL (28dp) + 7 day columns; tight gaps to fit phone width.
  const contentWidth = Math.min(width, 700);
  const slotLabelWidth = 28;
  const colGap = 4;
  const cellWidth = Math.max(
    34,
    Math.floor((contentWidth - SPACING.md * 2 - slotLabelWidth - colGap * 7) / 7),
  );

  return (
    <View style={styles.root}>
      {/* Navigator */}
      <View style={styles.navRow}>
        <Pressable
          onPress={goPrev}
          hitSlop={10}
          accessibilityLabel="Previous week"
          style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
          disabled={!canGoPrev}
        >
          <Text style={styles.navArrow}>◀</Text>
        </Pressable>
        <Pressable onPress={goThis} hitSlop={8}>
          <Text style={styles.navLabel}>{formatRangeLabel(weekStart)}</Text>
        </Pressable>
        <Pressable
          onPress={goNext}
          hitSlop={10}
          accessibilityLabel="Next week"
          style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
          disabled={!canGoNext}
        >
          <Text style={styles.navArrow}>▶</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.gridWrap, { width: Math.max(contentWidth, slotLabelWidth + (cellWidth + colGap) * 7 + SPACING.md * 2) }]}>
          {/* Day header row */}
          <View style={styles.row}>
            <View style={{ width: slotLabelWidth }} />
            {days.map((d, i) => (
              <Pressable
                key={d.date}
                onPress={() => handleDayHeaderPress(d)}
                style={[
                  styles.dayHeader,
                  { width: cellWidth, marginLeft: i === 0 ? 0 : colGap },
                  d.isToday && styles.dayHeaderToday,
                  d.isPast && styles.dayHeaderPast,
                ]}
              >
                <Text style={[
                  styles.dayHeaderText,
                  d.isToday && styles.dayHeaderTextToday,
                ]}>{DAY_LABELS[i]}</Text>
                <Text style={[
                  styles.dayHeaderNum,
                  d.isToday && styles.dayHeaderTextToday,
                ]}>{dayNum(d.date)}</Text>
              </Pressable>
            ))}
          </View>

          {/* Slot rows */}
          {SLOT_ROWS.map(slot => (
            <View key={slot.key} style={styles.row}>
              <View style={[styles.slotLabel, { width: slotLabelWidth }]}>
                <Text style={styles.slotLabelText}>{slot.label}</Text>
              </View>
              {days.map((d, i) => {
                const dishObj = d.plan?.[slot.key] ?? null;
                const isLocked = (d.plan?.locked_slots ?? []).includes(slot.key);
                const isGenerating = generating === d.date;
                return (
                  <Pressable
                    key={`${d.date}-${slot.key}`}
                    style={[
                      styles.cell,
                      { width: cellWidth, height: cellWidth, marginLeft: i === 0 ? 0 : colGap },
                      d.isToday && styles.cellToday,
                      d.isPast && styles.cellPast,
                    ]}
                    onPress={() => handleCellPress(d, slot.key)}
                  >
                    {isGenerating ? (
                      <ActivityIndicator color={COLORS.primary} size="small" />
                    ) : dishObj ? (
                      <>
                        <Image
                          source={{ uri: dishObj.hero_image_url ?? `https://picsum.photos/seed/d-${dishObj.id}/100/100` }}
                          placeholder={dishObj.blurhash ?? 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'}
                          contentFit="cover"
                          style={styles.cellImage}
                        />
                        {isLocked && (
                          <View style={styles.lockOverlay}>
                            <Text style={styles.lockText}>🔒</Text>
                          </View>
                        )}
                      </>
                    ) : d.isPast ? (
                      <Text style={styles.dashText}>—</Text>
                    ) : (
                      <Text style={styles.plusText}>+</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}

          {loading && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator color={COLORS.primary} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * @summary Formats the week range like "May 20 – 26".
 * @param {string} weekStart - Monday date (YYYY-MM-DD)
 * @returns {string}
 */
function formatRangeLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekStart + 'T00:00:00');
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`;
}

/**
 * @summary Returns the day-of-month integer for an ISO date.
 * @param {string} iso - YYYY-MM-DD
 * @returns {number}
 */
function dayNum(iso: string): number {
  return new Date(iso + 'T00:00:00').getDate();
}

const styles = StyleSheet.create({
  root: { gap: SPACING.sm, paddingHorizontal: SPACING.md },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  navBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  navBtnDisabled: { opacity: 0.3 },
  navArrow: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700' },
  navLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  gridWrap: { gap: 4, position: 'relative' },
  row: { flexDirection: 'row', gap: 0, alignItems: 'center' },
  dayHeader: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  dayHeaderToday: { backgroundColor: COLORS.primary },
  dayHeaderPast: { opacity: 0.5 },
  dayHeaderText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  dayHeaderNum: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  dayHeaderTextToday: { color: '#fff' },
  slotLabel: { alignItems: 'center', justifyContent: 'center' },
  slotLabelText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  cell: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  cellToday: { borderColor: COLORS.primary, borderWidth: 1.5 },
  cellPast: { opacity: 0.5 },
  cellImage: { width: '100%', height: '100%' },
  lockOverlay: {
    position: 'absolute', top: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  lockText: { fontSize: 9 },
  dashText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '700' },
  plusText: { fontSize: 18, color: COLORS.primary, fontWeight: '700' },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center',
  },
});
