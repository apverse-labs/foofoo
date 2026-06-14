import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import { generateUserAddonPlan } from './re-addon.repository';
import type { REDayPlan, REMealClassRef, REWeeklyPlan } from '../types';

const ENGINE_VERSION = 'classfirst_v1';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const;

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

/**
 * @summary Derive a readable meal-class name from a raw class_name token.
 *
 * @description Removes a leading slot prefix code if present (e.g. "BF_"),
 *   replaces underscores with spaces and title-cases each word. Used as a
 *   fallback when the DB has no dedicated display column.
 *
 * @param {string} raw - Raw class name / code, e.g. 'BF_STUFFED_FLATBREAD'.
 * @returns {string} Readable name, e.g. 'Stuffed Flatbread'.
 */
export function deriveMealClassDisplayName(raw: string): string {
  if (!raw) return '';
  const withoutPrefix = raw.replace(/^(BF|LD|LN|SN|DN)_/i, '');
  return withoutPrefix
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * @summary Compute the Monday (IST) of the week containing the given instant.
 *
 * @description FooFoo stores week starts as a calendar date in IST (UTC+5:30).
 *   Returns an ISO date string (YYYY-MM-DD).
 *
 * @param {Date} [now] - Reference instant; defaults to current time.
 * @returns {string} ISO date of the IST Monday for that week.
 */
export function getWeekStartMondayIST(now: Date = new Date()): string {
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  const dow = ist.getUTCDay(); // 0=Sun..6=Sat (on shifted clock)
  const daysSinceMonday = (dow + 6) % 7;
  const monday = new Date(ist.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  return monday.toISOString().slice(0, 10);
}

/**
 * @summary Pick the primary class code for a slot, falling back to secondary.
 */
function pickClass(primary: string | null, secondary: string | null): string | null {
  return primary ?? secondary ?? null;
}

// ── Internal DB types ─────────────────────────────────────────────────────────

interface WeeklyClassPlanRow {
  day_of_week: string;
  weekday_weekend: string;
  breakfast_primary_class: string | null;
  breakfast_secondary_class: string | null;
  lunch_primary_class: string | null;
  lunch_secondary_class: string | null;
  snack_primary_class: string | null;
  snack_secondary_class: string | null;
  dinner_primary_class: string | null;
  dinner_secondary_class: string | null;
}

interface MealClassRow {
  meal_class_code: string;
  class_name: string | null;
  meal_class_display_name?: string | null;
}

/**
 * @summary Build a code → display-name map from re_meal_classes rows.
 */
function buildDisplayMap(rows: MealClassRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    const display = r.meal_class_display_name
      ?? (r.class_name ? r.class_name : deriveMealClassDisplayName(r.meal_class_code));
    map.set(r.meal_class_code, display);
  }
  return map;
}

// ── Operations ────────────────────────────────────────────────────────────────

/**
 * @summary Generate and persist a 7-day class-first plan for a user.
 *
 * @description Reads the user's cohort from re_user_household_profiles, loads the
 *   cohort's 7 weekly class rows, resolves class display names, then upserts one
 *   row per day into re_user_weekly_plans for the current IST week.
 *
 * @param {string} userId - Supabase auth UID (== profiles.id).
 * @returns {Promise<void>}
 *
 * @calledBy app/(re-onboarding)/re-step-9.tsx — after cohort assignment.
 */
export async function generateUserWeeklyPlan(userId: string): Promise<void> {
  try {
    const { data: profile, error: profErr } = await supabaseRE
      .from('re_user_household_profiles')
      .select('profile_id, cohort_id, city_destination_group')
      .eq('profile_id', userId)
      .maybeSingle();
    if (profErr) throw profErr;

    const cohortId = (profile as { cohort_id: string | null } | null)?.cohort_id ?? null;
    if (!cohortId) {
      Logger.warn('RE_PLAN', 'generateUserWeeklyPlan: no cohort_id, skipping', { userId });
      return;
    }

    const cityGroup = (profile as { city_destination_group: string | null }).city_destination_group;
    const cityOverlayApplied = !!cityGroup
      && cityGroup !== 'HOME_STATE_TIER1'
      && cityGroup !== 'HOME_STATE_TIER2';

    const { data: planRows, error: planErr } = await supabaseRE
      .from('re_weekly_class_plans')
      .select(
        'day_of_week, weekday_weekend, '
        + 'breakfast_primary_class, breakfast_secondary_class, '
        + 'lunch_primary_class, lunch_secondary_class, '
        + 'snack_primary_class, snack_secondary_class, '
        + 'dinner_primary_class, dinner_secondary_class',
      )
      .eq('cohort_id', cohortId);
    if (planErr) throw planErr;

    const rows = (planRows ?? []) as unknown as WeeklyClassPlanRow[];
    if (rows.length === 0) {
      Logger.warn('RE_PLAN', 'generateUserWeeklyPlan: no weekly class rows for cohort', { userId, cohortId });
      return;
    }

    // Collect all referenced class codes to resolve display names in one query.
    const codes = new Set<string>();
    for (const r of rows) {
      [
        pickClass(r.breakfast_primary_class, r.breakfast_secondary_class),
        pickClass(r.lunch_primary_class, r.lunch_secondary_class),
        pickClass(r.snack_primary_class, r.snack_secondary_class),
        pickClass(r.dinner_primary_class, r.dinner_secondary_class),
      ].forEach((c) => { if (c) codes.add(c); });
    }

    const { data: classRows, error: classErr } = await supabaseRE
      .from('re_meal_classes')
      .select('meal_class_code, class_name')
      .in('meal_class_code', [...codes]);
    if (classErr) throw classErr;
    const displayMap = buildDisplayMap((classRows ?? []) as MealClassRow[]);

    const weekStart = getWeekStartMondayIST();
    const upsertRows = rows.map((r) => {
      const bf = pickClass(r.breakfast_primary_class, r.breakfast_secondary_class);
      const ln = pickClass(r.lunch_primary_class, r.lunch_secondary_class);
      const sn = pickClass(r.snack_primary_class, r.snack_secondary_class);
      const dn = pickClass(r.dinner_primary_class, r.dinner_secondary_class);
      return {
        profile_id: userId,
        cohort_id: cohortId,
        plan_week_start: weekStart,
        day_of_week: r.day_of_week,
        weekday_weekend: r.weekday_weekend,
        breakfast_class: bf,
        lunch_class: ln,
        snack_class: sn,
        dinner_class: dn,
        breakfast_display: bf ? (displayMap.get(bf) ?? deriveMealClassDisplayName(bf)) : null,
        lunch_display: ln ? (displayMap.get(ln) ?? deriveMealClassDisplayName(ln)) : null,
        snack_display: sn ? (displayMap.get(sn) ?? deriveMealClassDisplayName(sn)) : null,
        dinner_display: dn ? (displayMap.get(dn) ?? deriveMealClassDisplayName(dn)) : null,
        city_overlay_applied: cityOverlayApplied,
        engine_version: ENGINE_VERSION,
      };
    });

    const { error: upsertErr } = await supabaseRE
      .from('re_user_weekly_plans')
      .upsert(upsertRows, { onConflict: 'profile_id,plan_week_start,day_of_week' });
    if (upsertErr) throw upsertErr;

    Logger.info('RE_PLAN', 'Weekly plan generated', { userId, cohortId, days: upsertRows.length, weekStart });

    // BUILD-05: generate member-specific add-on plan immediately after primary plan
    await generateUserAddonPlan(userId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('RE_PLAN', 'generateUserWeeklyPlan failed', { error: message, userId });
    throw err;
  }
}

interface UserWeeklyPlanRow {
  day_of_week: string;
  weekday_weekend: 'Weekday' | 'Weekend';
  cohort_id: string | null;
  breakfast_class: string | null;
  lunch_class: string | null;
  snack_class: string | null;
  dinner_class: string | null;
  breakfast_display: string | null;
  lunch_display: string | null;
  snack_display: string | null;
  dinner_display: string | null;
  engine_version: string;
}

function rowToRef(code: string | null, display: string | null): REMealClassRef | null {
  if (!code) return null;
  return { classCode: code, display: display ?? deriveMealClassDisplayName(code) };
}

/**
 * @summary Fetch the current-week class-first plan for a user.
 *
 * @param {string} userId - Supabase auth UID (== profiles.id).
 * @returns {Promise<REWeeklyPlan | null>} The plan, or null if none exists.
 *
 * @calledBy app/(tabs)/index.tsx — Home screen for RE users.
 */
export async function fetchUserWeeklyPlan(userId: string): Promise<REWeeklyPlan | null> {
  try {
    const weekStart = getWeekStartMondayIST();
    const { data, error } = await supabaseRE
      .from('re_user_weekly_plans')
      .select(
        'day_of_week, weekday_weekend, cohort_id, engine_version, '
        + 'breakfast_class, lunch_class, snack_class, dinner_class, '
        + 'breakfast_display, lunch_display, snack_display, dinner_display',
      )
      .eq('profile_id', userId)
      .eq('plan_week_start', weekStart);
    if (error) throw error;

    const rows = (data ?? []) as unknown as UserWeeklyPlanRow[];
    if (rows.length === 0) return null;

    const order = new Map<string, number>(DAYS_OF_WEEK.map((d, i) => [d, i]));
    rows.sort((a, b) => (order.get(a.day_of_week) ?? 99) - (order.get(b.day_of_week) ?? 99));

    const days: REDayPlan[] = rows.map((r) => ({
      dayOfWeek: r.day_of_week,
      weekdayWeekend: r.weekday_weekend,
      breakfast: rowToRef(r.breakfast_class, r.breakfast_display),
      lunch: rowToRef(r.lunch_class, r.lunch_display),
      snack: rowToRef(r.snack_class, r.snack_display),
      dinner: rowToRef(r.dinner_class, r.dinner_display),
    }));

    return {
      profileId: userId,
      cohortId: rows[0].cohort_id,
      planWeekStart: weekStart,
      days,
      engineVersion: rows[0].engine_version,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('RE_PLAN', 'fetchUserWeeklyPlan failed', { error: message, userId });
    return null;
  }
}
