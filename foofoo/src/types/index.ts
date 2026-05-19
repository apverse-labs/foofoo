export type FoodPref = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';
export type DietType = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DishRole = 'main' | 'side' | 'accompaniment' | 'dessert' | 'snack';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SpiceLevel = 1 | 2 | 3 | 4;

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
