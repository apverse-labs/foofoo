import { supabase } from '../services/supabase';
import type { FoodPref, CuisineRow, IngredientAlias, BucketMap } from '../types';

/**
 * @summary Save food preference to both user_diet_rules and profiles.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {FoodPref} foodPref - Selected food preference
 *
 * @calledBy `app/(onboarding)/step-2.tsx` — on Next press
 */
export async function saveFoodPref(userId: string, foodPref: FoodPref): Promise<void> {
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
}

/**
 * @summary Save allergen ingredient IDs to user_diet_rules.excluded_ingredients.
 *
 * @description Stores integer IDs (not text) to avoid language-matching bugs.
 *   Pass an empty array when user toggles "No allergies".
 *
 * @param {string} userId - Supabase auth UUID
 * @param {number[]} ingredientIds - Integer IDs from ingredient_aliases
 *
 * @calledBy `app/(onboarding)/step-3.tsx` — on Next press
 */
export async function saveAllergens(userId: string, ingredientIds: number[]): Promise<void> {
  const { error } = await supabase
    .from('user_diet_rules')
    .upsert(
      { user_id: userId, excluded_ingredients: ingredientIds },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

/**
 * @summary Search ingredient_aliases by alias text (case-insensitive, min 2 chars).
 *
 * @param {string} query - User search term (at least 2 characters)
 * @returns {Promise<IngredientAlias[]>} Up to 20 matching alias rows
 *
 * @calledBy `app/(onboarding)/step-3.tsx` — as user types in allergen search
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
  } catch (err) {
    console.error('[ONBOARDING] searchIngredients failed:', err);
    return [];
  }
}

/**
 * @summary Fetch the user's existing diet rules for pre-population.
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<{ food_pref: FoodPref | null; excluded_ingredients: number[] } | null>}
 *
 * @calledBy Steps 2 and 3 — on mount to pre-fill selections
 */
export async function fetchUserDietRules(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_diet_rules')
      .select('food_pref, excluded_ingredients')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[ONBOARDING] fetchUserDietRules failed:', err);
    return null;
  }
}

/**
 * @summary Fetch all active user-facing cuisines ordered by tier and display_order.
 *
 * @returns {Promise<CuisineRow[]>} Array of cuisine rows for BucketSelector
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
  } catch (err) {
    console.error('[ONBOARDING] fetchCuisines failed:', err);
    return [];
  }
}

/**
 * @summary Save cuisine bucket preferences for a user, replacing prior rows.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {BucketMap} buckets - Cuisine codes sorted into F/O/N buckets
 *
 * @calledBy `app/(onboarding)/step-4.tsx` — on Next press
 */
export async function saveCuisineBuckets(userId: string, buckets: BucketMap): Promise<void> {
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
}

/**
 * @summary Fetch the user's saved cuisine bucket preferences (for resume flow).
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<BucketMap>} Cuisine codes split by bucket
 *
 * @calledBy `app/(onboarding)/step-4.tsx` — on mount
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
  } catch (err) {
    console.error('[ONBOARDING] fetchUserCuisineBuckets failed:', err);
    return defaultMap;
  }
}

/**
 * @summary Search ingredient_aliases for allergen autocomplete.
 * Returns matching aliases with their integer ingredient IDs.
 * Alias for searchIngredients — preferred name in Phase 3 audit spec.
 *
 * @param {string} searchTerm - Min 2 chars typed by user
 * @returns {Promise<IngredientAlias[]>} Up to 20 matching rows
 *
 * @calledBy `app/(onboarding)/step-3.tsx` allergen search input
 */
export const searchAllergens = searchIngredients;

/**
 * @summary Search ingredients_master by English name (case-insensitive).
 * Use alongside searchAllergens for full allergen coverage.
 *
 * @param {string} searchTerm - Min 2 chars typed by user
 * @returns {Promise<Array<{ id: number; name: string; is_allergen: boolean }>>} Up to 10 matches
 *
 * @calledBy `app/(onboarding)/step-3.tsx` — combined with searchAllergens
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
  } catch (err) {
    console.error('[ONBOARDING] searchIngredientsByName failed:', err);
    return [];
  }
}
