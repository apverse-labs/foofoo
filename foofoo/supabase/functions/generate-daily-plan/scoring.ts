/**
 * @summary RE v1 dish scoring, slot generation, and plain-English reasoning builders.
 *
 * @description
 * Contains the full RE v1 scoring pipeline for a single dish (scoreDish),
 * the slot-level generator (generateSlot), and two helper functions that
 * produce human-readable explanations for the DevTools log view.
 *
 * @calledBy generate-daily-plan/index.ts
 */

import { RE_V1 } from './re-config.ts';

export interface ScoreComponents {
  base: number;
  cuisineBoost: number;
  mealItemBoost: number;
  weatherBoost: number;
  dayBoost: number;
  varietyPenalty: number;
  randomFactor: number;
}

export interface ScoreResult {
  score: number;
  components: ScoreComponents;
}

export interface ScoredDish {
  dish: any;
  score: number;
  components: ScoreComponents;
}

export interface SlotResult {
  top: any;
  carousel: any[];
  slotScore: number;
  slotComponents: ScoreComponents | null;
  slotAlternatives: Array<{ dish_name: string; final_score: number; why_not_first: string; components: ScoreComponents }>;
  totalEligible?: number;
}

/**
 * @summary Scores a single dish against the full RE v1 pipeline.
 *
 * @description Returns score=-1 for hard-filtered dishes (never list, allergens, N-bucket cuisine).
 *   All weight constants come from RE_V1 in re-config.ts.
 *
 * @param {any} dish - Dish row from the dishes table (with allergen_ids, spice_level, etc.)
 * @param {Set<number>} neverDishIds - Set of dish IDs on the user's permanent never list
 * @param {Set<number>} excludedIngredients - Set of ingredient IDs excluded by allergen rules
 * @param {Record<string, string>} cuisineBuckets - Map from cuisine code to 'F'|'O'|'N'
 * @param {Record<string, string>} mealItemBuckets - Map from dish ID (string) to 'F'|'O'|'N'
 * @param {Record<number, string>} cuisineIdToCode - Map from cuisine integer ID to code string
 * @param {{ weatherCode: number; tempCelsius: number } | null} weather - Current weather or null
 * @param {boolean} isWeekend - True if planDate falls on Saturday or Sunday
 * @param {Set<number>} recentDishIds - Set of dish IDs seen in the last VARIETY_GUARD_DAYS days
 * @returns {ScoreResult} Final score and breakdown of each component; score=-1 means hard-filtered
 */
export function scoreDish(
  dish: any,
  neverDishIds: Set<number>,
  excludedIngredients: Set<number>,
  cuisineBuckets: Record<string, string>,
  mealItemBuckets: Record<string, string>,
  cuisineIdToCode: Record<number, string>,
  weather: { weatherCode: number; tempCelsius: number } | null,
  isWeekend: boolean,
  recentDishIds: Set<number>,
): ScoreResult {
  const components: ScoreComponents = {
    base: 1.0, cuisineBoost: 0, mealItemBoost: 0,
    weatherBoost: 0, dayBoost: 0, varietyPenalty: 0, randomFactor: 0,
  };

  if (neverDishIds.has(dish.id)) return { score: -1, components };
  if (dish.allergen_ids?.length && excludedIngredients.size) {
    if ((dish.allergen_ids as number[]).some((id: number) => excludedIngredients.has(id))) {
      return { score: -1, components };
    }
  }
  const cuisineCode = cuisineIdToCode[dish.cuisine_id];
  if (cuisineCode && cuisineBuckets[cuisineCode] === 'N') return { score: -1, components };

  // Step 3: Cuisine boost
  if (cuisineCode) {
    if (cuisineBuckets[cuisineCode] === 'F') components.cuisineBoost = RE_V1.CUISINE_BOOST_FREQUENT;
    else if (cuisineBuckets[cuisineCode] === 'O') components.cuisineBoost = RE_V1.CUISINE_BOOST_OCCASIONAL;
  }

  // Step 4: Meal item boost
  const dishKey = String(dish.id);
  if (mealItemBuckets[dishKey] === 'F') components.mealItemBoost = RE_V1.MEAL_ITEM_BOOST_FREQUENT;
  else if (mealItemBuckets[dishKey] === 'O') components.mealItemBoost = RE_V1.MEAL_ITEM_BOOST_OCCASIONAL;

  // Step 5: Weather boost
  if (weather) {
    const isRainy = weather.weatherCode >= 500 && weather.weatherCode < 600;
    const isHot = weather.tempCelsius > RE_V1.TEMP_HOT_CELSIUS;
    const isCold = weather.tempCelsius < RE_V1.TEMP_COLD_CELSIUS;
    if (isRainy || isCold) {
      if (dish.spice_level >= RE_V1.SPICE_LEVEL_SPICY) components.weatherBoost += RE_V1.WEATHER_SPICY_BOOST;
      if (dish.calories > RE_V1.CALORIES_HEAVY) components.weatherBoost += RE_V1.WEATHER_BOOST;
    }
    if (isHot) {
      if (dish.spice_level < RE_V1.SPICE_LEVEL_SPICY) components.weatherBoost += RE_V1.WEATHER_BOOST;
      if (dish.calories < RE_V1.CALORIES_LIGHT) components.weatherBoost += RE_V1.WEATHER_BOOST;
    }
  }

  // Step 6: Day-of-week boost
  if (!isWeekend && dish.cook_time_mins && dish.cook_time_mins <= RE_V1.COOK_TIME_QUICK_MINS) {
    components.dayBoost = RE_V1.WEEKDAY_QUICK_BOOST;
  } else if (isWeekend && dish.cook_time_mins && dish.cook_time_mins > RE_V1.COOK_TIME_SLOW_MINS) {
    components.dayBoost = RE_V1.WEEKEND_SLOW_BOOST;
  }

  // Step 7: Variety guard
  if (recentDishIds.has(dish.id)) components.varietyPenalty = RE_V1.VARIETY_PENALTY;

  // Step 8: Random factor
  components.randomFactor = parseFloat((Math.random() * RE_V1.RANDOM_MAX).toFixed(3));

  const score =
    components.base + components.cuisineBoost + components.mealItemBoost +
    components.weatherBoost + components.dayBoost + components.varietyPenalty +
    components.randomFactor;

  return { score: parseFloat(score.toFixed(3)), components };
}

/**
 * @summary Scores all eligible dishes for a meal slot and returns the carousel and winner.
 *
 * @param {string} mealSlot - 'breakfast', 'lunch', or 'dinner'
 * @param {any[]} allDishes - Full eligible dish pool (after diet filter)
 * @param {Set<number>} assignedDishIds - Dish IDs already assigned to earlier slots (mutated in place)
 * @param {number | undefined} lockedDishId - If set, returns this dish without scoring
 * @param {Set<number>} neverDishIds
 * @param {Set<number>} excludedIngredients
 * @param {Record<string, string>} cuisineBuckets
 * @param {Record<string, string>} mealItemBuckets
 * @param {Record<number, string>} cuisineIdToCode
 * @param {{ weatherCode: number; tempCelsius: number } | null} weather
 * @param {boolean} isWeekend
 * @param {Set<number>} recentDishIds
 * @returns {SlotResult} Top dish, carousel array, score components, and top-3 alternatives
 */
export function generateSlot(
  mealSlot: string,
  allDishes: any[],
  assignedDishIds: Set<number>,
  lockedDishId: number | undefined,
  neverDishIds: Set<number>,
  excludedIngredients: Set<number>,
  cuisineBuckets: Record<string, string>,
  mealItemBuckets: Record<string, string>,
  cuisineIdToCode: Record<number, string>,
  weather: { weatherCode: number; tempCelsius: number } | null,
  isWeekend: boolean,
  recentDishIds: Set<number>,
): SlotResult {
  if (lockedDishId) {
    const locked = allDishes.find(d => d.id === lockedDishId);
    return { top: locked, carousel: locked ? [locked] : [], slotScore: 1.0, slotComponents: null, slotAlternatives: [] };
  }

  const eligible: ScoredDish[] = allDishes
    .filter(d => Array.isArray(d.meal_types) && d.meal_types.includes(mealSlot))
    .map(d => {
      const r = scoreDish(d, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds);
      return { dish: d, score: r.score, components: r.components };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  console.log(`[RE-v1] ${mealSlot}: ${eligible.length} eligible dishes scored`);

  const carousel = eligible.slice(0, RE_V1.CAROUSEL_SIZE).map(({ dish }) => dish);
  const top = carousel.find(d => !assignedDishIds.has(d.id)) ?? carousel[0] ?? null;
  if (top) assignedDishIds.add(top.id);

  const topEntry = eligible.find(e => e.dish.id === top?.id);
  const slotAlternatives = eligible
    .filter(e => e.dish.id !== top?.id)
    .slice(0, 3)
    .map(e => ({
      dish_name: e.dish.name,
      final_score: e.score,
      why_not_first: buildAlternativeReason(e.components, top ? (topEntry?.score ?? 1.0) - e.score : 0),
      components: e.components,
    }));

  return {
    top,
    carousel,
    slotScore: topEntry?.score ?? 1.0,
    slotComponents: topEntry?.components ?? null,
    slotAlternatives,
    totalEligible: eligible.length,
  };
}

/**
 * @summary Builds a plain-English explanation of why the winning dish was chosen.
 *
 * @param {any} dish - The winning dish
 * @param {ScoreComponents} components - Score breakdown for the winning dish
 * @param {{ weatherCode: number; tempCelsius: number } | null} weather - Current weather
 * @param {boolean} isWeekend - Whether today is a weekend
 * @returns {string} Multi-line reasoning string prefixed with "Why X was chosen:"
 */
export function buildReasoning(
  dish: any,
  components: ScoreComponents,
  weather: { weatherCode: number; tempCelsius: number } | null,
  isWeekend: boolean,
): string {
  const reasons: string[] = [];

  if (components.cuisineBoost >= RE_V1.CUISINE_BOOST_FREQUENT) {
    reasons.push(`✓ ${dish.cuisines?.name ?? 'Cuisine'} — you marked this as Frequently (+${components.cuisineBoost.toFixed(2)})`);
  } else if (components.cuisineBoost > 0) {
    reasons.push(`✓ ${dish.cuisines?.name ?? 'Cuisine'} — you marked this as Occasionally (+${components.cuisineBoost.toFixed(2)})`);
  }

  if (components.mealItemBoost >= RE_V1.MEAL_ITEM_BOOST_FREQUENT) {
    reasons.push(`✓ You marked ${dish.name} specifically as Frequently (+${components.mealItemBoost.toFixed(2)})`);
  } else if (components.mealItemBoost > 0) {
    reasons.push(`✓ You marked ${dish.name} specifically as Occasionally (+${components.mealItemBoost.toFixed(2)})`);
  }

  if (weather && components.weatherBoost > 0) {
    const isHot = weather.tempCelsius > RE_V1.TEMP_HOT_CELSIUS;
    const isCold = weather.tempCelsius < RE_V1.TEMP_COLD_CELSIUS;
    const isRainy = weather.weatherCode >= 500 && weather.weatherCode < 600;
    if (isHot) reasons.push(`✓ Hot day (${Math.round(weather.tempCelsius)}°C) — light dishes preferred (+${components.weatherBoost.toFixed(2)})`);
    else if (isRainy) reasons.push(`✓ Rainy day — warming dishes preferred (+${components.weatherBoost.toFixed(2)})`);
    else if (isCold) reasons.push(`✓ Cold day — hearty dishes preferred (+${components.weatherBoost.toFixed(2)})`);
  }

  if (components.dayBoost > 0) {
    if (!isWeekend) reasons.push(`✓ Weekday — quick dish (${dish.cook_time_mins ?? '?'} mins) preferred (+${components.dayBoost.toFixed(2)})`);
    else reasons.push(`✓ Weekend — more time to cook (+${components.dayBoost.toFixed(2)})`);
  }

  if (components.varietyPenalty < 0) {
    reasons.push(`✗ ${dish.name} was seen recently (variety penalty: ${components.varietyPenalty})`);
  } else {
    reasons.push(`✓ Haven't had ${dish.name} in the last ${RE_V1.VARIETY_GUARD_DAYS} days — no variety penalty`);
  }

  return `Why ${dish.name} was chosen:\n${reasons.map(r => `  ${r}`).join('\n')}`;
}

/**
 * @summary Builds a short plain-English reason why an alternative didn't rank first.
 *
 * @param {ScoreComponents} components - Score breakdown for the alternative dish
 * @param {number} scoreDiff - How many points below the winner this dish scored
 * @returns {string} One-line explanation (e.g. 'had it recently (-0.5 variety penalty)')
 */
export function buildAlternativeReason(components: ScoreComponents, scoreDiff: number): string {
  const reasons: string[] = [];
  if (components.varietyPenalty < 0) reasons.push(`had it recently (${components.varietyPenalty} variety penalty)`);
  if (components.cuisineBoost < RE_V1.CUISINE_BOOST_FREQUENT && components.cuisineBoost > 0) reasons.push('cuisine is Occasional, not Frequent');
  if (components.mealItemBoost === 0) reasons.push('dish not in meal preferences');
  if (reasons.length === 0 && scoreDiff > 0) reasons.push(`scored ${scoreDiff.toFixed(2)} below winner`);
  return reasons.join(', ') || 'lower overall score';
}
