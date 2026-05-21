/**
 * @summary RE v1 scoring weights — copy of main RE config for regenerate-slot.
 * @description Kept in sync with supabase/functions/generate-daily-plan/re-config.ts
 *   so a single-slot regen produces results that are coherent with the full plan run.
 * @calledBy supabase/functions/regenerate-slot/index.ts
 */

export const RE_V1 = {
  CUISINE_BOOST_FREQUENT:   0.3,
  CUISINE_BOOST_OCCASIONAL: 0.1,
  MEAL_ITEM_BOOST_FREQUENT: 0.25,
  MEAL_ITEM_BOOST_OCCASIONAL: 0.05,
  VARIETY_PENALTY:          -0.5,
  WEATHER_BOOST:            0.15,
  WEEKDAY_QUICK_BOOST:      0.1,
  WEEKEND_SLOW_BOOST:       0.05,
  RANDOM_MAX:               0.05,
  TEMP_HOT_CELSIUS:         32,
  TEMP_COLD_CELSIUS:        18,
  CALORIES_HEAVY:           400,
  CALORIES_LIGHT:           350,
  SPICE_LEVEL_SPICY:        3,
  COOK_TIME_QUICK_MINS:     20,
  COOK_TIME_SLOW_MINS:      30,
  CAROUSEL_SIZE:            8,
  VARIETY_GUARD_DAYS:       3,
  WEATHER_CACHE_HOURS:      12,
} as const;
