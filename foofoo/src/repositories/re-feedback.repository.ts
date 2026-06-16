import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import type { REFeedbackSignal, REDishAffinityMap, REClassAffinityMap } from '../types';

// ── Signal weights (DOC-19 history_modifier range: -0.30 to +0.40) ────────────

/**
 * Pre-computed weight for each signal type.
 * NEVER and NEVER_REMOVE are state changes, not score additions.
 */
export const RE_SIGNAL_WEIGHTS: Record<REFeedbackSignal, number> = {
  LOCK:             +0.40,
  SEARCH_ADD_DISH:  +0.40,  // DOC-21 signal 9: strong positive + overrides repeat guard
  ADD_TO_GROCERY:   +0.35,
  ACCEPT:           +0.25,
  TAP_RECIPE:       +0.15,
  VIEW:             +0.05,
  SWIPE_PAST:       -0.15,
  NOT_TODAY:        -0.30,
  NEVER:            0,      // state change → is_never = true
  NEVER_REMOVE:     0,      // state change → is_never = false
};

/**
 * Class-level affinity delta from a dish signal.
 * Only positive and mild-reject signals propagate to class level.
 */
const CLASS_SIGNAL_WEIGHTS: Partial<Record<REFeedbackSignal, number>> = {
  LOCK:            +0.20,
  SEARCH_ADD_DISH: +0.20,  // same class boost as LOCK — user actively sought this class
  ACCEPT:          +0.10,
  VIEW:            +0.02,
  SWIPE_PAST:      -0.05,
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
export function computeVarietyPenalty(
  lastSeenDate: string | null,
  today: string,
  repeatPreferred: boolean = false,
): number {
  // Seq 12: users who have locked this dish 3+ times get no variety penalty
  if (repeatPreferred) return 0;
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
  repeat_preferred: boolean;
}

interface ClassAffinityRow {
  meal_class_code: string;
  affinity_score: number;
  signal_count?: number;
  high_complexity_accepts?: number;
  high_complexity_rejects?: number;
}

interface DnaVectorRow {
  dna_tag: string;
  affinity_score: number;
  signal_count: number;
}

interface ClassFamilyAffinityRow {
  class_family_code: string;
  affinity_score: number;
  signal_count: number;
}

/** Weights for Food DNA vector updates (positive signals boost tags, negative ones reduce). */
const DNA_SIGNAL_WEIGHT: Partial<Record<REFeedbackSignal, number>> = {
  LOCK:             +0.30,
  SEARCH_ADD_DISH:  +0.30,
  ACCEPT:           +0.20,
  ADD_TO_GROCERY:   +0.15,
  TAP_RECIPE:       +0.05,
  SWIPE_PAST:       -0.10,
  NOT_TODAY:        -0.15,
};

/** Weights for class family (cuisine drift) affinity updates. */
const CLASS_FAMILY_SIGNAL_WEIGHT: Partial<Record<REFeedbackSignal, number>> = {
  LOCK:             +0.20,
  SEARCH_ADD_DISH:  +0.20,
  ACCEPT:           +0.10,
  SWIPE_PAST:       -0.08,
  NOT_TODAY:        -0.05,
};

/** Clamp Food DNA affinity to [-1, 1]. */
function clampDnaScore(n: number): number {
  return Math.max(-1, Math.min(1, parseFloat(n.toFixed(3))));
}

/** Clamp class family affinity to [-0.30, +0.35] (same range as class affinity). */
function clampFamilyScore(n: number): number {
  return Math.max(-0.30, Math.min(+0.35, n));
}

// ── Operations ────────────────────────────────────────────────────────────────

/**
 * @summary Record a user feedback event and update all materialized affinity tables.
 *
 * @description
 *   1. Appends a row to re_user_feedback (raw event log).
 *   2. Upserts re_user_dish_affinity (score, counts, is_never, not_today_until, repeat_preferred).
 *   3. Upserts re_user_class_affinity (class score, cook complexity tolerance — Seq 14).
 *   4. Upserts re_user_food_dna_vector per tag from foodDnaTags (Seq 11).
 *   5. Upserts re_user_class_family_affinity for cuisine drift (Seq 13).
 *
 * @param {string}           userId         - Supabase auth UID.
 * @param {string}           dishOptionId   - From re_class_dish_options.
 * @param {string}           mealClassCode  - Class the dish belongs to.
 * @param {REFeedbackSignal} signal         - The feedback event type.
 * @param {string|null}      [foodDnaTags]  - re_meal_classes.food_dna_tags (comma-separated). Pass for DNA vector update (Seq 11).
 * @param {string|null}      [classFamilyCode] - re_meal_classes.class_family_code. Pass for cuisine drift (Seq 13).
 * @param {string|null}      [cookComplexity] - re_meal_classes.cook_complexity. Pass for cook tolerance (Seq 14).
 */
export async function recordFeedback(
  userId: string,
  dishOptionId: string,
  mealClassCode: string,
  signal: REFeedbackSignal,
  foodDnaTags: string | null = null,
  classFamilyCode: string | null = null,
  cookComplexity: string | null = null,
): Promise<void> {
  const weight = RE_SIGNAL_WEIGHTS[signal];
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

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
      : signal === 'NEVER_REMOVE' || signal === 'SEARCH_ADD_DISH'
        ? null
        : undefined;
    // Seq 12: mark repeat_preferred once user has locked this dish 3+ times
    const repeatPreferred = newLocks >= 3;

    const dishRow: Record<string, unknown> = {
      profile_id: userId,
      dish_option_id: dishOptionId,
      meal_class_code: mealClassCode,
      affinity_score: newAffinity,
      lock_count: newLocks,
      accept_count: newAccepts,
      reject_count: newRejects,
      is_never: isNever,
      repeat_preferred: repeatPreferred,
      last_updated: now,
    };
    if (notTodayUntil !== undefined) dishRow.not_today_until = notTodayUntil;

    const { error: dishErr } = await supabaseRE
      .from('re_user_dish_affinity')
      .upsert(dishRow, { onConflict: 'profile_id,dish_option_id' });
    if (dishErr) throw dishErr;

    // 3. Update class affinity + cook complexity tolerance (Seq 14)
    const classDelta = CLASS_SIGNAL_WEIGHTS[signal];
    if (classDelta !== undefined) {
      const { data: existingClass, error: classFetchErr } = await supabaseRE
        .from('re_user_class_affinity')
        .select('affinity_score, signal_count, high_complexity_accepts, high_complexity_rejects')
        .eq('profile_id', userId)
        .eq('meal_class_code', mealClassCode)
        .maybeSingle();
      if (classFetchErr) throw classFetchErr;

      const prevClass = (existingClass as ClassAffinityRow | null);
      const newClassAffinity = Math.max(-0.30, Math.min(+0.35,
        (prevClass?.affinity_score ?? 0) + classDelta,
      ));

      // Seq 14: track how often user accepts/rejects high-complexity dishes
      const isHighComplexity = (cookComplexity ?? '').toLowerCase() === 'high';
      const isPositiveSignal = classDelta > 0;
      const newHighAccepts = (prevClass?.high_complexity_accepts ?? 0)
        + (isHighComplexity && isPositiveSignal ? 1 : 0);
      const newHighRejects = (prevClass?.high_complexity_rejects ?? 0)
        + (isHighComplexity && !isPositiveSignal ? 1 : 0);

      const { error: classErr } = await supabaseRE
        .from('re_user_class_affinity')
        .upsert({
          profile_id: userId,
          meal_class_code: mealClassCode,
          affinity_score: newClassAffinity,
          signal_count: (prevClass?.signal_count ?? 0) + 1,
          high_complexity_accepts: newHighAccepts,
          high_complexity_rejects: newHighRejects,
          last_updated: now,
        }, { onConflict: 'profile_id,meal_class_code' });
      if (classErr) throw classErr;
    }

    // 4. Seq 11: update Food DNA preference vector (fire-and-forget on error — non-critical)
    const dnaDelta = DNA_SIGNAL_WEIGHT[signal];
    if (dnaDelta !== undefined && foodDnaTags) {
      const tags = foodDnaTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (tags.length > 0) {
        const { data: existingDna } = await supabaseRE
          .from('re_user_food_dna_vector')
          .select('dna_tag, affinity_score, signal_count')
          .eq('profile_id', userId)
          .in('dna_tag', tags);
        const dnaMap = new Map<string, DnaVectorRow>(
          ((existingDna ?? []) as DnaVectorRow[]).map((r) => [r.dna_tag, r]),
        );
        const dnaUpserts = tags.map((tag) => {
          const prev = dnaMap.get(tag);
          return {
            profile_id: userId,
            dna_tag: tag,
            affinity_score: clampDnaScore((prev?.affinity_score ?? 0) + dnaDelta),
            signal_count: (prev?.signal_count ?? 0) + 1,
            last_updated: now,
          };
        });
        await supabaseRE
          .from('re_user_food_dna_vector')
          .upsert(dnaUpserts, { onConflict: 'profile_id,dna_tag' });
      }
    }

    // 5. Seq 13: update class family affinity (cuisine drift)
    const familyDelta = CLASS_FAMILY_SIGNAL_WEIGHT[signal];
    if (familyDelta !== undefined && classFamilyCode) {
      const { data: existingFamily } = await supabaseRE
        .from('re_user_class_family_affinity')
        .select('affinity_score, signal_count')
        .eq('profile_id', userId)
        .eq('class_family_code', classFamilyCode)
        .maybeSingle();
      const prevFamily = existingFamily as ClassFamilyAffinityRow | null;
      await supabaseRE
        .from('re_user_class_family_affinity')
        .upsert({
          profile_id: userId,
          class_family_code: classFamilyCode,
          affinity_score: clampFamilyScore((prevFamily?.affinity_score ?? 0) + familyDelta),
          signal_count: (prevFamily?.signal_count ?? 0) + 1,
          last_updated: now,
        }, { onConflict: 'profile_id,class_family_code' });
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
        repeatPreferred: row.repeat_preferred ?? false,
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

/**
 * @summary Fetch the user's Food DNA preference vector (Seq 11).
 * @returns Map of dna_tag → affinity_score (clamped -1..1). Empty on error.
 */
export async function fetchFoodDnaVector(userId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabaseRE
      .from('re_user_food_dna_vector')
      .select('dna_tag, affinity_score')
      .eq('profile_id', userId);
    if (error) throw error;
    const map: Record<string, number> = {};
    for (const row of (data ?? []) as DnaVectorRow[]) map[row.dna_tag] = row.affinity_score;
    return map;
  } catch (err: unknown) {
    Logger.error('RE_FEEDBACK', 'fetchFoodDnaVector failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    return {};
  }
}

/**
 * @summary Fetch class family affinity scores for cuisine drift (Seq 13).
 * @returns Map of class_family_code → affinity_score. Empty on error.
 */
export async function fetchClassFamilyAffinities(userId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabaseRE
      .from('re_user_class_family_affinity')
      .select('class_family_code, affinity_score')
      .eq('profile_id', userId);
    if (error) throw error;
    const map: Record<string, number> = {};
    for (const row of (data ?? []) as ClassFamilyAffinityRow[]) map[row.class_family_code] = row.affinity_score;
    return map;
  } catch (err: unknown) {
    Logger.error('RE_FEEDBACK', 'fetchClassFamilyAffinities failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    return {};
  }
}

/**
 * @summary Compute the effective cook tolerance modifier from behavioral history (Seq 14).
 * @description Returns a float in [-0.15, +0.15] to add to the base cookCapabilityScore.
 *   Positive = user has repeatedly accepted high-complexity dishes → relax the penalty.
 *   Negative = user has repeatedly rejected them → strengthen the penalty.
 */
export async function fetchCookToleranceModifier(userId: string, mealClassCode: string): Promise<number> {
  try {
    const { data, error } = await supabaseRE
      .from('re_user_class_affinity')
      .select('high_complexity_accepts, high_complexity_rejects')
      .eq('profile_id', userId)
      .eq('meal_class_code', mealClassCode)
      .maybeSingle();
    if (error) throw error;
    if (!data) return 0;
    const row = data as { high_complexity_accepts: number; high_complexity_rejects: number };
    const net = (row.high_complexity_accepts ?? 0) - (row.high_complexity_rejects ?? 0);
    return Math.max(-0.15, Math.min(+0.15, net * 0.03));
  } catch (err: unknown) {
    Logger.error('RE_FEEDBACK', 'fetchCookToleranceModifier failed', {
      error: err instanceof Error ? err.message : String(err), userId,
    });
    return 0;
  }
}
