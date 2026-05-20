export type FoodPref = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';
export type DietType = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DishRole = 'main' | 'side' | 'accompaniment' | 'dessert' | 'snack';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SpiceLevel = 1 | 2 | 3 | 4;
export type BucketType = 'F' | 'O' | 'N';
export type UserRole = 'cook' | 'instruct';

export interface BucketItem {
  id: string;
  label: string;
  emoji?: string;
}

export interface BucketMap {
  F: string[];
  O: string[];
  N: string[];
}

export interface CuisineRow {
  id: number;
  code: string;
  name: string;
  display_name: string;
  tier: number;
  display_order: number;
  is_active: boolean;
  is_user_facing: boolean;
}

export interface DishRow {
  id: number;
  name: string;
  meal_types: MealSlot[];
  cuisine_id: number;
  diet_type: DietType;
}

export interface IngredientAlias {
  alias: string;
  ingredient_id: number;
}

export interface UserDietRules {
  user_id: string;
  food_pref: FoodPref | null;
  excluded_ingredients: number[];
}

export interface Step1Data {
  name: string;
  username: string;
  home_state: string;
  current_city: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  food_pref: FoodPref;
  home_state: string | null;
  current_city: string | null;
  household_type: 'solo' | 'couple' | 'family_with_kids' | 'flatmates' | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Dish {
  id: number;
  name: string;
  slug: string;
  cuisine_id: number;
  diet_type: DietType;
  dish_role: DishRole;
  meal_types: MealSlot[];
  spice_level: SpiceLevel;
  difficulty: Difficulty;
  cook_time_mins: number;
  calories: number;
  hero_image_url: string | null;
  blurhash: string | null;
  is_active: boolean;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string;
  breakfast_dish_id: number | null;
  lunch_dish_id: number | null;
  dinner_dish_id: number | null;
  is_locked_breakfast: boolean;
  is_locked_lunch: boolean;
  is_locked_dinner: boolean;
  created_at: string;
}

export interface MealCard {
  slot: MealSlot;
  dish: Dish;
  isLocked: boolean;
  carouselOptions: Dish[];
}

export interface REInput {
  userId: string;
  planDate: string;
  weatherCode?: number;
  forceRegenerate?: boolean;
}

export interface REScore {
  dishId: number;
  totalScore: number;
  hardFilterPassed: boolean;
  components: {
    cuisineBoost: number;
    weatherBoost: number;
    homeStateBoost: number;
    varietyPenalty: number;
    historyScore: number;
    randomFactor: number;
  };
}

export interface OfflinePlan {
  plan: DailyPlan;
  cachedAt: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
