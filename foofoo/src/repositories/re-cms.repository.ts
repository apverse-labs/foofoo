/**
 * re-cms.repository.ts — Admin CMS write operations for RE taxonomy data.
 * Seq 18–23 (BUILD-09): Meal Class, Dish Catalog, Food DNA Tagger,
 *   Add-on, Regional Overlay, Weekly Matrix managers.
 *
 * All write operations require service-role access. RLS prevents app users
 * from calling these directly.
 */

import { supabaseRE } from '../services/supabase-re';
import { Logger } from '../utils/systemLogger';

// ── Seq 18: Meal Class Manager ────────────────────────────────────────────────

export interface MealClassUpsertInput {
  mealClassCode: string;
  className: string;
  slotGroup: string;
  dietType: string;
  weekdayFit: number;
  weekendFit: number;
  cookComplexity: string;
  regionRelevance?: string;
  foodDnaTags?: string;
  classFamilyCode?: string;
  allowedAsWeeklyPrimary?: boolean;
  isActive?: boolean;
}

/**
 * @summary Upsert a meal class record (Seq 18 — Meal Class Manager).
 * @description Creates or updates a re_meal_classes row. On update, existing
 *   re_class_dish_options are not modified — only class metadata changes.
 */
export async function upsertMealClass(input: MealClassUpsertInput): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_meal_classes')
      .upsert({
        meal_class_code: input.mealClassCode,
        class_name: input.className,
        slot_group: input.slotGroup,
        diet_type: input.dietType,
        weekday_fit: input.weekdayFit,
        weekend_fit: input.weekendFit,
        cook_complexity: input.cookComplexity,
        region_relevance: input.regionRelevance ?? null,
        food_dna_tags: input.foodDnaTags ?? null,
        class_family_code: input.classFamilyCode ?? null,
        allowed_as_weekly_primary: input.allowedAsWeeklyPrimary ?? true,
        is_active: input.isActive ?? true,
      }, { onConflict: 'meal_class_code' });
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'upsertMealClass failed', {
      error: err instanceof Error ? err.message : String(err), code: input.mealClassCode,
    });
    throw err;
  }
}

/**
 * @summary Soft-deprecate a meal class (Seq 18).
 * @description Sets is_active=false. Does not remove existing dish options or plans.
 */
export async function deprecateMealClass(mealClassCode: string): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_meal_classes')
      .update({ is_active: false })
      .eq('meal_class_code', mealClassCode);
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'deprecateMealClass failed', {
      error: err instanceof Error ? err.message : String(err), mealClassCode,
    });
    throw err;
  }
}

// ── Seq 19: Dish Catalog Manager ──────────────────────────────────────────────

export interface DishOptionUpsertInput {
  dishOptionId: string;
  mealClassCode: string;
  dishName: string;
  dietType: string;
  regionRelevance?: string;
  slotGroup?: string;
  usageNote?: string;
  isJain?: boolean;
  allergenIds?: number[];
}

/**
 * @summary Upsert a dish option under a meal class (Seq 19 — Dish Catalog Manager).
 */
export async function upsertDishOption(input: DishOptionUpsertInput): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_class_dish_options')
      .upsert({
        dish_option_id: input.dishOptionId,
        meal_class_code: input.mealClassCode,
        dish_name: input.dishName,
        diet_type: input.dietType,
        region_relevance: input.regionRelevance ?? null,
        slot_group: input.slotGroup ?? null,
        usage_note: input.usageNote ?? null,
        is_jain: input.isJain ?? false,
        allergen_ids: input.allergenIds ?? [],
      }, { onConflict: 'dish_option_id' });
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'upsertDishOption failed', {
      error: err instanceof Error ? err.message : String(err), id: input.dishOptionId,
    });
    throw err;
  }
}

/**
 * @summary Remap a dish option to a different meal class (Seq 19).
 * @description Updates meal_class_code. Used when taxonomy restructuring moves dishes.
 */
export async function remapDishToClass(dishOptionId: string, newMealClassCode: string): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_class_dish_options')
      .update({ meal_class_code: newMealClassCode })
      .eq('dish_option_id', dishOptionId);
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'remapDishToClass failed', {
      error: err instanceof Error ? err.message : String(err), dishOptionId, newMealClassCode,
    });
    throw err;
  }
}

// ── Seq 20: Food DNA Tagger ───────────────────────────────────────────────────

/**
 * @summary Update food_dna_tags on a meal class (Seq 20 — Food DNA Tagger).
 * @param mealClassCode - Target class.
 * @param foodDnaTags - Comma-separated tag string e.g. "comfort,light,familiar".
 */
export async function updateClassFoodDnaTags(mealClassCode: string, foodDnaTags: string): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_meal_classes')
      .update({ food_dna_tags: foodDnaTags })
      .eq('meal_class_code', mealClassCode);
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'updateClassFoodDnaTags failed', {
      error: err instanceof Error ? err.message : String(err), mealClassCode,
    });
    throw err;
  }
}

/**
 * @summary Bulk-tag allergen IDs on a dish option (Seq 20).
 */
export async function tagDishAllergens(dishOptionId: string, allergenIds: number[]): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_class_dish_options')
      .update({ allergen_ids: allergenIds })
      .eq('dish_option_id', dishOptionId);
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'tagDishAllergens failed', {
      error: err instanceof Error ? err.message : String(err), dishOptionId,
    });
    throw err;
  }
}

// ── Seq 21: Add-on Manager ────────────────────────────────────────────────────

export interface AddonClassUpsertInput {
  addonClassCode: string;
  addonClassName: string;
  targetMemberSegment: string;
  slotGroup?: string;
  dietType?: string;
  foodDnaRole?: string;
  planningNote?: string;
}

/**
 * @summary Upsert an add-on class (Seq 21 — Add-on Manager).
 */
export async function upsertAddonClass(input: AddonClassUpsertInput): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_addon_classes')
      .upsert({
        addon_class_code: input.addonClassCode,
        addon_class_name: input.addonClassName,
        target_member_segment: input.targetMemberSegment,
        slot_group: input.slotGroup ?? null,
        diet_type: input.dietType ?? null,
        food_dna_role: input.foodDnaRole ?? null,
        planning_note: input.planningNote ?? null,
      }, { onConflict: 'addon_class_code' });
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'upsertAddonClass failed', {
      error: err instanceof Error ? err.message : String(err), code: input.addonClassCode,
    });
    throw err;
  }
}

export interface AddonDishOptionUpsertInput {
  addonDishOptionId: string;
  addonClassCode: string;
  dishOrComponentName: string;
  targetMemberSegment?: string;
  slotGroup?: string;
  dietType?: string;
  usageNote?: string;
}

/**
 * @summary Upsert an add-on dish option (Seq 21).
 */
export async function upsertAddonDishOption(input: AddonDishOptionUpsertInput): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_addon_dish_options')
      .upsert({
        addon_dish_option_id: input.addonDishOptionId,
        addon_class_code: input.addonClassCode,
        dish_or_component_name: input.dishOrComponentName,
        target_member_segment: input.targetMemberSegment ?? null,
        slot_group: input.slotGroup ?? null,
        diet_type: input.dietType ?? null,
        usage_note: input.usageNote ?? null,
      }, { onConflict: 'addon_dish_option_id' });
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'upsertAddonDishOption failed', {
      error: err instanceof Error ? err.message : String(err), id: input.addonDishOptionId,
    });
    throw err;
  }
}

// ── Seq 22: Regional Overlay Manager ─────────────────────────────────────────

export interface RegionalOverlayUpsertInput {
  overlayId: string;
  originStateId: string;
  destinationGroupCode: string;
  overlayMealClasses: string[];
  blendWeightOrigin?: number;
  blendWeightDestination?: number;
}

/**
 * @summary Upsert a city migration overlay (Seq 22 — Regional Overlay Manager).
 */
export async function upsertRegionalOverlay(input: RegionalOverlayUpsertInput): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_city_migration_overlays')
      .upsert({
        overlay_id: input.overlayId,
        origin_state_id: input.originStateId,
        destination_group_code: input.destinationGroupCode,
        overlay_meal_classes: input.overlayMealClasses,
        blend_weight_origin: input.blendWeightOrigin ?? 0.6,
        blend_weight_destination: input.blendWeightDestination ?? 0.4,
      }, { onConflict: 'overlay_id' });
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'upsertRegionalOverlay failed', {
      error: err instanceof Error ? err.message : String(err), id: input.overlayId,
    });
    throw err;
  }
}

// ── Seq 23: Weekly Matrix Manager ────────────────────────────────────────────

export interface WeeklyClassPlanUpsertInput {
  planDayId: string;
  cohortId: string;
  dayOfWeek: string;
  weekdayWeekend: 'Weekday' | 'Weekend';
  breakfastPrimaryClass: string | null;
  breakfastSecondaryClass?: string | null;
  lunchPrimaryClass: string | null;
  lunchSecondaryClass?: string | null;
  snackPrimaryClass?: string | null;
  dinnerPrimaryClass: string | null;
  dinnerSecondaryClass?: string | null;
}

/**
 * @summary Upsert a row in the weekly class plan matrix (Seq 23 — Weekly Matrix Manager).
 */
export async function upsertWeeklyClassPlan(input: WeeklyClassPlanUpsertInput): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_weekly_class_plans')
      .upsert({
        plan_day_id: input.planDayId,
        cohort_id: input.cohortId,
        day_of_week: input.dayOfWeek,
        weekday_weekend: input.weekdayWeekend,
        breakfast_primary_class: input.breakfastPrimaryClass,
        breakfast_secondary_class: input.breakfastSecondaryClass ?? null,
        lunch_primary_class: input.lunchPrimaryClass,
        lunch_secondary_class: input.lunchSecondaryClass ?? null,
        snack_primary_class: input.snackPrimaryClass ?? null,
        dinner_primary_class: input.dinnerPrimaryClass,
        dinner_secondary_class: input.dinnerSecondaryClass ?? null,
      }, { onConflict: 'plan_day_id' });
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'upsertWeeklyClassPlan failed', {
      error: err instanceof Error ? err.message : String(err), id: input.planDayId,
    });
    throw err;
  }
}

export interface AddonPlanUpsertInput {
  addonPlanId: string;
  cohortId: string;
  personaId: string;
  dayOfWeek: string;
  mealSlot: string;
  targetMemberSegment: string;
  addonClassCode: string;
}

/**
 * @summary Upsert a row in the household addon component plan matrix (Seq 23).
 */
export async function upsertAddonPlan(input: AddonPlanUpsertInput): Promise<void> {
  try {
    const { error } = await supabaseRE
      .from('re_household_addon_component_plans')
      .upsert({
        addon_plan_id: input.addonPlanId,
        cohort_id: input.cohortId,
        persona_id: input.personaId,
        day_of_week: input.dayOfWeek,
        meal_slot: input.mealSlot,
        target_member_segment: input.targetMemberSegment,
        addon_class_code: input.addonClassCode,
      }, { onConflict: 'addon_plan_id' });
    if (error) throw error;
  } catch (err: unknown) {
    Logger.error('RE_CMS', 'upsertAddonPlan failed', {
      error: err instanceof Error ? err.message : String(err), id: input.addonPlanId,
    });
    throw err;
  }
}
