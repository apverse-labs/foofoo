// lib/types.ts — Shared types for foofoo-tests
// Mirrors the production schema from Doc #11A

export type DietType = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner';
export type BucketValue = 'frequently' | 'occasionally' | 'never';
export type ComboType = 'inseparable' | 'base_with_sides' | 'thali';

export interface Dish {
  id: number;
  name: string;
  cuisine_id: string;
  diet_type: DietType;
  spice_level: 1 | 2 | 3 | 4;
  meal_types: MealSlot[];
  ingredient_ids: number[];
  is_jain: boolean;
  allergens: string[];          // e.g. ['nuts', 'dairy', 'gluten']
  regional_origin?: string;     // state code
  cook_time_mins?: number;
  calories?: number;            // used by RE v1 weather boost (CALORIES_LIGHT/HEAVY thresholds)
  is_active: boolean;
}

export interface Ingredient {
  id: number;
  name: string;
  is_veg: boolean;
  is_vegan: boolean;
  is_jain_compatible: boolean;
  allergen_flags: string[];     // e.g. ['nuts'], ['dairy'], ['gluten']
  category: string;
}

export interface UserDietRules {
  user_id: string;
  diet_type: DietType;
  excluded_ingredient_ids: number[];  // integer IDs, not text
  allergen_ingredient_ids: number[];
}

export interface UserCategoryPreference {
  user_id: string;
  category_type: 'cuisine' | 'breakfast' | 'lunch_dinner';
  item_id: number;             // integer ID, not text
  item_slug: string;           // for test readability
  preference_bucket: BucketValue;
}

export interface NeverListEntry {
  user_id: string;
  ref_type: 'dish' | 'combo' | 'ingredient';
  ref_id: number;
  is_active: boolean;
}

export interface SuggestionLog {
  user_id: string;
  ref_type: 'dish' | 'combo';
  ref_id: number;
  meal_slot: MealSlot;
  carousel_position: number;
  action: 'locked' | 'tapped_detail' | 'swiped_past' | 'not_today' | 'never';
  action_at: Date;
}

// UserInferredPrefs matches foofoo/supabase/functions/generate-daily-plan/scoring.ts InferredPrefs
// Old fields (repeat_tolerance_breakfast/lunch/dinner, spice_tolerance) were wrong — see sync-audit.md
export interface UserInferredPrefs {
  user_id: string;
  spice_score?: number | null;          // -1..+1; positive = likes spicy
  complexity_score?: number | null;     // -1..+1; positive = likes complex/slow
  repeat_tolerance?: number | null;     // 1-10 scale (single value, not per-slot)
  cuisine_drift?: Record<string, number> | null; // per-cuisine drift score
}

// ─── RE Engine types ──────────────────────────────────────────────────────────

export interface REContext {
  user_id: string;
  meal_slot: MealSlot;
  date: Date;
  weather?: WeatherCondition;
  home_state?: string;
}

// WeatherCondition — used by re-engine.ts unit tests.
// The Edge Function uses { weatherCode: number; tempCelsius: number } (OpenWeatherMap format).
// re-engine.ts accepts WeatherCondition and maps it internally using weatherCode when available.
export interface WeatherCondition {
  temperature_c: number;
  humidity_percent: number;
  condition: 'sunny' | 'rainy' | 'cloudy' | 'humid' | 'cold';
  weatherCode?: number;   // OpenWeatherMap code; ≥500 <600 = rainy. Optional for test compatibility.
  tempCelsius?: number;   // alias for temperature_c used by Edge Function responses
}

export interface ScoredDish {
  dish: Dish;
  score: number;
  score_breakdown: ScoreBreakdown;
  is_eligible: boolean;
}

// ScoreBreakdown — mirrors Edge Function ScoreComponents (scoring.ts)
// Field names use test-readable underscore style; Edge Function uses camelCase.
// Added re_v2_* fields to match Edge Function's RE v2 scoring signals.
// Removed 'history' field — Edge Function has no history scoring step (see sync-audit.md EXTRA_STEP-1).
export interface ScoreBreakdown {
  base: number;
  cuisine_pref: number;        // cuisineBoost in EF
  meal_item_pref: number;      // mealItemBoost in EF
  weather: number;             // weatherBoost in EF
  day_of_week: number;         // dayBoost in EF
  home_state: number;          // homeStateBoost in EF
  variety_penalty: number;     // varietyPenalty in EF
  random: number;              // randomFactor in EF
  // RE v2 fields (0 when inferredPrefs is null)
  re_v2_spice_boost: number;
  re_v2_complexity_boost: number;
  re_v2_drift_boost: number;
  re_v2_affinity_boost: number;
  total: number;
}

// ─── Test infrastructure types ───────────────────────────────────────────────

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export interface PersonaResult {
  persona_id: string;
  persona_name: string;
  diet_type: DietType;
  re_maturity: 'cold_start' | 'two_week' | 'three_month';
  status: 'PASS' | 'FAIL' | 'CRITICAL_FAIL' | 'DATA_GAP';
  constraint_violations: string[];  // detailed violation messages
  critical_fails: string[];         // subset of constraint_violations with CRITICAL severity
  top3_cuisine_hit_rate: number;    // 0.0 – 1.0
  seven_day_variety_score: number;  // 0.0 – 1.0 (unique dishes / total slots)
  eligible_pool_size: number;       // dishes eligible for this persona
  data_gaps: string[];              // informational — regional dishes / functions not in DB
  daily_plans: DailyPlanResult[];   // 7-day generated plan
  notes?: string;                   // human-readable summary
  duration_ms: number;              // runner execution time for this persona
}

export interface DailyPlanResult {
  date: string;   // YYYY-MM-DD
  slots: SlotPlanResult[];
}

export interface SlotPlanResult {
  slot: MealSlot;
  top3_dishes: {
    rank: number;
    dish_id: number;
    dish_name: string;
    score: number;
    score_breakdown: ScoreBreakdown;
    passes_hard_constraints: boolean;
    constraint_violation?: string;
  }[];
  selected_dish_id: number;
  selected_dish_name: string;
}
