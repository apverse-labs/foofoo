/**
 * @summary RE v1 dish scoring — single-slot variant for regenerate-slot Edge Function.
 *
 * @description
 * Mirrors the scoring pipeline in supabase/functions/generate-daily-plan/scoring.ts
 * but operates on a single slot at a time. Excluded dishes are filtered out
 * before scoring (skipping the just-dismissed dish + the user's never_list).
 *
 * @calledBy supabase/functions/regenerate-slot/index.ts
 */

import { RE_V1, RE_V2 } from './re-config.ts';
import { seededRandom } from './helpers.ts';

export interface InferredPrefs {
  spice_score?: number | null;
  complexity_score?: number | null;
  repeat_tolerance?: number | null;
  cuisine_drift?: Record<string, number> | null;
}

export interface ScoreComponents {
  base: number;
  cuisineBoost: number;
  mealItemBoost: number;
  weatherBoost: number;
  dayBoost: number;
  homeStateBoost: number;
  varietyPenalty: number;
  randomFactor: number;
  re_v2_spice_boost: number;
  re_v2_complexity_boost: number;
  re_v2_drift_boost: number;
  re_v2_affinity_boost: number;
}

export interface ScoreResult {
  score: number;
  components: ScoreComponents;
}

/**
 * @summary Scores a single dish against the full RE v1 pipeline.
 *
 * @description Returns score=-1 for hard-filtered dishes (never list,
 *   allergens, N-bucket cuisine). All weight constants come from RE_V1 in
 *   re-config.ts.
 *
 * @param {any} dish - Dish row
 * @param {string} userId - Supabase user UUID (for seeded random)
 * @param {string} planDate - YYYY-MM-DD plan date (for seeded random)
 * @param {Set<number>} neverDishIds - Set of dish IDs on the user's never list
 * @param {Set<number>} excludedIngredients - Set of ingredient IDs excluded by allergens
 * @param {Record<string, string>} cuisineBuckets - cuisine code → 'F'|'O'|'N'
 * @param {Record<string, string>} mealItemBuckets - dish ID (string) → 'F'|'O'|'N'
 * @param {Record<number, string>} cuisineIdToCode - cuisine id → code
 * @param {{ weatherCode: number; tempCelsius: number } | null} weather
 * @param {boolean} isWeekend
 * @param {Set<number>} recentDishIds
 * @returns {ScoreResult} score + components; score=-1 means hard-filtered
 */
export function scoreDish(
  dish: any,
  userId: string,
  planDate: string,
  neverDishIds: Set<number>,
  excludedIngredients: Set<number>,
  cuisineBuckets: Record<string, string>,
  mealItemBuckets: Record<string, string>,
  cuisineIdToCode: Record<number, string>,
  weather: { weatherCode: number; tempCelsius: number } | null,
  isWeekend: boolean,
  recentDishIds: Set<number>,
  regionAffinityByCuisineId: Record<number, number> = {},
  inferredPrefs: InferredPrefs | null = null,
  affinityByDishId: Record<number, number> = {},
): ScoreResult {
  const components: ScoreComponents = {
    base: 1.0, cuisineBoost: 0, mealItemBoost: 0,
    weatherBoost: 0, dayBoost: 0, homeStateBoost: 0, varietyPenalty: 0, randomFactor: 0,
    re_v2_spice_boost: 0, re_v2_complexity_boost: 0, re_v2_drift_boost: 0, re_v2_affinity_boost: 0,
  };

  if (neverDishIds.has(dish.id)) return { score: -1, components };
  if (dish.allergen_ids?.length && excludedIngredients.size) {
    if ((dish.allergen_ids as number[]).some((id) => excludedIngredients.has(id))) {
      return { score: -1, components };
    }
  }
  const cuisineCode = cuisineIdToCode[dish.cuisine_id];
  if (cuisineCode && cuisineBuckets[cuisineCode] === 'N') return { score: -1, components };

  if (cuisineCode) {
    if (cuisineBuckets[cuisineCode] === 'F') components.cuisineBoost = RE_V1.CUISINE_BOOST_FREQUENT;
    else if (cuisineBuckets[cuisineCode] === 'O') components.cuisineBoost = RE_V1.CUISINE_BOOST_OCCASIONAL;
  }

  const dishKey = String(dish.id);
  if (mealItemBuckets[dishKey] === 'F') components.mealItemBoost = RE_V1.MEAL_ITEM_BOOST_FREQUENT;
  else if (mealItemBuckets[dishKey] === 'O') components.mealItemBoost = RE_V1.MEAL_ITEM_BOOST_OCCASIONAL;

  if (weather) {
    const isRainy = weather.weatherCode >= 500 && weather.weatherCode < 600;
    const isHot = weather.tempCelsius > RE_V1.TEMP_HOT_CELSIUS;
    const isCold = weather.tempCelsius < RE_V1.TEMP_COLD_CELSIUS;
    const isSpicy = dish.spice_level >= RE_V1.SPICE_LEVEL_SPICY;
    const isHeavy = dish.calories != null && dish.calories > RE_V1.CALORIES_HEAVY;
    const isLight = dish.calories != null && dish.calories < RE_V1.CALORIES_LIGHT;

    if ((isCold || isRainy) && (isSpicy || isHeavy)) components.weatherBoost = RE_V1.WEATHER_BOOST;
    else if (isHot && !isSpicy && isLight) components.weatherBoost = RE_V1.WEATHER_BOOST;
  }

  if (!isWeekend && dish.cook_time_mins && dish.cook_time_mins <= RE_V1.COOK_TIME_QUICK_MINS) {
    components.dayBoost = RE_V1.WEEKDAY_QUICK_BOOST;
  } else if (isWeekend && dish.cook_time_mins && dish.cook_time_mins > RE_V1.COOK_TIME_SLOW_MINS) {
    components.dayBoost = RE_V1.WEEKEND_SLOW_BOOST;
  }

  const aff = regionAffinityByCuisineId[dish.cuisine_id];
  if (typeof aff === 'number' && aff > 0) {
    components.homeStateBoost = parseFloat((aff * RE_V1.HOME_STATE_BOOST_MAX).toFixed(3));
  }

  if (recentDishIds.has(dish.id)) components.varietyPenalty = RE_V1.VARIETY_PENALTY;

  // Salt with 'regen' so the same (user, day, dish) gets a different random
  // value when regenerated, avoiding identical scores from the first run.
  components.randomFactor = parseFloat(
    (seededRandom(userId, planDate, dish.id, 'regen') * RE_V1.RANDOM_MAX).toFixed(3),
  );

  // --- RE v2 signals: identical math to generate-daily-plan/scoring.ts -------
  if (inferredPrefs) {
    const spice = inferredPrefs.spice_score ?? 0;
    if (Math.abs(spice) > RE_V2.SPICE_THRESHOLD && dish.spice_level) {
      const dishSpiceNorm = (dish.spice_level - 2.5) / 1.5;
      components.re_v2_spice_boost = parseFloat((spice * dishSpiceNorm * RE_V2.SPICE_WEIGHT).toFixed(3));
    }
    const cx = inferredPrefs.complexity_score ?? 0;
    if (Math.abs(cx) > RE_V2.COMPLEXITY_THRESHOLD && dish.cook_time_mins) {
      const dishCx = dish.cook_time_mins > 40 ? 1 : dish.cook_time_mins > 20 ? 0 : -1;
      components.re_v2_complexity_boost = parseFloat((cx * dishCx * RE_V2.COMPLEXITY_WEIGHT).toFixed(3));
    }
    const drift = inferredPrefs.cuisine_drift ?? {};
    if (cuisineCode && typeof drift[cuisineCode] === 'number') {
      components.re_v2_drift_boost = parseFloat((drift[cuisineCode] * RE_V2.DRIFT_WEIGHT).toFixed(3));
    }
  }
  const affDish = affinityByDishId[dish.id];
  if (typeof affDish === 'number') {
    components.re_v2_affinity_boost = parseFloat(((affDish - 0.5) * RE_V2.AFFINITY_WEIGHT).toFixed(3));
  }

  const score =
    components.base + components.cuisineBoost + components.mealItemBoost +
    components.weatherBoost + components.dayBoost + components.homeStateBoost +
    components.varietyPenalty + components.randomFactor +
    components.re_v2_spice_boost + components.re_v2_complexity_boost +
    components.re_v2_drift_boost + components.re_v2_affinity_boost;

  return { score: parseFloat(score.toFixed(3)), components };
}
