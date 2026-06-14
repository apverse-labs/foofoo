import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import { getWeekStartMondayIST, deriveMealClassDisplayName } from './re-plan.repository';
import {
  STATE_REGION_ARCHETYPE,
  REGION_ARCHETYPE_KEYWORDS,
  PAN_INDIA_KEYWORDS,
} from '../config/re-region-constants';
import {
  fetchDishAffinities,
  fetchRecentAcceptDates,
  fetchClassAffinities,
  clampHistoryModifier,
  computeVarietyPenalty,
  isOnCooldown,
} from './re-feedback.repository';
import type {
  REDayDishCandidates,
  REDishAffinityMap,
  REDishCandidate,
  RESlotDishCandidates,
} from '../types';

const TOP_DISHES_PER_SLOT = 5;

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

/**
 * @summary Parse the state_id prefix from a cohort_id string.
 *
 * @description Cohort IDs follow the format `{stateId}_{tierCode}_{personaId}`,
 *   e.g. "S14_T1_P01". Extracts the first segment.
 *
 * @param {string} cohortId - Full cohort ID from re_user_household_profiles.
 * @returns {string} State ID (e.g. "S14"), or empty string if not parseable.
 */
export function parseStateIdFromCohort(cohortId: string): string {
  return cohortId.split('_')[0] ?? '';
}

/**
 * @summary Compute the regional affinity score for a dish.
 *
 * @description Matches the user's home region (via region_archetype keywords)
 *   against the dish's region_relevance text. Returns:
 *   - +0.20 if a region-specific keyword matches
 *   - +0.05 for pan-India / Urban India / Tier-1 dishes
 *   - 0.00 if no match (dish may still appear but ranked lower)
 *
 * @param {string} regionRelevance - Free-text region tag from re_class_dish_options.
 * @param {string} regionArchetype - Canonical region archetype for the user's home state.
 * @returns {number} Affinity score contribution (0 to 0.20).
 */
export function regionAffinityScore(regionRelevance: string, regionArchetype: string): number {
  const lower = regionRelevance.toLowerCase();
  // Region-specific match takes priority over pan-India boost
  const keywords = REGION_ARCHETYPE_KEYWORDS[regionArchetype] ?? [];
  if (keywords.some((kw) => lower.includes(kw))) return 0.20;
  if (PAN_INDIA_KEYWORDS.some((kw) => lower.includes(kw))) return 0.05;
  return 0;
}

/**
 * @summary Determine whether a dish's diet_type is compatible with the user's food preference.
 *
 * @description Hard filter — returns false to exclude the dish entirely.
 *
 * Mapping (RE seed data diet_type values: 'veg', 'nonveg', 'egg', 'mixed'):
 *   - veg / vegan / jain → allow 'veg' only
 *   - egg                → allow 'veg', 'egg', 'mixed'
 *   - non_veg / nonveg   → allow everything
 *
 * @param {string} dishDietType  - From re_class_dish_options.diet_type.
 * @param {string} userFoodPref  - From profiles.food_pref.
 * @returns {boolean} true if the dish is safe to show to this user.
 */
export function isDietCompatible(dishDietType: string, userFoodPref: string): boolean {
  const dish = dishDietType.toLowerCase();
  const pref = userFoodPref.toLowerCase().replace(/-/g, '_');

  if (pref === 'veg' || pref === 'vegan' || pref === 'jain') {
    return dish === 'veg';
  }
  if (pref === 'egg') {
    return dish === 'veg' || dish === 'egg' || dish === 'mixed';
  }
  // non_veg / nonveg — allow all
  return true;
}

/**
 * @summary Compute the full RE dish score including history and variety modifiers.
 *
 * @description Full formula (DOC-19):
 *   score = base(1.0) + regionAffinity(0..0.20) + daySlotFit(0..0.05)
 *           + historyModifier(-0.30..+0.40) + varietyPenalty(-0.30..0)
 *           + random(0..0.10)
 *
 * @param {string}  regionRelevance  - Dish's region_relevance text.
 * @param {string}  regionArchetype  - User's home region archetype.
 * @param {boolean} isWeekend        - Whether the day is a weekend.
 * @param {number}  historyModifier  - Clamped affinity score from re_user_dish_affinity.
 * @param {number}  varietyPenalty   - 0 or -0.30 from computeVarietyPenalty.
 * @param {number}  [classAffinity]  - Behavioral class-affinity score (DOC-19 class_affinity, clamped -0.30..+0.35).
 * @param {number}  [seed]           - Optional deterministic random (for tests).
 * @returns {number} Final score (higher is better).
 */
export function computeDishScore(
  regionRelevance: string,
  regionArchetype: string,
  isWeekend: boolean,
  historyModifier: number = 0,
  varietyPenalty: number = 0,
  classAffinity: number = 0,
  seed?: number,
): number {
  const base = 1.0;
  const regionScore = regionAffinityScore(regionRelevance, regionArchetype);

  const lowerRegion = regionRelevance.toLowerCase();
  const daySlotBoost = isWeekend && (lowerRegion.includes('weekend') || lowerRegion.includes('festive'))
    ? 0.05
    : 0.0;

  // DOC-19 class_affinity: behavioral preference for the meal class (from swipes/locks).
  const classScore = Math.max(-0.30, Math.min(+0.35, classAffinity));

  const random = seed !== undefined ? seed : Math.random() * 0.10;
  return base + regionScore + daySlotBoost + classScore + historyModifier + varietyPenalty + random;
}

// ── Internal DB types ─────────────────────────────────────────────────────────

interface ClassDishRow {
  dish_option_id: string;
  dish_name: string;
  diet_type: string;
  region_relevance: string;
}

interface UserContextRow {
  cohort_id: string | null;
  food_pref: string | null;
  weekday_weekend: string | null;
  breakfast_class: string | null;
  lunch_class: string | null;
  snack_class: string | null;
  dinner_class: string | null;
  breakfast_display: string | null;
  lunch_display: string | null;
  snack_display: string | null;
  dinner_display: string | null;
}

// ── Operations ────────────────────────────────────────────────────────────────

/**
 * @summary Expand a meal class code into a ranked dish candidate list.
 *
 * @description Loads all dishes for the given meal class from re_class_dish_options,
 *   applies the diet hard filter, scores each dish (RE_V1 formula), sorts
 *   descending, and returns the top N candidates.
 *
 * @param {string}  classCode       - Meal class code (e.g. "BF_STUFFED_FLATBREAD").
 * @param {string}  classDisplay    - Human-readable class name for the result.
 * @param {string}  userFoodPref    - User's food_pref for hard filter.
 * @param {string}  regionArchetype - User's home region archetype for scoring.
 * @param {boolean} isWeekend       - Whether the target day is a weekend.
 * @param {number}  [topN]          - Max dishes to return (default 5).
 * @returns {Promise<RESlotDishCandidates>}
 *
 * @calledBy fetchTodayDishCandidates
 */
export async function expandClassToDishes(
  classCode: string,
  classDisplay: string,
  userFoodPref: string,
  regionArchetype: string,
  isWeekend: boolean,
  affinities: REDishAffinityMap = {},
  recentDates: Record<string, string> = {},
  today: string = new Date().toISOString().slice(0, 10),
  classAffinity: number = 0,
  topN: number = TOP_DISHES_PER_SLOT,
): Promise<RESlotDishCandidates> {
  const { data, error } = await supabaseRE
    .from('re_class_dish_options')
    .select('dish_option_id, dish_name, diet_type, region_relevance')
    .eq('meal_class_code', classCode);
  if (error) throw error;

  const rows = (data ?? []) as unknown as ClassDishRow[];

  const candidates: REDishCandidate[] = rows
    .filter((r) => {
      if (!isDietCompatible(r.diet_type, userFoodPref)) return false;
      const aff = affinities[r.dish_option_id];
      if (aff?.isNever) return false;
      if (isOnCooldown(aff?.notTodayUntil ?? null, today)) return false;
      return true;
    })
    .map((r) => {
      const aff = affinities[r.dish_option_id];
      const history = clampHistoryModifier(aff?.affinityScore ?? 0);
      const variety = computeVarietyPenalty(recentDates[r.dish_option_id] ?? null, today);
      return {
        dishOptionId: r.dish_option_id,
        dishName: r.dish_name,
        dietType: r.diet_type,
        regionRelevance: r.region_relevance,
        score: computeDishScore(r.region_relevance, regionArchetype, isWeekend, history, variety, classAffinity),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return { classCode, classDisplay, topDishes: candidates };
}

/**
 * @summary Fetch and rank dish candidates for today's meal slots.
 *
 * @description
 *   1. Loads today's class codes from re_user_weekly_plans.
 *   2. Loads the user's food_pref from profiles.
 *   3. Derives the home region archetype from the cohort_id prefix.
 *   4. Expands each non-null class code via expandClassToDishes.
 *   5. Returns a REDayDishCandidates object for the UI.
 *
 *   Returns an empty-slot result if no plan exists for the user yet.
 *
 * @param {string} userId - Supabase auth UID.
 * @returns {Promise<REDayDishCandidates>}
 *
 * @calledBy REPlanToday component.
 */
export async function fetchTodayDishCandidates(userId: string): Promise<REDayDishCandidates> {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    timeZone: 'Asia/Kolkata',
  });
  const emptyResult: REDayDishCandidates = {
    dayOfWeek: today,
    breakfast: null,
    lunch: null,
    snack: null,
    dinner: null,
  };

  try {
    const ws = getWeekStartMondayIST();

    // Load today's class codes + weekday/weekend flag
    const { data: planData, error: planErr } = await supabaseRE
      .from('re_user_weekly_plans')
      .select(
        'cohort_id, weekday_weekend, '
        + 'breakfast_class, lunch_class, snack_class, dinner_class, '
        + 'breakfast_display, lunch_display, snack_display, dinner_display',
      )
      .eq('profile_id', userId)
      .eq('plan_week_start', ws)
      .eq('day_of_week', today)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!planData) return emptyResult;

    const plan = planData as unknown as UserContextRow;
    const isWeekend = plan.weekday_weekend === 'Weekend';
    const cohortId = plan.cohort_id ?? '';

    // Load food_pref from profiles
    const { data: profileData, error: profErr } = await supabaseRE
      .from('profiles')
      .select('food_pref')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) throw profErr;

    const foodPref = (profileData as { food_pref: string | null } | null)?.food_pref ?? 'veg';
    const stateId = parseStateIdFromCohort(cohortId);
    const regionArchetype = STATE_REGION_ARCHETYPE[stateId] ?? 'NORTH_WHEAT';

    const SLOTS = [
      { key: 'breakfast', classCode: plan.breakfast_class, display: plan.breakfast_display },
      { key: 'lunch',     classCode: plan.lunch_class,     display: plan.lunch_display },
      { key: 'snack',     classCode: plan.snack_class,     display: plan.snack_display },
      { key: 'dinner',    classCode: plan.dinner_class,    display: plan.dinner_display },
    ] as const;

    // Affinities loaded lazily — empty map if user has no history yet (cold start)
    const todayISO = new Date().toISOString().slice(0, 10);
    const slotClassCodes = SLOTS.map((s) => s.classCode).filter((c): c is string => !!c);
    const [affinityMap, recentDates, classAffinityMap] = await Promise.all([
      fetchDishAffinities(userId, []),
      fetchRecentAcceptDates(userId, []),
      fetchClassAffinities(userId, slotClassCodes),
    ]).catch(() => [{}, {}, {}] as [Record<string, never>, Record<string, never>, Record<string, never>]);

    const results = await Promise.all(
      SLOTS.map(async ({ classCode, display }) => {
        if (!classCode) return null;
        return expandClassToDishes(
          classCode,
          display ?? deriveMealClassDisplayName(classCode),
          foodPref,
          regionArchetype,
          isWeekend,
          affinityMap,
          recentDates,
          todayISO,
          (classAffinityMap as Record<string, number>)[classCode] ?? 0,
        );
      }),
    );

    return {
      dayOfWeek: today,
      breakfast: results[0],
      lunch: results[1],
      snack: results[2],
      dinner: results[3],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('RE_DISH', 'fetchTodayDishCandidates failed', { error: message, userId });
    return emptyResult;
  }
}
