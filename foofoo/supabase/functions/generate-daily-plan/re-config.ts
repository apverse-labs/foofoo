/**
 * @summary RE v1 scoring weights and dish classification thresholds.
 *
 * @description Central source of truth for all numeric tuning knobs.
 *   Change a value here to affect scoring across the entire pipeline.
 *   Mirrors the RE_CONFIG export in src/config/constants.ts (client-side).
 *
 * @calledBy scoring.ts — scoreDish, generateSlot
 */

export const RE_V1 = {
  // Scoring weights
  CUISINE_BOOST_FREQUENT:   0.3,   // F bucket cuisine match
  CUISINE_BOOST_OCCASIONAL: 0.1,   // O bucket cuisine match
  MEAL_ITEM_BOOST_FREQUENT: 0.25,  // F bucket dish match
  MEAL_ITEM_BOOST_OCCASIONAL: 0.05, // O bucket dish match
  VARIETY_PENALTY:          -0.5,  // Dish seen in last 3 days
  WEATHER_BOOST:            0.15,  // Single coherent weather match (Doc 10 §6.5)
  WEEKDAY_QUICK_BOOST:      0.1,   // Quick dish (≤20 min) on a weekday
  WEEKEND_SLOW_BOOST:       0.05,  // Slow dish (>30 min) on a weekend
  HOME_STATE_BOOST_MAX:     0.2,   // Multiplied by region_food_affinity.affinity_score (0..1)
  RANDOM_MAX:               0.15,  // Max random noise per dish (Doc 10 §6.7)

  // Dish classification thresholds
  TEMP_HOT_CELSIUS:         32,
  TEMP_COLD_CELSIUS:        18,
  CALORIES_HEAVY:           400,
  CALORIES_LIGHT:           350,
  SPICE_LEVEL_SPICY:        3,
  COOK_TIME_QUICK_MINS:     20,
  COOK_TIME_SLOW_MINS:      30,

  // Pipeline config
  CAROUSEL_SIZE:            8,     // Top N dishes per slot
  VARIETY_GUARD_DAYS:       3,     // Look-back window for variety penalty
  WEATHER_CACHE_HOURS:      12,    // Hours before re-fetching weather
} as const;

/**
 * @summary RE v2 scoring weights — additive boosts layered on top of v1 when
 *   user_inferred_prefs exist for the user.
 *
 * @description These tune how strongly each inferred signal moves the score.
 *   Kept small (<= 0.2) so v2 nudges rather than overrides v1 baseline.
 */
export const RE_V2 = {
  SPICE_THRESHOLD:        0.3,  // ignore weak spice preferences (noise)
  SPICE_WEIGHT:           0.15, // max boost from spice match
  COMPLEXITY_THRESHOLD:   0.3,  // ignore weak complexity preferences
  COMPLEXITY_WEIGHT:      0.10, // max boost from cook-time match
  DRIFT_WEIGHT:           0.20, // multiplier on cuisine_drift score
  AFFINITY_WEIGHT:        0.40, // multiplier on (affinity - 0.5); range -0.2 .. +0.2
} as const;
