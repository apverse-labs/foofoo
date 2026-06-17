import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import { generateUserAddonPlan } from './re-addon.repository';
import type { REDayPlan, REMealClassRef, REWeeklyPlan } from '../types';

const ENGINE_VERSION = 'classfirst_v1';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const;

// re_weekly_class_plans stores abbreviated day names; re_user_weekly_plans CHECK requires full names.
const DAY_ABBR_TO_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

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
 * @summary Resolve the full weekday name (e.g. "Monday") for an IST calendar date.
 *
 * @description Used to make the Day View's content match the date the user has
 *   navigated to, instead of always reading the real-world "today".
 *
 * @param {string} dateISO - YYYY-MM-DD calendar date.
 * @returns {string} Full weekday name.
 */
export function dayNameFromDateIST(dateISO: string): string {
  return new Date(`${dateISO}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
}


// ── City-overlay blending (DOC-09 / DOC-13) ────────────────────────────────────

export interface OverlayBuckets { BF: string[]; LD: string[]; SN: string[]; DN: string[]; }

/**
 * @summary Bucket a pipe-delimited overlay_meal_classes string by slot prefix.
 *
 * @description DOC-09 city migration overlay classes are prefixed BF_/LD_/SN_/DN_.
 *   Returns class codes grouped by slot so the blend can inject slot-matching classes.
 *
 * @param {string|null} overlayMealClasses - e.g. "BF_X|LD_Y|LD_Z|DN_W".
 * @returns {OverlayBuckets}
 */
export function bucketOverlayClasses(overlayMealClasses: string | null): OverlayBuckets {
  const b: OverlayBuckets = { BF: [], LD: [], SN: [], DN: [] };
  if (!overlayMealClasses) return b;
  for (const raw of overlayMealClasses.split('|')) {
    const code = raw.trim();
    if (!code) continue;
    const pfx = code.slice(0, 3);
    if (pfx === 'BF_') b.BF.push(code);
    else if (pfx === 'LD_') b.LD.push(code);
    else if (pfx === 'SN_') b.SN.push(code);
    else if (pfx === 'DN_') b.DN.push(code);
  }
  return b;
}

/**
 * @summary Choose which weekday slots receive a city-overlay class.
 *
 * @description DOC-09 worked example: a migrated household keeps home-state meals
 *   most of the week and takes current-city lifestyle meals ~`cityWeight` of the time.
 *   We apply this to WEEKDAY lunch/dinner only (breakfast, snack, and weekend-special
 *   stay home-state dominant). Deterministic, evenly-spaced selection — no randomness,
 *   so plans are reproducible (DOC-13 acceptance: deterministic with fixed inputs).
 *
 * @param {number} weekdayCount - number of weekday rows in the plan (typically 5).
 * @param {number} cityWeight   - current_city_lifestyle_weight (0..1).
 * @returns {number[]} sorted, de-duplicated indices (into the weekday list) to overlay.
 */
export function pickOverlaySlots(weekdayCount: number, cityWeight: number): number[] {
  if (weekdayCount <= 0 || cityWeight <= 0) return [];
  const n = Math.min(weekdayCount, Math.round(weekdayCount * cityWeight));
  if (n <= 0) return [];
  const step = weekdayCount / n;
  const picks = new Set<number>();
  for (let i = 0; i < n; i++) picks.add(Math.min(weekdayCount - 1, Math.round(i * step)));
  return [...picks].sort((a, b) => a - b);
}

/**
 * @summary Deterministically pick the i-th overlay class for a slot bucket (with dinner→lunch fallback).
 */
function overlayClassFor(slot: 'LD' | 'DN', buckets: OverlayBuckets, i: number): string | null {
  const pool = slot === 'DN' && buckets.DN.length === 0 ? buckets.LD : buckets[slot];
  if (!pool.length) return null;
  return pool[i % pool.length];
}

// ── DOC-14 variety limits ─────────────────────────────────────────────────────

/** Max times the same primary class may appear per slot across a 7-day plan. */
const VARIETY_LIMITS: Record<'breakfast' | 'lunch' | 'snack' | 'dinner', number> = {
  breakfast: 3,
  lunch: 3,
  snack: 3,
  dinner: 2,
};

/**
 * @summary Enforce DOC-14 class variety limits across a 7-day plan.
 *
 * @description For each slot (breakfast/lunch/snack/dinner), counts how many
 *   times each class code appears. If any class exceeds its limit, the excess
 *   rows are swapped to use their secondary class instead (or left null if no
 *   secondary exists). Operates in-place on the candidate array.
 *
 * @param {CandidateRow[]} candidates - Mutable array; modified in place.
 */
function enforceVarietyLimits(candidates: CandidateRow[]): void {
  const slots = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
  for (const slot of slots) {
    const limit = VARIETY_LIMITS[slot];
    const primaryKey = `${slot}_primary` as const;
    const secondaryKey = `${slot}_secondary` as const;
    const counts = new Map<string, number>();

    for (const row of candidates) {
      const code = row[primaryKey];
      if (!code) continue;
      const n = (counts.get(code) ?? 0) + 1;
      counts.set(code, n);
      if (n > limit) {
        // Swap to secondary for this row; null if secondary also absent
        row[primaryKey] = row[secondaryKey] ?? null;
      }
    }
  }
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
  scheduled_nonveg_slot: string | null;
}

/** Mutable working row used during plan construction before upsert. */
interface CandidateRow {
  day_of_week: string;
  weekday_weekend: string;
  scheduled_nonveg_slot: string | null;
  breakfast_primary: string | null;
  breakfast_secondary: string | null;
  lunch_primary: string | null;
  lunch_secondary: string | null;
  snack_primary: string | null;
  snack_secondary: string | null;
  dinner_primary: string | null;
  dinner_secondary: string | null;
}

interface MealClassRow {
  meal_class_code: string;
  class_name: string | null;
  meal_class_display_name?: string | null;
  cook_complexity?: string | null;
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
      .select('profile_id, cohort_id, city_destination_group, weekday_time_pressure')
      .eq('profile_id', userId)
      .maybeSingle();
    if (profErr) throw profErr;

    const profileRow = profile as {
      cohort_id: string | null;
      city_destination_group: string | null;
      weekday_time_pressure: string | null;
    } | null;

    const cohortId = profileRow?.cohort_id ?? null;
    if (!cohortId) {
      Logger.warn('RE_PLAN', 'generateUserWeeklyPlan: no cohort_id, skipping', { userId });
      return;
    }

    // High weekday_time_pressure → prefer lower-complexity classes on weekdays (DOC-13 step 7)
    const highTimePressure = (profileRow?.weekday_time_pressure ?? '').toLowerCase() === 'high';

    const cityGroup = profileRow?.city_destination_group ?? null;
    const cityOverlayApplied = !!cityGroup && cityGroup !== 'HOME_STATE_TIER1' && cityGroup !== 'HOME_STATE_TIER2';

    const { data: planRows, error: planErr } = await supabaseRE
      .from('re_weekly_class_plans')
      .select(
        'day_of_week, weekday_weekend, '
        + 'breakfast_primary_class, breakfast_secondary_class, '
        + 'lunch_primary_class, lunch_secondary_class, '
        + 'snack_primary_class, snack_secondary_class, '
        + 'dinner_primary_class, dinner_secondary_class, '
        + 'scheduled_nonveg_slot',
      )
      .eq('cohort_id', cohortId);
    if (planErr) throw planErr;

    const rows = (planRows ?? []) as unknown as WeeklyClassPlanRow[];
    if (rows.length === 0) {
      Logger.warn('RE_PLAN', 'generateUserWeeklyPlan: no weekly class rows for cohort', { userId, cohortId });
      return;
    }

    // DOC-09 city-overlay blend: for migrated users, inject current-city lifestyle
    // classes into weekday lunch/dinner at the overlay's lifestyle weight, keeping
    // home-state classes dominant (breakfast/snack/weekend untouched). Deterministic.
    const overlayByDay = new Map<string, { ln?: string; dn?: string }>();
    if (cityOverlayApplied) {
      const stateId = cohortId.split('_')[0];
      const { data: stateRow } = await supabaseRE
        .from('re_states').select('state_ut').eq('state_id', stateId).maybeSingle();
      const stateUt = (stateRow as { state_ut: string } | null)?.state_ut ?? null;
      if (stateUt) {
        const { data: ovRow } = await supabaseRE
          .from('re_city_migration_overlays')
          .select('overlay_meal_classes, current_city_lifestyle_weight')
          .eq('origin_state_ut', stateUt)
          .eq('destination_group_code', cityGroup as string)
          .maybeSingle();
        const ov = ovRow as { overlay_meal_classes: string | null; current_city_lifestyle_weight: number | string | null } | null;
        if (ov?.overlay_meal_classes) {
          const buckets = bucketOverlayClasses(ov.overlay_meal_classes);
          const cityWeight = Number(ov.current_city_lifestyle_weight ?? 0);
          const WEEKDAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          const weekdayRows = rows
            .filter((r) => r.weekday_weekend === 'Weekday')
            .sort((a, b) => WEEKDAY_ORDER.indexOf(a.day_of_week) - WEEKDAY_ORDER.indexOf(b.day_of_week));
          pickOverlaySlots(weekdayRows.length, cityWeight).forEach((idx, i) => {
            const day = weekdayRows[idx]?.day_of_week;
            if (!day) return;
            overlayByDay.set(day, {
              ln: overlayClassFor('LD', buckets, i) ?? undefined,
              dn: overlayClassFor('DN', buckets, i) ?? undefined,
            });
          });
        }
      }
    }

    // Build mutable candidate rows (primary + secondary both retained for variety guard)
    const candidates: CandidateRow[] = rows.map((r) => {
      const ov = overlayByDay.get(r.day_of_week);
      return {
        day_of_week: r.day_of_week,
        weekday_weekend: r.weekday_weekend,
        scheduled_nonveg_slot: r.scheduled_nonveg_slot ?? null,
        breakfast_primary: r.breakfast_primary_class,
        breakfast_secondary: r.breakfast_secondary_class,
        lunch_primary: ov?.ln ?? r.lunch_primary_class,
        lunch_secondary: r.lunch_secondary_class,
        snack_primary: r.snack_primary_class,
        snack_secondary: r.snack_secondary_class,
        dinner_primary: ov?.dn ?? r.dinner_primary_class,
        dinner_secondary: r.dinner_secondary_class,
      };
    });

    // Collect all class codes (primary + secondary) to fetch cook_complexity in one query
    const codes = new Set<string>();
    for (const o of overlayByDay.values()) {
      if (o.ln) codes.add(o.ln);
      if (o.dn) codes.add(o.dn);
    }
    for (const c of candidates) {
      [c.breakfast_primary, c.breakfast_secondary,
       c.lunch_primary, c.lunch_secondary,
       c.snack_primary, c.snack_secondary,
       c.dinner_primary, c.dinner_secondary,
      ].forEach((code) => { if (code) codes.add(code); });
    }

    const { data: classRows, error: classErr } = await supabaseRE
      .from('re_meal_classes')
      .select('meal_class_code, class_name, cook_complexity')
      .in('meal_class_code', [...codes]);
    if (classErr) throw classErr;

    const classData = (classRows ?? []) as MealClassRow[];
    const displayMap = buildDisplayMap(classData);
    const complexityMap = new Map<string, string | null>(
      classData.map((r) => [r.meal_class_code, r.cook_complexity ?? null]),
    );

    // DOC-13 step 7: cook capability — on high-time-pressure weekdays, swap
    // any high-complexity primary class to its secondary (lower complexity) alternative
    if (highTimePressure) {
      for (const c of candidates) {
        if (c.weekday_weekend !== 'Weekday') continue;
        const slots = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
        for (const slot of slots) {
          const primaryKey = `${slot}_primary` as const;
          const secondaryKey = `${slot}_secondary` as const;
          const code = c[primaryKey];
          if (code && complexityMap.get(code) === 'high' && c[secondaryKey]) {
            c[primaryKey] = c[secondaryKey];
          }
        }
      }
    }

    // DOC-14: enforce variety limits — same class max 3× breakfast/lunch/snack, 2× dinner
    enforceVarietyLimits(candidates);

    const weekStart = getWeekStartMondayIST();
    const upsertRows = candidates.map((c) => {
      const bf = c.breakfast_primary;
      const ln = c.lunch_primary;
      const sn = c.snack_primary;
      const dn = c.dinner_primary;
      const fullDayName = DAY_ABBR_TO_FULL[c.day_of_week] ?? c.day_of_week;
      return {
        profile_id: userId,
        cohort_id: cohortId,
        plan_week_start: weekStart,
        day_of_week: fullDayName,
        weekday_weekend: c.weekday_weekend,
        breakfast_class: bf,
        lunch_class: ln,
        snack_class: sn,
        dinner_class: dn,
        breakfast_display: bf ? (displayMap.get(bf) ?? deriveMealClassDisplayName(bf)) : null,
        lunch_display: ln ? (displayMap.get(ln) ?? deriveMealClassDisplayName(ln)) : null,
        snack_display: sn ? (displayMap.get(sn) ?? deriveMealClassDisplayName(sn)) : null,
        dinner_display: dn ? (displayMap.get(dn) ?? deriveMealClassDisplayName(dn)) : null,
        city_overlay_applied: cityOverlayApplied,
        nonveg_scheduled_slot: c.scheduled_nonveg_slot,
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
