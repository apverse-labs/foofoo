import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import { fetchUserWeeklyPlan } from '../../repositories/re-plan.repository';
import { fetchTodayAddons } from '../../repositories/re-addon.repository';
import { Logger } from '../../utils/systemLogger';
import type { REAddonComponent, REDayPlan, REMealClassRef, RESlotAddons } from '../../types';

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

const SLOT_META: Array<{
  key: keyof Pick<REDayPlan, 'breakfast' | 'lunch' | 'snack' | 'dinner'>;
  addonKey: keyof RESlotAddons;
  label: string;
  emoji: string;
}> = [
  { key: 'breakfast', addonKey: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', addonKey: 'lunch', label: 'Lunch', emoji: '☀️' },
  { key: 'snack', addonKey: 'snack', label: 'Snack', emoji: '🫖' },
  { key: 'dinner', addonKey: 'dinner', label: 'Dinner', emoji: '🌙' },
];

const SEGMENT_DISPLAY: Record<string, { emoji: string; label: string }> = {
  baby_6_18m:                   { emoji: '👶', label: 'Baby' },
  toddler:                      { emoji: '🧒', label: 'Toddler' },
  school_child:                 { emoji: '🎒', label: 'Child' },
  child_or_picky_child:         { emoji: '🧒', label: 'Child' },
  picky_child:                  { emoji: '🧒', label: 'Picky' },
  teen_high_appetite:           { emoji: '🧑', label: 'Teen' },
  pregnant_member:              { emoji: '🤰', label: 'Pregnancy' },
  lactating_or_postpartum_mother: { emoji: '🤱', label: 'Postpartum' },
  postpartum_mother:            { emoji: '🤱', label: 'Postpartum' },
  elderly_member:               { emoji: '👴', label: 'Elderly' },
  diabetic_member:              { emoji: '💊', label: 'Diabetic' },
  gym_high_protein_member:      { emoji: '💪', label: 'Fitness' },
  weight_loss_member:           { emoji: '🏃', label: 'Weight' },
  hypertension_heart_member:    { emoji: '❤️', label: 'Heart' },
  jain_member:                  { emoji: '🙏', label: 'Jain' },
  fasting_member:               { emoji: '🕯️', label: 'Fasting' },
  recovery_member:              { emoji: '🌿', label: 'Recovery' },
  allergy_member:               { emoji: '⚠️', label: 'Allergy' },
  cook_needs_instruction:       { emoji: '👨‍🍳', label: 'Cook Guide' },
  working_kitchen_manager:      { emoji: '⏰', label: 'Batch Cook' },
};

function segmentMeta(segment: string): { emoji: string; label: string } {
  return SEGMENT_DISPLAY[segment] ?? { emoji: '➕', label: 'Add-on' };
}

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
 * @summary Small badge chip for a single member add-on component.
 */
function AddonBadge({ addon }: { addon: REAddonComponent }) {
  const { emoji, label } = segmentMeta(addon.targetMemberSegment);
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{emoji} {label}</Text>
    </View>
  );
}

/**
 * @summary Home-screen section that renders today's class-first meal plan.
 *
 * @description Fetches the user's current-week RE plan (primary classes) and
 *   today's member-specific add-on components, then renders them as meal-slot
 *   cards with add-on badges attached.
 *
 * @param {string} userId - Supabase auth UID.
 *
 * @calledBy app/(tabs)/index.tsx — for users on engine 'classfirst_v1'.
 */
export default function REPlanToday({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<REDayPlan | null>(null);
  const [addons, setAddons] = useState<RESlotAddons>({ breakfast: [], lunch: [], snack: [], dinner: [] });
  const [weekStart, setWeekStart] = useState<string>('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [plan, addonData] = await Promise.all([
          fetchUserWeeklyPlan(userId),
          fetchTodayAddons(userId),
        ]);
        if (!active) return;
        if (plan) {
          setWeekStart(plan.planWeekStart);
          const name = todayName();
          setToday(plan.days.find((d) => d.dayOfWeek === name) ?? plan.days[0] ?? null);
        }
        setAddons(addonData);
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

  const hasAnyAddon = Object.values(addons).some((arr) => arr.length > 0);

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Today's plan</Text>
      <Text style={styles.subtitle}>
        Class-first plan · Week of {weekStart ? formatWeekOf(weekStart) : ''}
      </Text>
      <View style={styles.grid}>
        {SLOT_META.map(({ key, addonKey, label, emoji }) => {
          const ref = today[key];
          const slotAddons = addons[addonKey];
          return (
            <View key={key} style={styles.slot}>
              <Text style={styles.slotEmoji}>{emojiForClass(ref, emoji)}</Text>
              <Text style={styles.slotLabel}>{label}</Text>
              <Text style={styles.slotClass} numberOfLines={2}>
                {ref ? ref.display : '—'}
              </Text>
              {slotAddons.length > 0 && (
                <View style={styles.badgeRow}>
                  {slotAddons.map((a) => (
                    <AddonBadge key={`${a.targetMemberSegment}-${a.addonClassCode}`} addon={a} />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
      {hasAnyAddon && (
        <Text style={styles.addonNote}>+ member add-ons shown above</Text>
      )}
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
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  badge: {
    backgroundColor: '#EEF7F1',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  addonNote: { fontSize: 11, color: COLORS.textSecondary, marginTop: SPACING.xs, fontStyle: 'italic' },
});
