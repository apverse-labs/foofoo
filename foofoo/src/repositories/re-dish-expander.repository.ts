import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';
import { getWeekStartMondayIST, deriveMealClassDisplayName, dayNameFromDateIST } from './re-plan.repository';
import {
  STATE_REGION_ARCHETYPE,
  REGION_ARCHETYPE_KEYWORDS,
  PAN_INDIA_KEYWORDS,
} from '../config/re-region-constants';
import {
  fetchDishAffinities,
  fetchRecentAcceptDates,
  fetchClassAffinities,
  fetchFoodDnaVector,
  fetchClassFamilyAffinities,
  clampHistoryModifier,
  computeVarietyPenalty,
  isOnCooldown,
} from './re-feedback.repository';
import type {
  DishScoreBreakdown,
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

// ── City-destination groups treated as metro lifestyle (quick/light/healthy overlay) ──
const METRO_CITY_GROUPS = new Set(['metro', 'metro_tier1', 'tier1', 'urban', 'cosmopolitan']);

/**
 * @summary Compute city lifestyle score (DOC-19 §current city lifestyle, 0..+0.15).
 * @description Metro/Tier-1 city users get a boost for quick, light, modern dishes.
 *   Tier-2/regional city users get a small boost for traditional, home-style dishes.
 */
export function cityLifestyleScore(regionRelevance: string, cityDestinationGroup: string): number {
  const cityGroup = (cityDestinationGroup ?? '').toLowerCase().replace(/[\s-]/g, '_');
  if (!cityGroup) return 0;
  const lower = regionRelevance.toLowerCase();
  const isMetro = METRO_CITY_GROUPS.has(cityGroup) || cityGroup.startsWith('metro') || cityGroup.startsWith('tier1') || cityGroup.startsWith('urban');

  if (isMetro) {
    if (lower.includes('quick') || lower.includes('light') || lower.includes('metro') || lower.includes('modern') || lower.includes('urban')) return 0.15;
    if (lower.includes('pan') || lower.includes('urban india') || lower.includes('healthy')) return 0.10;
    return 0.05;
  }
  // Tier-2 / regional city: mild boost for traditional/home-style
  if (lower.includes('traditional') || lower.includes('home') || lower.includes('regional')) return 0.10;
  return 0.05;
}

// ── Cook dependency groups that indicate low kitchen access ──
const LOW_KITCHEN_ACCESS = new Set(['tiffin_pg_no_kitchen', 'delivery_heavy']);
const HIGH_KITCHEN_SKILL = new Set(['self_cook', 'skilled_cook']);

/**
 * @summary Compute cook capability score (DOC-19 §cook capability, −0.20..+0.10).
 * @description Penalises high-complexity dishes for users with limited kitchen access;
 *   rewards simple dishes for those who prefer quick cooking.
 */
export function cookCapabilityScore(cookComplexity: string | null, cookDependency: string | null): number {
  const complexity = (cookComplexity ?? 'medium').toLowerCase();
  const dependency = (cookDependency ?? '').toLowerCase();
  if (LOW_KITCHEN_ACCESS.has(dependency)) {
    return complexity === 'high' ? -0.20 : complexity === 'medium' ? -0.05 : 0.05;
  }
  if (HIGH_KITCHEN_SKILL.has(dependency)) {
    return complexity === 'high' ? 0.10 : 0.05;
  }
  // cook_needs_instruction / maid_simple — prefer simple
  return complexity === 'high' ? -0.10 : complexity === 'medium' ? 0.00 : 0.05;
}

// ── Food DNA tag keywords that indicate user familiarity / preference ──
const COMFORT_DNA_KEYWORDS = ['comfort', 'familiar', 'regular', 'everyday', 'staple', 'home'];
const LIGHT_DNA_KEYWORDS   = ['light', 'mild', 'simple', 'easy', 'quick'];
const RICH_DNA_KEYWORDS    = ['rich', 'indulgent', 'elaborate', 'heavy', 'festive', 'special'];

/**
 * @summary Compute Food DNA match score (DOC-19 §Food DNA, −0.10..+0.30).
 * @description When userDnaVector is provided (Seq 11), computes a weighted dot-product
 *   of the dish's DNA tags against the user's learned preference vector.
 *   Falls back to class-affinity proxy when the vector is empty (cold start).
 */
export function foodDnaScore(
  foodDnaTags: string | null,
  classAffinity: number,
  userDnaVector: Record<string, number> = {},
): number {
  const tags = (foodDnaTags ?? '').toLowerCase().split(',').map((t) => t.trim()).filter(Boolean);
  if (tags.length === 0) return 0;

  // Seq 11: if user has a learned DNA vector, use it directly
  const vectorKeys = Object.keys(userDnaVector);
  if (vectorKeys.length > 0) {
    let dot = 0;
    let matched = 0;
    for (const tag of tags) {
      const v = userDnaVector[tag];
      if (v !== undefined) { dot += v; matched++; }
    }
    if (matched > 0) {
      // Average over matched tags, scale to -0.10..+0.30
      const avg = dot / matched;
      return Math.max(-0.10, Math.min(+0.30, avg * 0.30));
    }
  }

  // Cold-start fallback: use classAffinity as proxy (original behaviour)
  const isComfort = COMFORT_DNA_KEYWORDS.some((k) => tags.some((t) => t.includes(k)));
  const isLight   = LIGHT_DNA_KEYWORDS.some((k) => tags.some((t) => t.includes(k)));
  const isRich    = RICH_DNA_KEYWORDS.some((k) => tags.some((t) => t.includes(k)));

  if (classAffinity >= 0.3) {
    if (isComfort) return 0.30;
    if (isLight)   return 0.20;
    if (isRich)    return 0.15;
    return 0.10;
  }
  if (classAffinity >= 0) {
    if (isComfort) return 0.10;
    if (isLight)   return 0.05;
    return 0;
  }
  if (isRich) return -0.10;
  return 0;
}

/**
 * @summary Compute the full RE dish score including history and variety modifiers.
 *
 * @description Full formula (DOC-19):
 *   score = base(1.0) + regionAffinity(0..0.20) + daySlotFit(0..0.05)
 *           + classAffinity(-0.30..+0.35) + cityLifestyle(0..+0.15)
 *           + cookCapability(-0.20..+0.10) + foodDna(-0.10..+0.30)
 *           + historyModifier(-0.30..+0.40) + varietyPenalty(-0.30..0)
 *           + random(0..0.10)
 *
 * @param {string}  regionRelevance      - Dish's region_relevance text.
 * @param {string}  regionArchetype      - User's home region archetype.
 * @param {boolean} isWeekend            - Whether the day is a weekend.
 * @param {number}  historyModifier      - Clamped affinity score from re_user_dish_affinity.
 * @param {number}  varietyPenalty       - 0 or -0.30 from computeVarietyPenalty.
 * @param {number}  [classAffinity]      - Behavioral class-affinity score (DOC-19 class_affinity, clamped -0.30..+0.35).
 * @param {number}  [seed]               - Optional deterministic random (for tests).
 * @param {string}  [cityDestGroup]      - User's city_destination_group from household profile.
 * @param {string}  [cookDependency]     - User's cook_dependency from household profile.
 * @param {string}  [cookComplexity]     - Class-level cook_complexity from re_meal_classes.
 * @param {string}  [foodDnaTags]        - Class-level food_dna_tags from re_meal_classes.
 * @param {Record<string,number>} [userDnaVector] - Seq 11 learned DNA preference vector.
 * @param {number}  [classFamilyBoost]   - Seq 13 cuisine drift score for this class's family.
 * @param {number}  [cookToleranceMod]   - Seq 14 behavioural cook tolerance modifier.
 * @returns {DishScoreBreakdown} Full breakdown (total + each component).
 */
export function computeDishScore(
  regionRelevance: string,
  regionArchetype: string,
  isWeekend: boolean,
  historyModifier: number = 0,
  varietyPenalty: number = 0,
  classAffinity: number = 0,
  seed?: number,
  cityDestGroup: string = '',
  cookDependency: string = '',
  cookComplexity: string | null = null,
  foodDnaTags: string | null = null,
  userDnaVector: Record<string, number> = {},
  classFamilyBoost: number = 0,
  cookToleranceMod: number = 0,
): DishScoreBreakdown {
  const base = 1.0;
  const region = regionAffinityScore(regionRelevance, regionArchetype);

  const lowerRegion = regionRelevance.toLowerCase();
  const daySlot = isWeekend && (lowerRegion.includes('weekend') || lowerRegion.includes('festive'))
    ? 0.05
    : 0.0;

  const classScore   = Math.max(-0.30, Math.min(+0.35, classAffinity + classFamilyBoost));
  const cityScore    = cityLifestyleScore(regionRelevance, cityDestGroup);
  const cookScore    = Math.max(-0.20, Math.min(+0.10, cookCapabilityScore(cookComplexity, cookDependency) + cookToleranceMod));
  const dnaScore     = foodDnaScore(foodDnaTags, classAffinity, userDnaVector);
  const random       = seed !== undefined ? seed : Math.random() * 0.10;
  const total        = base + region + daySlot + classScore + cityScore + cookScore + dnaScore + historyModifier + varietyPenalty + random;

  return {
    total, base, region, daySlot,
    classAffinity: classScore,
    cityLifestyle: cityScore,
    cookCapability: cookScore,
    foodDna: dnaScore,
    history: historyModifier,
    variety: varietyPenalty,
    random,
  };
}

/**
 * @summary Format a DishScoreBreakdown into a single readable line for founder reports.
 */
export function formatScoreReport(b: DishScoreBreakdown): string {
  const fmt = (n: number) => (n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
  return (
    `Score ${b.total.toFixed(2)} = `
    + `Base ${b.base.toFixed(2)} `
    + `| Region ${fmt(b.region)} `
    + `| DaySlot ${fmt(b.daySlot)} `
    + `| Class ${fmt(b.classAffinity)} `
    + `| City ${fmt(b.cityLifestyle)} `
    + `| Cook ${fmt(b.cookCapability)} `
    + `| DNA ${fmt(b.foodDna)} `
    + `| History ${fmt(b.history)} `
    + `| Variety ${fmt(b.variety)} `
    + `| Random ${fmt(b.random)}`
  );
}

// ── Internal DB types ─────────────────────────────────────────────────────────

interface ClassDishRow {
  dish_option_id: string;
  dish_name: string;
  diet_type: string;
  region_relevance: string;
  is_jain: boolean | null;
  allergen_ids: number[] | null;
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

interface UserDietRulesRow {
  excluded_ingredients: number[] | null;
}

interface MealClassMetaRow {
  meal_class_code: string;
  cook_complexity: string | null;
  food_dna_tags: string | null;
  class_family_code: string | null;
}

interface UserHouseholdProfileRow {
  city_destination_group: string | null;
  cook_dependency: string | null;
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
  excludedIngredients: number[] = [],
  cityDestGroup: string = '',
  cookDependency: string = '',
  cookComplexity: string | null = null,
  foodDnaTags: string | null = null,
  userDnaVector: Record<string, number> = {},
  classFamilyBoost: number = 0,
  cookToleranceMod: number = 0,
): Promise<RESlotDishCandidates> {
  const isJainUser = userFoodPref.toLowerCase() === 'jain';

  const { data, error } = await supabaseRE
    .from('re_class_dish_options')
    .select('dish_option_id, dish_name, diet_type, region_relevance, is_jain, allergen_ids')
    .eq('meal_class_code', classCode);
  if (error) throw error;

  const rows = (data ?? []) as unknown as ClassDishRow[];

  const candidates: REDishCandidate[] = rows
    .filter((r) => {
      // Hard filter 1: diet compatibility
      if (!isDietCompatible(r.diet_type, userFoodPref)) return false;
      // Hard filter 2: Jain — dish must be Jain-safe (is_jain=true) for Jain users
      // is_jain is null before SCHEMA-RE-013 is applied; treat null as non-Jain (safe default = exclude for Jain users)
      if (isJainUser && r.is_jain !== true) return false;
      // Hard filter 3: allergen exclusion — exclude if dish contains any of user's excluded allergens
      // allergen_ids is null before SCHEMA-RE-013; treat null as no allergens (safe default = include)
      if (excludedIngredients.length > 0 && r.allergen_ids && r.allergen_ids.length > 0) {
        if (r.allergen_ids.some((id) => excludedIngredients.includes(id))) return false;
      }
      // Hard filter 4: never list
      const aff = affinities[r.dish_option_id];
      if (aff?.isNever) return false;
      // Hard filter 5: NOT_TODAY cooldown
      if (isOnCooldown(aff?.notTodayUntil ?? null, today)) return false;
      return true;
    })
    .map((r) => {
      const aff = affinities[r.dish_option_id];
      const history = clampHistoryModifier(aff?.affinityScore ?? 0);
      const variety = computeVarietyPenalty(recentDates[r.dish_option_id] ?? null, today, aff?.repeatPreferred ?? false);
      const scoreBreakdown = computeDishScore(r.region_relevance, regionArchetype, isWeekend, history, variety, classAffinity, undefined, cityDestGroup, cookDependency, cookComplexity, foodDnaTags, userDnaVector, classFamilyBoost, cookToleranceMod);
      return {
        dishOptionId: r.dish_option_id,
        dishName: r.dish_name,
        dietType: r.diet_type,
        regionRelevance: r.region_relevance,
        score: scoreBreakdown.total,
        scoreBreakdown,
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
 * @param {string} [dateISO] - Target calendar date (YYYY-MM-DD); defaults to real-world today (IST).
 * @returns {Promise<REDayDishCandidates>}
 *
 * @calledBy REPlanToday component.
 */
export async function fetchTodayDishCandidates(userId: string, dateISO?: string): Promise<REDayDishCandidates> {
  const today = dateISO
    ? dayNameFromDateIST(dateISO)
    : new Date().toLocaleDateString('en-GB', {
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

    // Load food_pref, allergens, and household context (city/cook) in parallel
    const slotClassCodesEarly = [plan.breakfast_class, plan.lunch_class, plan.snack_class, plan.dinner_class].filter((c): c is string => !!c);
    const [profileResult, dietRulesResult, householdResult, classMeta] = await Promise.all([
      supabaseRE.from('profiles').select('food_pref').eq('id', userId).maybeSingle(),
      supabaseRE.from('user_diet_rules').select('excluded_ingredients').eq('user_id', userId).maybeSingle(),
      supabaseRE.from('re_user_household_profiles').select('city_destination_group, cook_dependency').eq('profile_id', userId).maybeSingle(),
      supabaseRE.from('re_meal_classes').select('meal_class_code, cook_complexity, food_dna_tags, class_family_code').in('meal_class_code', slotClassCodesEarly),
    ]);
    if (profileResult.error) throw profileResult.error;

    const foodPref = (profileResult.data as { food_pref: string | null } | null)?.food_pref ?? 'veg';
    const excludedIngredients = (dietRulesResult.data as UserDietRulesRow | null)?.excluded_ingredients ?? [];
    const householdData = householdResult.data as UserHouseholdProfileRow | null;
    const cityDestGroup = householdData?.city_destination_group ?? '';
    const cookDependency = householdData?.cook_dependency ?? '';
    const classMetaMap = new Map<string, MealClassMetaRow>(
      ((classMeta.data ?? []) as MealClassMetaRow[]).map((r) => [r.meal_class_code, r]),
    );
    const stateId = parseStateIdFromCohort(cohortId);
    const regionArchetype = STATE_REGION_ARCHETYPE[stateId] ?? 'NORTH_WHEAT';

    const SLOTS = [
      { key: 'breakfast', classCode: plan.breakfast_class, display: plan.breakfast_display },
      { key: 'lunch',     classCode: plan.lunch_class,     display: plan.lunch_display },
      { key: 'snack',     classCode: plan.snack_class,     display: plan.snack_display },
      { key: 'dinner',    classCode: plan.dinner_class,    display: plan.dinner_display },
    ] as const;

    // Affinities loaded lazily — empty map if user has no history yet (cold start)
    const todayISO = dateISO ?? new Date().toISOString().slice(0, 10);
    const slotClassCodes = SLOTS.map((s) => s.classCode).filter((c): c is string => !!c);
    const [affinityMap, recentDates, classAffinityMap, userDnaVector, familyAffinities] = await Promise.all([
      fetchDishAffinities(userId, []),
      fetchRecentAcceptDates(userId, []),
      fetchClassAffinities(userId, slotClassCodes),
      fetchFoodDnaVector(userId),           // Seq 11
      fetchClassFamilyAffinities(userId),   // Seq 13
    ]).catch(() => [{}, {}, {}, {}, {}] as [Record<string, never>, Record<string, never>, Record<string, never>, Record<string, never>, Record<string, never>]);

    const results = await Promise.all(
      SLOTS.map(async ({ classCode, display }) => {
        if (!classCode) return null;
        const meta = classMetaMap.get(classCode);
        const classFamilyBoost = (familyAffinities as Record<string, number>)[meta?.class_family_code ?? ''] ?? 0;
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
          TOP_DISHES_PER_SLOT,
          excludedIngredients,
          cityDestGroup,
          cookDependency,
          meta?.cook_complexity ?? null,
          meta?.food_dna_tags ?? null,
          userDnaVector as Record<string, number>,
          classFamilyBoost,
          0, // cookToleranceMod: per-class lookup omitted here for perf; defaults to 0
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

/**
 * @summary Fetch ranked dish candidates for a single, arbitrary meal class (Week View swap).
 *
 * @description Unlike fetchTodayDishCandidates (which reads the class codes for "today"
 *   from the user's plan), this expands a class code the caller already knows — the one
 *   tapped in the weekly grid — using the same user-context scoring as the Day View.
 *
 * @param {string} userId - Supabase auth UID.
 * @param {string} classCode - Meal class code to expand.
 * @param {string} classDisplay - Human-readable class name for the result.
 * @param {boolean} isWeekend - Whether the tapped day is a weekend.
 * @returns {Promise<RESlotDishCandidates>}
 *
 * @calledBy REWeekView — swap sheet "Same style" tier.
 */
export async function fetchSwapCandidatesForClass(
  userId: string,
  classCode: string,
  classDisplay: string,
  isWeekend: boolean,
): Promise<RESlotDishCandidates> {
  try {
    const [profileResult, dietRulesResult, householdResult, classMetaResult] = await Promise.all([
      supabaseRE.from('profiles').select('food_pref').eq('id', userId).maybeSingle(),
      supabaseRE.from('user_diet_rules').select('excluded_ingredients').eq('user_id', userId).maybeSingle(),
      supabaseRE.from('re_user_household_profiles').select('cohort_id, city_destination_group, cook_dependency').eq('profile_id', userId).maybeSingle(),
      supabaseRE.from('re_meal_classes').select('meal_class_code, cook_complexity, food_dna_tags, class_family_code').eq('meal_class_code', classCode).maybeSingle(),
    ]);

    const foodPref = (profileResult.data as { food_pref: string | null } | null)?.food_pref ?? 'veg';
    const excludedIngredients = (dietRulesResult.data as UserDietRulesRow | null)?.excluded_ingredients ?? [];
    const household = householdResult.data as (UserHouseholdProfileRow & { cohort_id: string | null }) | null;
    const cityDestGroup = household?.city_destination_group ?? '';
    const cookDependency = household?.cook_dependency ?? '';
    const regionArchetype = STATE_REGION_ARCHETYPE[parseStateIdFromCohort(household?.cohort_id ?? '')] ?? 'NORTH_WHEAT';
    const meta = classMetaResult.data as MealClassMetaRow | null;

    return await expandClassToDishes(
      classCode,
      classDisplay,
      foodPref,
      regionArchetype,
      isWeekend,
      {},
      {},
      new Date().toISOString().slice(0, 10),
      0,
      TOP_DISHES_PER_SLOT,
      excludedIngredients,
      cityDestGroup,
      cookDependency,
      meta?.cook_complexity ?? null,
      meta?.food_dna_tags ?? null,
      {},
      0,
      0,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('RE_DISH', 'fetchSwapCandidatesForClass failed', { error: message, userId, classCode });
    return { classCode, classDisplay, topDishes: [] };
  }
}
