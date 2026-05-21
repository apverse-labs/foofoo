import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';
import type { FoodPref, CuisineRow, IngredientAlias, BucketMap } from '../types';

/**
 * @summary Save food preference to both user_diet_rules and profiles tables.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {FoodPref} foodPref - Selected food preference (veg, non_veg, egg, vegan, jain)
 * @returns {Promise<void>}
 *
 * @throws {Error} When either Supabase upsert or update fails
 *
 * @calledBy `app/(onboarding)/step-2.tsx` — on Next press
 */
export async function saveFoodPref(userId: string, foodPref: FoodPref): Promise<void> {
  try {
    const [dietResult, profileResult] = await Promise.all([
      supabase
        .from('user_diet_rules')
        .upsert({ user_id: userId, food_pref: foodPref }, { onConflict: 'user_id' }),
      supabase
        .from('profiles')
        .update({ food_pref: foodPref })
        .eq('id', userId),
    ]);
    if (dietResult.error) throw dietResult.error;
    if (profileResult.error) throw profileResult.error;
  } catch (err: any) {
    Logger.error('ONBOARDING', 'saveFoodPref failed', { error: err?.message, userId, foodPref });
    throw err;
  }
}

/**
 * @summary Save allergen ingredient IDs to user_diet_rules.excluded_ingredients.
 *
 * @description Stores integer IDs (not text) to avoid language-matching bugs.
 *   Pass an empty array when the user toggles "No allergies".
 *
 * @param {string} userId - Supabase auth UUID
 * @param {number[]} ingredientIds - Integer IDs from ingredient_aliases table
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase upsert fails
 *
 * @calledBy `app/(onboarding)/step-3.tsx` — on Next press
 */
export async function saveAllergens(userId: string, ingredientIds: number[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_diet_rules')
      .upsert(
        { user_id: userId, excluded_ingredients: ingredientIds },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
  } catch (err: any) {
    Logger.error('ONBOARDING', 'saveAllergens failed', { error: err?.message, userId });
    throw err;
  }
}

/**
 * @summary Search ingredient_aliases by alias text (case-insensitive, min 2 chars).
 *
 * @param {string} query - User search term (at least 2 characters)
 * @returns {Promise<IngredientAlias[]>} Up to 20 matching alias rows; empty array on error
 *
 * @calledBy `app/(onboarding)/step-3.tsx` — as user types in allergen search field
 */
export async function searchIngredients(query: string): Promise<IngredientAlias[]> {
  try {
    const { data, error } = await supabase
      .from('ingredient_aliases')
      .select('alias, ingredient_id')
      .ilike('alias', `%${query}%`)
      .limit(20);
    if (error) throw error;
    return (data ?? []) as IngredientAlias[];
  } catch (err: any) {
    Logger.error('ONBOARDING', 'searchIngredients failed', { error: err?.message, query });
    return [];
  }
}

/**
 * @summary Fetch the user's existing diet rules for pre-population on resume.
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<{ food_pref: FoodPref | null; excluded_ingredients: number[] } | null>}
 *   Diet rule row, or null if none exists or on error
 *
 * @calledBy Steps 2 and 3 — on mount to pre-fill prior selections
 */
export async function fetchUserDietRules(userId: string): Promise<{ food_pref: FoodPref | null; excluded_ingredients: number[] } | null> {
  try {
    const { data, error } = await supabase
      .from('user_diet_rules')
      .select('food_pref, excluded_ingredients')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err: any) {
    Logger.error('ONBOARDING', 'fetchUserDietRules failed', { error: err?.message, userId });
    return null;
  }
}

/**
 * @summary Fetch all active user-facing cuisines ordered by tier and display_order.
 *
 * @returns {Promise<CuisineRow[]>} Array of cuisine rows for BucketSelector; empty array on error
 *
 * @calledBy `app/(onboarding)/step-4.tsx` — on mount
 */
export async function fetchCuisines(): Promise<CuisineRow[]> {
  try {
    const { data, error } = await supabase
      .from('cuisines_master')
      .select('id, code, name, display_name, tier, display_order, is_active, is_user_facing')
      .eq('is_active', true)
      .eq('is_user_facing', true)
      .order('tier', { ascending: true })
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CuisineRow[];
  } catch (err: any) {
    Logger.error('ONBOARDING', 'fetchCuisines failed', { error: err?.message });
    return [];
  }
}

/**
 * @summary Save cuisine bucket preferences for a user, replacing all prior rows.
 *
 * @description Deletes existing cuisine rows for the user, then inserts the new set.
 *   This replace-all strategy avoids stale rows when the user goes back and changes buckets.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {BucketMap} buckets - Cuisine codes (string) sorted into F/O/N buckets
 * @returns {Promise<void>}
 *
 * @throws {Error} When the delete or insert fails
 *
 * @calledBy `app/(onboarding)/step-4.tsx` — on Next press
 */
export async function saveCuisineBuckets(userId: string, buckets: BucketMap): Promise<void> {
  try {
    const { error: deleteError } = await supabase
      .from('user_category_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('category_type', 'cuisine');
    if (deleteError) throw new Error('[onboarding.repository] saveCuisineBuckets delete failed: ' + deleteError.message);

    const rows = [
      ...buckets.F.map((code) => ({ user_id: userId, category_type: 'cuisine', category_id: code, bucket: 'F' })),
      ...buckets.O.map((code) => ({ user_id: userId, category_type: 'cuisine', category_id: code, bucket: 'O' })),
      ...buckets.N.map((code) => ({ user_id: userId, category_type: 'cuisine', category_id: code, bucket: 'N' })),
    ];
    if (rows.length === 0) return;

    const { error } = await supabase.from('user_category_preferences').insert(rows);
    if (error) throw error;
  } catch (err: any) {
    Logger.error('ONBOARDING', 'saveCuisineBuckets failed', { error: err?.message, userId });
    throw err;
  }
}

/**
 * @summary Fetch the user's saved cuisine bucket preferences for resume support.
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<BucketMap>} Cuisine codes split by F/O/N bucket; empty map on error
 *
 * @calledBy `app/(onboarding)/step-4.tsx` — on mount to restore prior selections
 */
export async function fetchUserCuisineBuckets(userId: string): Promise<BucketMap> {
  const defaultMap: BucketMap = { F: [], O: [], N: [] };
  try {
    const { data, error } = await supabase
      .from('user_category_preferences')
      .select('category_id, bucket')
      .eq('user_id', userId)
      .eq('category_type', 'cuisine');
    if (error) throw error;
    (data ?? []).forEach((row) => {
      const b = row.bucket as 'F' | 'O' | 'N';
      if (defaultMap[b]) defaultMap[b].push(row.category_id as string);
    });
    return defaultMap;
  } catch (err: any) {
    Logger.error('ONBOARDING', 'fetchUserCuisineBuckets failed', { error: err?.message, userId });
    return defaultMap;
  }
}

/**
 * @summary Alias for searchIngredients — preferred name in Phase 3 audit spec.
 *
 * @param {string} searchTerm - Min 2 chars typed by user
 * @returns {Promise<IngredientAlias[]>} Up to 20 matching rows
 *
 * @calledBy `app/(onboarding)/step-3.tsx` allergen search input
 */
export const searchAllergens = searchIngredients;

/**
 * @summary Search ingredients_master by English name (case-insensitive).
 *
 * @description Use alongside searchAllergens for full allergen coverage when the
 *   alias table does not contain the user's typed term.
 *
 * @param {string} searchTerm - Min 2 chars typed by user
 * @returns {Promise<Array<{ id: number; name: string; is_allergen: boolean }>>} Up to 10 matches; empty array on error
 *
 * @calledBy `app/(onboarding)/step-3.tsx` — combined with searchAllergens for full coverage
 */
export async function searchIngredientsByName(
  searchTerm: string
): Promise<Array<{ id: number; name: string; is_allergen: boolean }>> {
  try {
    const { data, error } = await supabase
      .from('ingredients_master')
      .select('id, name, is_allergen')
      .ilike('name', `%${searchTerm}%`)
      .eq('is_active', true)
      .limit(10);
    if (error) throw error;
    return (data ?? []) as Array<{ id: number; name: string; is_allergen: boolean }>;
  } catch (err: any) {
    Logger.error('ONBOARDING', 'searchIngredientsByName failed', { error: err?.message, searchTerm });
    return [];
  }
}
