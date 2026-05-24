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

const WEIGHTS = {
  cuisine_frequently: 0.3,
  cuisine_occasionally: 0.1,
  cuisine_never: -999,          // hard exclusion handled separately
  meal_item_frequently: 0.25,
  meal_item_occasionally: 0.05,
  weather_match: 0.2,
  day_of_week: 0.15,            // weekday quick / weekend elaborate
  home_state: 0.1,
  history_max: 0.3,
  history_min: 0.1,
  rejection_max: -0.2,
  rejection_min: -0.1,
  not_today: -0.15,
  variety_same_cuisine_3rd: -0.3,
  random_max: 0.15,
};

export function scoreDish(
  dish: Dish,
  context: REContext,
  preferences: UserCategoryPreference[],
  suggestionHistory: SuggestionLog[],
  inferredPrefs?: UserInferredPrefs,
  seed?: number               // for deterministic testing
): ScoredDish {
  const breakdown: ScoreBreakdown = {
    base: SCORE_BASE,
    cuisine_pref: 0,
    meal_item_pref: 0,
    weather: 0,
    day_of_week: 0,
    home_state: 0,
    history: 0,
    variety_penalty: 0,
    random: seed !== undefined ? seed * WEIGHTS.random_max : Math.random() * WEIGHTS.random_max,
    total: 0,
  };

  // Step 3: Onboarding boosts
  const cuisineSlug = dish.cuisine_id;
  const cuisineBucket = checkCuisineBucket(cuisineSlug, preferences);
  if (cuisineBucket === 'frequently') breakdown.cuisine_pref = WEIGHTS.cuisine_frequently;
  else if (cuisineBucket === 'occasionally') breakdown.cuisine_pref = WEIGHTS.cuisine_occasionally;

  // Meal item bucket
  const mealBucketType = context.meal_slot === 'breakfast' ? 'breakfast' : 'lunch_dinner';
  const mealItemPref = preferences.find(
    p => p.category_type === mealBucketType && p.item_slug === dish.name.toLowerCase().replace(/\s+/g, '_')
  );
  if (mealItemPref) {
    if (mealItemPref.preference_bucket === 'frequently') breakdown.meal_item_pref = WEIGHTS.meal_item_frequently;
    else if (mealItemPref.preference_bucket === 'occasionally') breakdown.meal_item_pref = WEIGHTS.meal_item_occasionally;
  }

  // Step 4: Context boosts
  if (context.weather) {
    breakdown.weather = getWeatherScore(dish, context.weather);
  }
  breakdown.day_of_week = getDayOfWeekScore(dish, context.date);
  if (context.home_state && dish.regional_origin === context.home_state) {
    breakdown.home_state = WEIGHTS.home_state;
  }

  // Step 5: History modifier
  const dishHistory = suggestionHistory.filter(
    h => h.ref_id === dish.id && h.ref_type === 'dish'
  );
  breakdown.history = getHistoryScore(dishHistory);

  // Step 7: Variety guard
  breakdown.variety_penalty = getVarietyPenalty(
    dish, context, suggestionHistory, inferredPrefs
  );

  // Step 10: Randomization (already set above)

  // Compute total
  breakdown.total = Math.max(
    0.3,
    breakdown.base +
    breakdown.cuisine_pref +
    breakdown.meal_item_pref +
    breakdown.weather +
    breakdown.day_of_week +
    breakdown.home_state +
    breakdown.history +
    breakdown.variety_penalty +
    breakdown.random
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

function getWeatherScore(dish: Dish, weather: WeatherCondition): number {
  if (!dish.allergens) return 0; // guard

  // Hot weather: boost light dishes, demote heavy fried
  if (weather.temperature_c > 35) {
    if (dish.spice_level <= 2 && dish.cook_time_mins && dish.cook_time_mins <= 30) {
      return WEIGHTS.weather_match;
    }
    if (dish.spice_level >= 3) return -0.1;
  }

  // Cold weather: boost warm rich dishes
  if (weather.temperature_c < 20) {
    if (dish.spice_level >= 2) return WEIGHTS.weather_match;
  }

  // Rainy: boost comfort food
  if (weather.condition === 'rainy') {
    if (dish.spice_level >= 2) return WEIGHTS.weather_match;
  }

  // Humid: boost light steamed
  if (weather.humidity_percent > 80) {
    if (dish.spice_level <= 2) return WEIGHTS.weather_match * 0.5;
  }

  return 0;
}

function getDayOfWeekScore(dish: Dish, date: Date): number {
  const day = date.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;
  const cookTime = dish.cook_time_mins ?? 30;

  if (isWeekend && cookTime >= 45) return WEIGHTS.day_of_week; // elaborate on weekends
  if (!isWeekend && cookTime <= 30) return WEIGHTS.day_of_week; // quick on weekdays
  return 0;
}

function getHistoryScore(history: SuggestionLog[]): number {
  if (history.length === 0) return 0;

  const acceptances = history.filter(h => h.action === 'locked' || h.action === 'tapped_detail');
  const rejections = history.filter(h => h.action === 'swiped_past' || h.action === 'never');

  let score = 0;
  if (acceptances.length >= 3) score += WEIGHTS.history_max;
  else if (acceptances.length >= 1) score += WEIGHTS.history_min;

  if (rejections.length >= 3) score += WEIGHTS.rejection_max;
  else if (rejections.length >= 1) score += WEIGHTS.rejection_min;

  // Not today: check last 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const notToday = history.filter(
    h => h.action === 'not_today' && h.action_at > threeDaysAgo
  );
  if (notToday.length > 0) score += WEIGHTS.not_today;

  return score;
}

function getVarietyPenalty(
  dish: Dish,
  context: REContext,
  history: SuggestionLog[],
  inferredPrefs?: UserInferredPrefs
): number {
  // Get repeat tolerance for this slot
  let toleranceScore = 5; // default
  if (inferredPrefs) {
    const key = `repeat_tolerance_${context.meal_slot}` as keyof UserInferredPrefs;
    const val = inferredPrefs[key];
    if (typeof val === 'number') toleranceScore = val;
  }
  const windowDays = 12 - toleranceScore; // score 5 → 7-day window

  // Check if dish was at position 1 within tolerance window
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const recentAtPos1 = history.filter(
    h => h.ref_id === dish.id &&
         h.carousel_position === 1 &&
         h.action_at > windowStart
  );
  if (recentAtPos1.length > 0) return -0.5; // penalize heavily but don't hard-block

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
