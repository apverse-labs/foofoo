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

export interface UserInferredPrefs {
  user_id: string;
  repeat_tolerance_breakfast: number;   // 1-10
  repeat_tolerance_lunch: number;
  repeat_tolerance_dinner: number;
  spice_tolerance: number;              // 1-4 inferred
  decay_config: {
    week_1: number;
    week_2_4: number;
    month_2_3: number;
    beyond: number;
  };
}

// ─── RE Engine types ──────────────────────────────────────────────────────────

export interface REContext {
  user_id: string;
  meal_slot: MealSlot;
  date: Date;
  weather?: WeatherCondition;
  home_state?: string;
}

export interface WeatherCondition {
  temperature_c: number;
  humidity_percent: number;
  condition: 'sunny' | 'rainy' | 'cloudy' | 'humid' | 'cold';
}

export interface ScoredDish {
  dish: Dish;
  score: number;
  score_breakdown: ScoreBreakdown;
  is_eligible: boolean;
}

export interface ScoreBreakdown {
  base: number;
  cuisine_pref: number;
  meal_item_pref: number;
  weather: number;
  day_of_week: number;
  home_state: number;
  history: number;
  variety_penalty: number;
  random: number;
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
