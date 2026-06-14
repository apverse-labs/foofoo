export type FoodPref = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';
export type SuggestionAction =
  | 'viewed'
  | 'shown'
  | 'swiped'
  | 'swiped_to'
  | 'swiped_past'
  | 'locked'
  | 'unlocked'
  | 'tapped_detail'
  | 'tapped_ingredients'
  | 'not_today'
  | 'never'
  | 'added_to_date'
  | 'refresh';
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

export interface Cuisine {
  id: number;
  code: string;
  name: string;
  display_name?: string | null;
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
  /** Cloudinary public_id, e.g. "curd_rice_hero_01_qxxbm7". Null until sync-cloudinary-images runs. */
  cloudinary_public_id: string | null;
  blurhash: string | null;
  is_active: boolean;
  allergen_ids?: number[] | null;
  is_jain?: boolean | null;
  description?: string | null;
  cuisines?: Cuisine | null;
}

export interface DishTagRow {
  tag_id: number;
  tags: {
    id: number;
    category: string;
    value: string;
    display_name: string;
    tier: number | null;
  } | null;
}

export interface IngredientRow {
  id: number;
  name: string;
  slug: string;
  category: string;
  is_veg: boolean | null;
  is_vegan: boolean | null;
  is_jain_compatible: boolean | null;
  is_gluten: boolean | null;
  is_dairy: boolean | null;
  is_nut: boolean | null;
  is_egg: boolean | null;
}

export interface MealIngredientRow {
  display_order: number | null;
  ingredients: IngredientRow | null;
}

export interface FullDish extends Dish {
  description: string | null;
  allergen_ids: number[] | null;
  is_jain: boolean | null;
  dish_tags: DishTagRow[];
  meal_ingredients: MealIngredientRow[];
}

export interface SimilarDishRow {
  similar_dish_id: number;
  dishes: {
    id: number;
    name: string;
    hero_image_url: string | null;
    cloudinary_public_id: string | null;
    blurhash: string | null;
    diet_type: DietType;
    cook_time_mins: number;
    cuisines?: { name: string } | null;
  } | null;
}

export interface GroceryIngredient {
  id: number;
  name: string;
  slug: string;
  category: string;
  is_veg: boolean | null;
  is_vegan: boolean | null;
  is_jain_compatible: boolean | null;
}

export interface GroceryCategory {
  category: string;
  displayName: string;
  emoji: string;
  ingredients: GroceryIngredient[];
}

export interface PlannerSlot {
  dish: Dish | null;
  carouselCount: number;
}

export interface RESummaryAlternative {
  dish_name: string;
  final_score: number;
  why_not_first: string;
}

// ─── RE Module Types ──────────────────────────────────────────────────────────

export type REEngineVersion =
  | 'classfirst_v1'
  | 'legacy_dish_scoring_v1'
  | 'legacy_dish_scoring_v2';

export type CookDependency =
  | 'self_cook'
  | 'skilled_cook'
  | 'cook_needs_instruction'
  | 'maid_simple'
  | 'tiffin_pg_no_kitchen'
  | 'delivery_heavy';

export type HealthOverlayCode =
  | 'weight_loss'
  | 'high_protein_fitness'
  | 'veg_protein_seeker'
  | 'diabetic_management'
  | 'hypertension_heart'
  | 'fasting_ritual'
  | 'pregnancy_support'
  | 'postpartum_lactation';

export type HealthScope = 'all' | 'member_only';

export type MemberSegment =
  | 'baby_6_18m'
  | 'toddler'
  | 'school_child'
  | 'teen_high_appetite'
  | 'picky_child'
  | 'pregnant_member'
  | 'lactating_or_postpartum_mother'
  | 'elderly_member'
  | 'diabetic_member'
  | 'hypertension_heart_member'
  | 'recovery_member';

export interface REState {
  state_id: string;
  state_ut: string;
}

export interface REMainCohort {
  main_cohort_id: string;
  main_cohort_label: string;
  user_understands_as: string;
  subcohort_screen_copy: string;
}

export interface RESubcohort {
  sub_cohort_id: string;
  main_cohort_id: string;
  show_as_chip_text: string;
  maps_to_persona_id: string;
}

export interface REHouseholdProfile {
  id?: string;
  profile_id: string;
  main_cohort_id: string | null;
  sub_cohort_id: string | null;
  persona_id: string | null;
  cohort_id: string | null;
  overlay_persona_ids: string[];
  nonveg_meals_per_week: number | null;
  preferred_protein_types: string[];
  cook_dependency: CookDependency | null;
  health_overlay_code: HealthOverlayCode | null;
  health_scope: HealthScope | null;
  city_destination_group: string | null;
}

export interface REHouseholdMember {
  id?: string;
  profile_id: string;
  member_segment: MemberSegment;
  age_band: string | null;
}

export interface RESummarySlot {
  winner: { name: string; score: number; cuisine: string };
  alternatives: RESummaryAlternative[];
  reasoning: string;
}

export interface RESummary {
  breakfast: RESummarySlot | null;
  lunch: RESummarySlot | null;
  dinner: RESummarySlot | null;
}

export interface GeneratedPlan {
  planId: string;
  planDate: string;
  reVersion: string;
  generatedInMs?: number;
  breakfast: PlannerSlot;
  lunch: PlannerSlot;
  dinner: PlannerSlot;
  cached: boolean;
  reSummary?: RESummary;
}

export interface CarouselDish {
  ref_id: number;
  ref_type: string;
  meal_slot: string;
  position: number;
  dishes: Dish;
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

// ── RE BUILD-04: Weekly Class-First Plan ──────────────────────────────────────
export interface REMealClassRef {
  classCode: string;
  display: string;
}

export interface REDayPlan {
  dayOfWeek: string;
  weekdayWeekend: 'Weekday' | 'Weekend';
  breakfast: REMealClassRef | null;
  lunch: REMealClassRef | null;
  snack: REMealClassRef | null;
  dinner: REMealClassRef | null;
}

export interface REWeeklyPlan {
  profileId: string;
  cohortId: string | null;
  planWeekStart: string;
  days: REDayPlan[];
  engineVersion: string;
}

// ── RE BUILD-05: Member-Specific Add-on Plans ─────────────────────────────────

export interface REAddonComponent {
  addonClassCode: string;
  addonClassName: string;
  targetMemberSegment: string;
  attachedToPrimaryClass: string | null;
}

export interface RESlotAddons {
  breakfast: REAddonComponent[];
  lunch: REAddonComponent[];
  snack: REAddonComponent[];
  dinner: REAddonComponent[];
}

export interface REDayAddonPlan {
  dayOfWeek: string;
  addons: RESlotAddons;
}

export interface REWeeklyAddonPlan {
  profileId: string;
  planWeekStart: string;
  days: REDayAddonPlan[];
  engineVersion: string;
}

// ── RE BUILD-06: Dish Expansion & Food DNA Ranking ────────────────────────────

export interface REDishCandidate {
  dishOptionId: string;
  dishName: string;
  dietType: string;
  regionRelevance: string;
  score: number;
}

export interface RESlotDishCandidates {
  classCode: string;
  classDisplay: string;
  topDishes: REDishCandidate[];
}

export interface REDayDishCandidates {
  dayOfWeek: string;
  breakfast: RESlotDishCandidates | null;
  lunch: RESlotDishCandidates | null;
  snack: RESlotDishCandidates | null;
  dinner: RESlotDishCandidates | null;
}
