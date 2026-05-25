// lib/re-engine.ts
// Portable TypeScript implementation of the FooFoo Recommendation Engine
// Mirrors the scoring spec from Doc #10 v3
// Used by unit tests — NOT the production engine (which lives in Edge Functions)

import type {
  Dish,
  DietType,
  MealSlot,
  BucketValue,
  REContext,
  ScoredDish,
  ScoreBreakdown,
  UserDietRules,
  UserCategoryPreference,
  NeverListEntry,
  SuggestionLog,
  UserInferredPrefs,
  WeatherCondition,
} from './types';

// ─── Hard filter functions ────────────────────────────────────────────────────

/**
 * Returns true if the dish is ELIGIBLE for the given user (passes all hard constraints).
 * A single false = dish is completely excluded from the eligible pool.
 */
export function passesHardConstraints(
  dish: Dish,
  dietRules: UserDietRules,
  neverList: NeverListEntry[]
): { eligible: boolean; reason?: string } {
  // 1. Diet type hard filter
  const dietResult = checkDietType(dish, dietRules.diet_type);
  if (!dietResult.pass) return { eligible: false, reason: dietResult.reason };

  // 2. Allergen hard filter
  const allergenResult = checkAllergens(dish, dietRules.allergen_ingredient_ids);
  if (!allergenResult.pass) return { eligible: false, reason: allergenResult.reason };

  // 3. Ingredient exclusions (non-allergen)
  const exclusionResult = checkExclusions(dish, dietRules.excluded_ingredient_ids);
  if (!exclusionResult.pass) return { eligible: false, reason: exclusionResult.reason };

  // 4. Never list
  const neverResult = checkNeverList(dish, neverList);
  if (!neverResult.pass) return { eligible: false, reason: neverResult.reason };

  return { eligible: true };
}

export function checkDietType(
  dish: Dish,
  userDiet: DietType
): { pass: boolean; reason?: string } {
  switch (userDiet) {
    case 'veg':
      // veg users can only have veg dishes
      if (!['veg', 'vegan', 'jain'].includes(dish.diet_type)) {
        return { pass: false, reason: `Diet mismatch: user=veg, dish=${dish.diet_type}` };
      }
      return { pass: true };

    case 'egg':
      // egg users can have veg + egg dishes, but NOT non_veg (meat/fish)
      if (dish.diet_type === 'non_veg') {
        return { pass: false, reason: `Diet mismatch: user=egg, dish=non_veg` };
      }
      return { pass: true };

    case 'vegan':
      // vegan: only vegan dishes
      if (dish.diet_type !== 'vegan') {
        return { pass: false, reason: `Diet mismatch: user=vegan, dish=${dish.diet_type}` };
      }
      return { pass: true };

    case 'jain':
      // jain: only jain dishes
      if (!dish.is_jain) {
        return { pass: false, reason: `Jain constraint: dish is_jain=false` };
      }
      return { pass: true };

    case 'non_veg':
      // non_veg: all dishes allowed (subject to specific exclusions like beef/pork)
      return { pass: true };

    default:
      return { pass: false, reason: `Unknown diet type: ${userDiet}` };
  }
}

export function checkAllergens(
  dish: Dish,
  userAllergenIngredientIds: number[]
): { pass: boolean; reason?: string } {
  if (userAllergenIngredientIds.length === 0) return { pass: true };

  for (const allergenId of userAllergenIngredientIds) {
    if (dish.ingredient_ids.includes(allergenId)) {
      return {
        pass: false,
        reason: `Allergen violation: ingredient_id ${allergenId} in dish "${dish.name}"`
      };
    }
  }
  return { pass: true };
}

export function checkExclusions(
  dish: Dish,
  excludedIngredientIds: number[]
): { pass: boolean; reason?: string } {
  if (excludedIngredientIds.length === 0) return { pass: true };

  for (const excludedId of excludedIngredientIds) {
    if (dish.ingredient_ids.includes(excludedId)) {
      return {
        pass: false,
        reason: `Exclusion violation: ingredient_id ${excludedId} in dish "${dish.name}"`
      };
    }
  }
  return { pass: true };
}

export function checkNeverList(
  dish: Dish,
  neverList: NeverListEntry[]
): { pass: boolean; reason?: string } {
  const active = neverList.filter(e => e.is_active && e.ref_type === 'dish');
  const match = active.find(e => e.ref_id === dish.id);
  if (match) {
    return { pass: false, reason: `Never list: dish "${dish.name}" is in never list` };
  }
  return { pass: true };
}

// ─── Cuisine bucket check ─────────────────────────────────────────────────────

export function checkCuisineBucket(
  dishCuisineSlug: string,
  preferences: UserCategoryPreference[]
): BucketValue | 'unset' {
  const match = preferences.find(
    p => p.category_type === 'cuisine' && p.item_slug === dishCuisineSlug
  );
  return match ? match.preference_bucket : 'unset';
}

// ─── Scoring functions ────────────────────────────────────────────────────────

const SCORE_BASE = 1.0;

// All weights kept in sync with foofoo/supabase/functions/generate-daily-plan/re-config.ts
// RE_V1 weights
const WEIGHTS = {
  cuisine_frequently: 0.3,       // RE_V1.CUISINE_BOOST_FREQUENT
  cuisine_occasionally: 0.1,     // RE_V1.CUISINE_BOOST_OCCASIONAL
  cuisine_never: -999,           // hard exclusion handled separately
  meal_item_frequently: 0.25,    // RE_V1.MEAL_ITEM_BOOST_FREQUENT
  meal_item_occasionally: 0.05,  // RE_V1.MEAL_ITEM_BOOST_OCCASIONAL
  weather_match: 0.15,           // RE_V1.WEATHER_BOOST (was 0.2 — fixed to match EF)
  weekday_quick_boost: 0.1,      // RE_V1.WEEKDAY_QUICK_BOOST (was single day_of_week:0.15)
  weekend_slow_boost: 0.05,      // RE_V1.WEEKEND_SLOW_BOOST
  home_state_boost_max: 0.2,     // RE_V1.HOME_STATE_BOOST_MAX, scaled by affinity (0..1)
  variety_same_cuisine_3rd: -0.3,
  random_max: 0.15,              // RE_V1.RANDOM_MAX
  // RE_V2 weights
  re_v2_spice_weight: 0.15,      // RE_V2.SPICE_WEIGHT
  re_v2_complexity_weight: 0.10, // RE_V2.COMPLEXITY_WEIGHT
  re_v2_drift_weight: 0.20,      // RE_V2.DRIFT_WEIGHT
  re_v2_affinity_weight: 0.40,   // RE_V2.AFFINITY_WEIGHT
};

// Thresholds (kept in sync with RE_V1 in re-config.ts)
const THRESHOLDS = {
  TEMP_HOT_CELSIUS: 32,          // RE_V1.TEMP_HOT_CELSIUS (was 35)
  TEMP_COLD_CELSIUS: 18,         // RE_V1.TEMP_COLD_CELSIUS (was 20)
  CALORIES_HEAVY: 400,           // RE_V1.CALORIES_HEAVY
  CALORIES_LIGHT: 350,           // RE_V1.CALORIES_LIGHT
  SPICE_LEVEL_SPICY: 3,          // RE_V1.SPICE_LEVEL_SPICY
  COOK_TIME_QUICK_MINS: 20,      // RE_V1.COOK_TIME_QUICK_MINS (was 30)
  COOK_TIME_SLOW_MINS: 30,       // RE_V1.COOK_TIME_SLOW_MINS (was 45)
  RE_V2_SPICE_THRESHOLD: 0.3,    // RE_V2.SPICE_THRESHOLD
  RE_V2_COMPLEXITY_THRESHOLD: 0.3, // RE_V2.COMPLEXITY_THRESHOLD
};

export function scoreDish(
  dish: Dish,
  context: REContext,
  preferences: UserCategoryPreference[],
  suggestionHistory: SuggestionLog[],
  inferredPrefs?: UserInferredPrefs,
  seed?: number,                             // for deterministic testing
  regionAffinityByCuisineId?: Record<string, number>, // cuisine_id → affinity 0..1
  affinityByDishId?: Record<number, number>           // dish_id → affinity 0..1
): ScoredDish {
  const breakdown: ScoreBreakdown = {
    base: SCORE_BASE,
    cuisine_pref: 0,
    meal_item_pref: 0,
    weather: 0,
    day_of_week: 0,
    home_state: 0,
    variety_penalty: 0,
    random: seed !== undefined ? seed * WEIGHTS.random_max : Math.random() * WEIGHTS.random_max,
    re_v2_spice_boost: 0,
    re_v2_complexity_boost: 0,
    re_v2_drift_boost: 0,
    re_v2_affinity_boost: 0,
    total: 0,
  };

  // Step 3: Cuisine boost
  const cuisineSlug = dish.cuisine_id;
  const cuisineBucket = checkCuisineBucket(cuisineSlug, preferences);
  if (cuisineBucket === 'frequently') breakdown.cuisine_pref = WEIGHTS.cuisine_frequently;
  else if (cuisineBucket === 'occasionally') breakdown.cuisine_pref = WEIGHTS.cuisine_occasionally;

  // Step 4: Meal item boost
  const mealBucketType = context.meal_slot === 'breakfast' ? 'breakfast' : 'lunch_dinner';
  const mealItemPref = preferences.find(
    p => p.category_type === mealBucketType && p.item_slug === dish.name.toLowerCase().replace(/\s+/g, '_')
  );
  if (mealItemPref) {
    if (mealItemPref.preference_bucket === 'frequently') breakdown.meal_item_pref = WEIGHTS.meal_item_frequently;
    else if (mealItemPref.preference_bucket === 'occasionally') breakdown.meal_item_pref = WEIGHTS.meal_item_occasionally;
  }

  // Step 5: Weather boost (mirrors Edge Function scoring.ts §Step 5)
  if (context.weather) {
    breakdown.weather = getWeatherScore(dish, context.weather);
  }

  // Step 6: Day-of-week boost (mirrors Edge Function scoring.ts §Step 6)
  breakdown.day_of_week = getDayOfWeekScore(dish, context.date);

  // Step 7: Home-state regional affinity boost (mirrors Edge Function scoring.ts §Step 7)
  // Affinity is 0..1, scaled to [0, HOME_STATE_BOOST_MAX]
  if (regionAffinityByCuisineId) {
    const aff = regionAffinityByCuisineId[dish.cuisine_id];
    if (typeof aff === 'number' && aff > 0) {
      breakdown.home_state = parseFloat((aff * WEIGHTS.home_state_boost_max).toFixed(3));
    }
  } else if (context.home_state && dish.regional_origin === context.home_state) {
    // Fallback for unit tests that don't pass regionAffinityByCuisineId
    breakdown.home_state = WEIGHTS.home_state_boost_max * 0.5; // mid-range affinity
  }

  // Step 8: Variety guard (mirrors Edge Function scoring.ts §Step 8)
  breakdown.variety_penalty = getVarietyPenalty(dish, context, suggestionHistory, inferredPrefs);

  // Step 9: Randomization (already set above)

  // RE v2 signals (mirrors Edge Function scoring.ts lines 155-180)
  if (inferredPrefs) {
    const spice = inferredPrefs.spice_score ?? 0;
    if (Math.abs(spice) > THRESHOLDS.RE_V2_SPICE_THRESHOLD && dish.spice_level) {
      const dishSpiceNorm = (dish.spice_level - 2.5) / 1.5;
      breakdown.re_v2_spice_boost = parseFloat((spice * dishSpiceNorm * WEIGHTS.re_v2_spice_weight).toFixed(3));
    }
    const cx = inferredPrefs.complexity_score ?? 0;
    if (Math.abs(cx) > THRESHOLDS.RE_V2_COMPLEXITY_THRESHOLD && dish.cook_time_mins) {
      const dishCx = dish.cook_time_mins > 40 ? 1 : dish.cook_time_mins > 20 ? 0 : -1;
      breakdown.re_v2_complexity_boost = parseFloat((cx * dishCx * WEIGHTS.re_v2_complexity_weight).toFixed(3));
    }
    const drift = inferredPrefs.cuisine_drift ?? {};
    if (drift[cuisineSlug] !== undefined && typeof drift[cuisineSlug] === 'number') {
      breakdown.re_v2_drift_boost = parseFloat((drift[cuisineSlug] * WEIGHTS.re_v2_drift_weight).toFixed(3));
    }
  }
  // Pre-computed affinity (applied even without inferredPrefs)
  if (affinityByDishId) {
    const affDish = affinityByDishId[dish.id];
    if (typeof affDish === 'number') {
      breakdown.re_v2_affinity_boost = parseFloat(((affDish - 0.5) * WEIGHTS.re_v2_affinity_weight).toFixed(3));
    }
  }

  // Compute total
  breakdown.total = Math.max(
    0.3,
    breakdown.base +
    breakdown.cuisine_pref +
    breakdown.meal_item_pref +
    breakdown.weather +
    breakdown.day_of_week +
    breakdown.home_state +
    breakdown.variety_penalty +
    breakdown.random +
    breakdown.re_v2_spice_boost +
    breakdown.re_v2_complexity_boost +
    breakdown.re_v2_drift_boost +
    breakdown.re_v2_affinity_boost
  );

  // Cap at 2.5
  breakdown.total = Math.min(2.5, breakdown.total);

  return {
    dish,
    score: breakdown.total,
    score_breakdown: breakdown,
    is_eligible: true,
  };
}

// getWeatherScore mirrors Edge Function scoring.ts §Step 5 (AND-gated, single coherent match)
// Doc 10 §6.5: only one weather boost fires per dish — the strongest match wins.
function getWeatherScore(dish: Dish, weather: WeatherCondition): number {
  // Resolve rainy from weatherCode (OpenWeatherMap: 500-599 = rain) OR string condition fallback
  const isRainy = weather.weatherCode !== undefined
    ? (weather.weatherCode >= 500 && weather.weatherCode < 600)
    : weather.condition === 'rainy';

  // Resolve temperature — accept either tempCelsius (EF format) or temperature_c (test format)
  const tempC = weather.tempCelsius !== undefined ? weather.tempCelsius : weather.temperature_c;

  const isHot = tempC > THRESHOLDS.TEMP_HOT_CELSIUS;      // > 32°C (was > 35)
  const isCold = tempC < THRESHOLDS.TEMP_COLD_CELSIUS;    // < 18°C (was < 20)
  const isSpicy = dish.spice_level >= THRESHOLDS.SPICE_LEVEL_SPICY;
  const isHeavy = dish.calories != null && dish.calories > THRESHOLDS.CALORIES_HEAVY;
  const isLight = dish.calories != null && dish.calories < THRESHOLDS.CALORIES_LIGHT;

  // Cold or rainy → boost spicy/heavy dishes (AND-gated)
  if ((isCold || isRainy) && (isSpicy || isHeavy)) {
    return WEIGHTS.weather_match;
  }

  // Hot → boost light non-spicy dishes (AND-gated, calories-based not cook_time-based)
  if (isHot && !isSpicy && isLight) {
    return WEIGHTS.weather_match;
  }

  return 0;
}

// getDayOfWeekScore mirrors Edge Function scoring.ts §Step 6
// Uses COOK_TIME_QUICK_MINS=20 (weekday) and COOK_TIME_SLOW_MINS=30 (weekend)
function getDayOfWeekScore(dish: Dish, date: Date): number {
  const day = date.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;
  const cookTime = dish.cook_time_mins;

  if (!cookTime) return 0; // no cook_time data → no boost

  if (!isWeekend && cookTime <= THRESHOLDS.COOK_TIME_QUICK_MINS) {
    return WEIGHTS.weekday_quick_boost; // quick dish (≤20 min) on weekday
  }
  if (isWeekend && cookTime > THRESHOLDS.COOK_TIME_SLOW_MINS) {
    return WEIGHTS.weekend_slow_boost; // slow dish (>30 min) on weekend
  }
  return 0;
}

// getVarietyPenalty mirrors Edge Function scoring.ts §Step 8
// Edge Function uses a flat -0.5 for any dish in recentDishIds (seen in last VARIETY_GUARD_DAYS)
// re-engine.ts uses position-1 history for more granular testing, but penalty value matches EF.
function getVarietyPenalty(
  dish: Dish,
  context: REContext,
  history: SuggestionLog[],
  inferredPrefs?: UserInferredPrefs
): number {
  // Get repeat tolerance using new UserInferredPrefs schema (single repeat_tolerance field)
  let toleranceScore = 5; // default mid-range
  if (inferredPrefs?.repeat_tolerance != null) {
    toleranceScore = inferredPrefs.repeat_tolerance;
  }
  const windowDays = 12 - toleranceScore; // score 5 → 7-day window, matches getRepeatWindow()

  // Check if dish was at position 1 within tolerance window
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const recentAtPos1 = history.filter(
    h => h.ref_id === dish.id &&
         h.carousel_position === 1 &&
         h.action_at > windowStart
  );
  if (recentAtPos1.length > 0) return -0.5; // -0.5 matches RE_V1.VARIETY_PENALTY

  return 0;
}

// ─── Auto-derivation pipeline ─────────────────────────────────────────────────

export interface DerivedDishAttributes {
  diet_type: DietType;
  is_jain: boolean;
  allergens: string[];
  ingredient_ids: number[];
}

export function deriveAttributes(ingredients: import('./types').Ingredient[]): DerivedDishAttributes {
  const ingredient_ids = ingredients.map(i => i.id);

  // Diet type derivation
  const hasMeat = ingredients.some(i => !i.is_veg && i.category === 'meat');
  const hasSeafood = ingredients.some(i => !i.is_veg && i.category === 'seafood');
  const hasEgg = ingredients.some(i => i.category === 'egg');
  const hasDairy = ingredients.some(i => i.category === 'dairy');
  const allVegan = ingredients.every(i => i.is_vegan);
  const allJain = ingredients.every(i => i.is_jain_compatible && i.is_veg);

  let diet_type: DietType;
  if (hasMeat || hasSeafood) diet_type = 'non_veg';
  else if (hasEgg) diet_type = 'egg';
  else if (allVegan) diet_type = 'vegan';
  else diet_type = 'veg';

  // Jain derivation: all ingredients must be jain_compatible AND dish must be veg
  const is_jain = allJain && diet_type !== 'non_veg' && diet_type !== 'egg';

  // Allergen derivation: union of all allergen_flags
  const allergenSet = new Set<string>();
  for (const ing of ingredients) {
    for (const flag of ing.allergen_flags) {
      allergenSet.add(flag);
    }
  }

  return {
    diet_type,
    is_jain,
    allergens: Array.from(allergenSet),
    ingredient_ids,
  };
}

// ─── Variety guard standalone ─────────────────────────────────────────────────

export function getRepeatWindow(toleranceScore: number): number {
  // score 1 → 11-day window, score 10 → 2-day window
  return Math.max(2, 12 - toleranceScore);
}

export function isDishInRepeatWindow(
  dishId: number,
  history: SuggestionLog[],
  toleranceScore: number
): boolean {
  const windowDays = getRepeatWindow(toleranceScore);
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  return history.some(
    h => h.ref_id === dishId &&
         h.carousel_position === 1 &&
         h.action_at > windowStart
  );
}

export function getSameCuisinePenalty(
  dishCuisine: string,
  todaysMeals: Array<{ cuisine_id: string }>
): number {
  const count = todaysMeals.filter(m => m.cuisine_id === dishCuisine).length;
  return count >= 2 ? WEIGHTS.variety_same_cuisine_3rd : 0;
}

// ─── Score range validation ───────────────────────────────────────────────────

export const SCORE_MIN = 0.3;
export const SCORE_MAX = 2.5;

export function isValidScore(score: number): boolean {
  return score >= SCORE_MIN && score <= SCORE_MAX;
}

export { WEIGHTS };
