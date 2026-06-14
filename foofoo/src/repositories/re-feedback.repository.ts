import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import type { REFeedbackSignal, REDishAffinityMap, REClassAffinityMap } from '../types';

// ── Signal weights (DOC-19 history_modifier range: -0.30 to +0.40) ────────────

/**
 * Pre-computed weight for each signal type.
 * NEVER and NEVER_REMOVE are state changes, not score additions.
 */
export const RE_SIGNAL_WEIGHTS: Record<REFeedbackSignal, number> = {
  LOCK:           +0.40,
  ADD_TO_GROCERY: +0.35,
  ACCEPT:         +0.25,
  TAP_RECIPE:     +0.15,
  VIEW:           +0.05,
  SWIPE_PAST:     -0.15,
  NOT_TODAY:      -0.30,
  NEVER:          0,        // state change → is_never = true
  NEVER_REMOVE:   0,        // state change → is_never = false
};

/**
 * Class-level affinity delta from a dish signal.
 * Only positive and mild-reject signals propagate to class level.
 */
const CLASS_SIGNAL_WEIGHTS: Partial<Record<REFeedbackSignal, number>> = {
  LOCK:       +0.20,
  ACCEPT:     +0.10,
  VIEW:       +0.02,
  SWIPE_PAST: -0.05,
};

/** Days a NOT_TODAY cooldown lasts. */
const NOT_TODAY_COOLDOWN_DAYS = 3;

/** Variety penalty applied when a dish was seen (accepted/locked) within this many days. */
export const VARIETY_WINDOW_DAYS = 3;

/** Score deduction for a dish seen within the variety window. */
export const VARIETY_PENALTY = -0.30;

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

/**
 * @summary Compute the history modifier for scoring from a stored affinity score.
 *
 * @description Clamps the raw stored affinity_score to the DOC-19 range of
 *   -0.30 to +0.40 so historical events don't dominate the total score.
 *
 * @param {number} rawAffinity - Stored affinity_score from re_user_dish_affinity.
 * @returns {number} Clamped history modifier.
 */
export function clampHistoryModifier(rawAffinity: number): number {
  return Math.max(-0.30, Math.min(+0.40, rawAffinity));
}

/**
 * @summary Compute the variety penalty for a dish shown recently.
 *
 * @description Returns VARIETY_PENALTY (-0.30) if the dish was seen within
 *   VARIETY_WINDOW_DAYS, otherwise 0.
 *
 * @param {string | null} lastSeenDate - ISO date string of last accept/lock, or null.
 * @param {string}        today        - ISO date string for today (YYYY-MM-DD).
 * @returns {number} 0 or -0.30.
 */
export function computeVarietyPenalty(lastSeenDate: string | null, today: string): number {
  if (!lastSeenDate) return 0;
  const last = new Date(lastSeenDate).getTime();
  const now = new Date(today).getTime();
  const daysDiff = (now - last) / (1000 * 60 * 60 * 24);
  return daysDiff <= VARIETY_WINDOW_DAYS ? VARIETY_PENALTY : 0;
}

/**
 * @summary Compute the NOT_TODAY expiry date from a signal date.
 *
 * @param {string} signalDate - ISO date the NOT_TODAY was recorded (YYYY-MM-DD).
 * @returns {string} ISO date when cooldown expires.
 */
export function computeNotTodayExpiry(signalDate: string): string {
  const d = new Date(signalDate);
  d.setDate(d.getDate() + NOT_TODAY_COOLDOWN_DAYS);
  return d.toISOString().slice(0, 10);
}

/**
 * @summary Check if a dish is currently on a NOT_TODAY cooldown.
 *
 * @param {string | null} notTodayUntil - ISO date from re_user_dish_affinity.
 * @param {string}        today          - ISO date for today.
 * @returns {boolean} true if the dish should be excluded today.
 */
export function isOnCooldown(notTodayUntil: string | null, today: string): boolean {
  if (!notTodayUntil) return false;
  return notTodayUntil >= today;
}

// ── Internal DB types ─────────────────────────────────────────────────────────

interface DishAffinityRow {
  dish_option_id: string;
  affinity_score: number;
  lock_count: number;
  accept_count: number;
  reject_count: number;
  is_never: boolean;
  not_today_until: string | null;
}

interface ClassAffinityRow {
  meal_class_code: string;
  affinity_score: number;
  signal_count?: number;
}

// ── Operations ────────────────────────────────────────────────────────────────

/**
 * @summary Record a user feedback event and update materialized affinity tables.
 *
 * @description
 *   1. Appends a row to re_user_feedback (raw event log).
 *   2. Upserts re_user_dish_affinity:
 *      - Updates affinity_score (cumulative weighted sum).
 *      - Updates lock/accept/reject counts.
 *      - Sets is_never = true for NEVER, false for NEVER_REMOVE.
 *      - Sets not_today_until for NOT_TODAY, clears it for NEVER_REMOVE.
 *   3. Upserts re_user_class_affinity for signals that propagate to class level.
 *
 * @param {string}           userId      - Supabase auth UID.
 * @param {string}           dishOptionId - From re_class_dish_options.
 * @param {string}           mealClassCode - Class the dish belongs to.
 * @param {REFeedbackSignal} signal       - The feedback event type.
 * @returns {Promise<void>}
 *
 * @calledBy REDishPick component on user gesture.
 */
export async function recordFeedback(
  userId: string,
  dishOptionId: string,
  mealClassCode: string,
  signal: REFeedbackSignal,
): Promise<void> {
  const weight = RE_SIGNAL_WEIGHTS[signal];
  const today = new Date().toISOString().slice(0, 10);

  try {
    // 1. Append raw event
    const { error: logErr } = await supabaseRE
      .from('re_user_feedback')
      .insert({
        profile_id: userId,
        dish_option_id: dishOptionId,
        meal_class_code: mealClassCode,
        signal_type: signal,
        signal_weight: weight,
        session_date: today,
      });
    if (logErr) throw logErr;

    // 2. Upsert dish affinity
    const { data: existing, error: fetchErr } = await supabaseRE
      .from('re_user_dish_affinity')
      .select('affinity_score, lock_count, accept_count, reject_count, is_never')
      .eq('profile_id', userId)
      .eq('dish_option_id', dishOptionId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    const prev = (existing as DishAffinityRow | null);
    const newAffinity = clampHistoryModifier((prev?.affinity_score ?? 0) + weight);
    const newLocks = (prev?.lock_count ?? 0) + (signal === 'LOCK' ? 1 : 0);
    const newAccepts = (prev?.accept_count ?? 0) + (signal === 'ACCEPT' ? 1 : 0);
    const newRejects = (prev?.reject_count ?? 0) + (signal === 'SWIPE_PAST' ? 1 : 0);
    const isNever = signal === 'NEVER' ? true : signal === 'NEVER_REMOVE' ? false : (prev?.is_never ?? false);
    const notTodayUntil = signal === 'NOT_TODAY'
      ? computeNotTodayExpiry(today)
      : signal === 'NEVER_REMOVE'
        ? null
        : undefined; // undefined = don't touch the column

    const dishRow: Record<string, unknown> = {
      profile_id: userId,
      dish_option_id: dishOptionId,
      meal_class_code: mealClassCode,
      affinity_score: newAffinity,
      lock_count: newLocks,
      accept_count: newAccepts,
      reject_count: newRejects,
      is_never: isNever,
      last_updated: new Date().toISOString(),
    };
    if (notTodayUntil !== undefined) dishRow.not_today_until = notTodayUntil;

    const { error: dishErr } = await supabaseRE
      .from('re_user_dish_affinity')
      .upsert(dishRow, { onConflict: 'profile_id,dish_option_id' });
    if (dishErr) throw dishErr;

    // 3. Update class affinity (only for signals that have a class-level delta)
    const classDelta = CLASS_SIGNAL_WEIGHTS[signal];
    if (classDelta !== undefined) {
      const { data: existingClass, error: classFetchErr } = await supabaseRE
        .from('re_user_class_affinity')
        .select('affinity_score, signal_count')
        .eq('profile_id', userId)
        .eq('meal_class_code', mealClassCode)
        .maybeSingle();
      if (classFetchErr) throw classFetchErr;

      const prevClass = (existingClass as ClassAffinityRow | null);
      const newClassAffinity = Math.max(-0.30, Math.min(+0.35,
        (prevClass?.affinity_score ?? 0) + classDelta,
      ));

      const { error: classErr } = await supabaseRE
        .from('re_user_class_affinity')
        .upsert({
          profile_id: userId,
          meal_class_code: mealClassCode,
          affinity_score: newClassAffinity,
          signal_count: (prevClass?.signal_count ?? 0) + 1,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'profile_id,meal_class_code' });
      if (classErr) throw classErr;
    }

    Logger.info('RE_FEEDBACK', 'Feedback recorded', {
      userId, dishOptionId, mealClassCode, signal, weight,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('RE_FEEDBACK', 'recordFeedback failed', {
      error: message, userId, dishOptionId, signal,
    });
    throw err;
  }
}

/**
 * @summary Batch-fetch dish affinity states for a set of dish option IDs.
 *
 * @description Returns a map of dish_option_id → affinity row for fast scoring
 *   lookup. Missing entries mean the user has no history with that dish.
 *
 * @param {string}   userId       - Supabase auth UID.
 * @param {string[]} dishOptionIds - Dish IDs to look up.
 * @returns {Promise<REDishAffinityMap>}
 *
 * @calledBy fetchTodayDishCandidates in re-dish-expander.repository.ts
 */
export async function fetchDishAffinities(
  userId: string,
  dishOptionIds: string[],
): Promise<REDishAffinityMap> {
  try {
    let query = supabaseRE
      .from('re_user_dish_affinity')
      .select(
        'dish_option_id, affinity_score, lock_count, accept_count, '
        + 'reject_count, is_never, not_today_until',
      )
      .eq('profile_id', userId);

    // If specific IDs provided, filter to them; otherwise load all for this user
    if (dishOptionIds.length > 0) {
      query = query.in('dish_option_id', dishOptionIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const map: REDishAffinityMap = {};
    for (const row of (data ?? []) as unknown as DishAffinityRow[]) {
      map[row.dish_option_id] = {
        affinityScore: row.affinity_score,
        lockCount: row.lock_count,
        acceptCount: row.accept_count,
        rejectCount: row.reject_count,
        isNever: row.is_never,
        notTodayUntil: row.not_today_until,
      };
    }
    return map;
  } catch (err: unknown) {
    Logger.error('RE_FEEDBACK', 'fetchDishAffinities failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    return {};
  }
}

/**
 * @summary Batch-fetch class affinity scores for a set of meal class codes.
 *
 * @param {string}   userId      - Supabase auth UID.
 * @param {string[]} classCodes  - Class codes to look up.
 * @returns {Promise<REClassAffinityMap>}
 *
 * @calledBy fetchTodayDishCandidates in re-dish-expander.repository.ts
 */
export async function fetchClassAffinities(
  userId: string,
  classCodes: string[],
): Promise<REClassAffinityMap> {
  if (classCodes.length === 0) return {};
  try {
    const { data, error } = await supabaseRE
      .from('re_user_class_affinity')
      .select('meal_class_code, affinity_score')
      .eq('profile_id', userId)
      .in('meal_class_code', classCodes);
    if (error) throw error;

    const map: REClassAffinityMap = {};
    for (const row of (data ?? []) as ClassAffinityRow[]) {
      map[row.meal_class_code] = row.affinity_score;
    }
    return map;
  } catch (err: unknown) {
    Logger.error('RE_FEEDBACK', 'fetchClassAffinities failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    return {};
  }
}

/**
 * @summary Fetch the last-seen dates for a set of dishes (for variety penalty).
 *
 * @description Returns a map of dish_option_id → most recent session_date where
 *   the signal was LOCK or ACCEPT (i.e., the dish was actually consumed/chosen).
 *
 * @param {string}   userId        - Supabase auth UID.
 * @param {string[]} dishOptionIds - Dish IDs to check.
 * @returns {Promise<Record<string, string>>} dish_option_id → ISO date string.
 *
 * @calledBy fetchTodayDishCandidates in re-dish-expander.repository.ts
 */
export async function fetchRecentAcceptDates(
  userId: string,
  dishOptionIds: string[],
): Promise<Record<string, string>> {
  try {
    let query = supabaseRE
      .from('re_user_feedback')
      .select('dish_option_id, session_date')
      .eq('profile_id', userId)
      .in('signal_type', ['LOCK', 'ACCEPT'])
      .order('session_date', { ascending: false });

    if (dishOptionIds.length > 0) {
      query = query.in('dish_option_id', dishOptionIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const map: Record<string, string> = {};
    for (const row of (data ?? []) as { dish_option_id: string; session_date: string }[]) {
      if (!map[row.dish_option_id]) {
        map[row.dish_option_id] = row.session_date;
      }
    }
    return map;
  } catch (err: unknown) {
    Logger.error('RE_FEEDBACK', 'fetchRecentAcceptDates failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    return {};
  }
}
