import { supabase } from '../services/supabase';
import type { DishRow, BucketMap, FoodPref } from '../types';

// Diets that must see ONLY matching dishes (veg/vegan/jain are strict).
// non_veg and egg see all dishes.
const STRICT_DIETS: FoodPref[] = ['veg', 'vegan', 'jain'];

/**
 * @summary Fetch breakfast dishes, filtered by cuisine preference and diet type.
 *
 * @param {number[]} cuisineIds - Integer IDs of F+O cuisines from Step 4
 * @param {FoodPref | null} [foodPref] - User's food preference; filters diet for strict diets
 * @returns {Promise<DishRow[]>} Up to 20 breakfast dishes
 *
 * @description Falls back to all cuisines if the filtered set has fewer than 5 results,
 *   keeping the diet filter so strict-diet users never see excluded dishes.
 *
 * @calledBy `app/(onboarding)/step-5.tsx` — on mount
 */
export async function fetchBreakfastDishes(cuisineIds: number[], foodPref?: FoodPref | null): Promise<DishRow[]> {
  try {
    const isStrict = foodPref && STRICT_DIETS.includes(foodPref);

    let query = supabase
      .from('dishes')
      .select('id, name, meal_types, cuisine_id, diet_type')
      .contains('meal_types', ['breakfast'])
      .eq('is_active', true);
    if (cuisineIds.length > 0) query = query.in('cuisine_id', cuisineIds) as typeof query;
    if (isStrict) query = query.eq('diet_type', foodPref) as typeof query;

    const { data, error } = await query.limit(20);
    if (error) throw error;

    // Too few results with cuisine filter → drop cuisine filter, keep diet filter
    if ((data ?? []).length < 5 && cuisineIds.length > 0) {
      let fallback = supabase
        .from('dishes')
        .select('id, name, meal_types, cuisine_id, diet_type')
        .contains('meal_types', ['breakfast'])
        .eq('is_active', true);
      if (isStrict) fallback = fallback.eq('diet_type', foodPref) as typeof fallback;
      const { data: fbData } = await fallback.limit(20);
      return (fbData ?? []) as DishRow[];
    }

    return (data ?? []) as DishRow[];
  } catch (err) {
    console.error('[MEAL-PREFS] fetchBreakfastDishes failed:', err);
    return [];
  }
}

/**
 * @summary Fetch lunch/dinner dishes filtered by cuisine preference and diet type (top 30).
 *
 * @param {number[]} cuisineIds - Integer IDs of F+O cuisines from Step 4
 * @param {FoodPref | null} [foodPref] - User's food preference; filters diet for strict diets
 * @returns {Promise<DishRow[]>} Up to 30 unique lunch or dinner dishes
 *
 * @description Falls back to all cuisines if the filtered set has fewer than 5 results.
 *
 * @calledBy `app/(onboarding)/step-6.tsx` — on mount
 */
export async function fetchLunchDinnerDishes(cuisineIds: number[], foodPref?: FoodPref | null): Promise<DishRow[]> {
  const dedup = (rows: DishRow[]) => {
    const seen = new Set<number>();
    return rows.filter((d) => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
  };

  try {
    const isStrict = foodPref && STRICT_DIETS.includes(foodPref);

    let query = supabase
      .from('dishes')
      .select('id, name, meal_types, cuisine_id, diet_type')
      .overlaps('meal_types', ['lunch', 'dinner'])
      .eq('is_active', true);
    if (cuisineIds.length > 0) query = query.in('cuisine_id', cuisineIds) as typeof query;
    if (isStrict) query = query.eq('diet_type', foodPref) as typeof query;

    const { data, error } = await query.limit(30);
    if (error) throw error;

    // Too few results with cuisine filter → drop cuisine filter, keep diet filter
    if ((data ?? []).length < 5 && cuisineIds.length > 0) {
      let fallback = supabase
        .from('dishes')
        .select('id, name, meal_types, cuisine_id, diet_type')
        .overlaps('meal_types', ['lunch', 'dinner'])
        .eq('is_active', true);
      if (isStrict) fallback = fallback.eq('diet_type', foodPref) as typeof fallback;
      const { data: fbData } = await fallback.limit(30);
      return dedup((fbData ?? []) as DishRow[]);
    }

    return dedup((data ?? []) as DishRow[]);
  } catch (err) {
    console.error('[MEAL-PREFS] fetchLunchDinnerDishes failed:', err);
    return [];
  }
}

/**
 * @summary Save meal-item bucket preferences, replacing rows for the given dish IDs.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {BucketMap} buckets - Dish IDs (as strings) sorted into F/O/N buckets
 * @param {string[]} dishIds - Full list of dish IDs being sorted (used to scope the delete)
 *
 * @calledBy Steps 5 and 6 — on Next press
 */
export async function saveMealBuckets(
  userId: string,
  buckets: BucketMap,
  dishIds: string[]
): Promise<void> {
  if (dishIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('user_category_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('category_type', 'meal_item')
      .in('category_id', dishIds);
    if (deleteError) throw new Error('[meal-prefs.repository] saveMealBuckets delete failed: ' + deleteError.message);
  }

  const rows = [
    ...buckets.F.map((id) => ({ user_id: userId, category_type: 'meal_item', category_id: id, bucket: 'F' })),
    ...buckets.O.map((id) => ({ user_id: userId, category_type: 'meal_item', category_id: id, bucket: 'O' })),
    ...buckets.N.map((id) => ({ user_id: userId, category_type: 'meal_item', category_id: id, bucket: 'N' })),
  ];
  if (rows.length === 0) return;

  const { error } = await supabase.from('user_category_preferences').insert(rows);
  if (error) throw error;
}

/**
 * @summary Fetch cuisine integer IDs for the user's F+O cuisine preferences.
 *
 * @description Joins user_category_preferences (cuisine.code) with cuisines_master (id)
 *   so dish queries can filter by integer cuisine_id.
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<number[]>} Array of integer cuisine IDs
 *
 * @calledBy Steps 5 and 6 — on mount to build dish query
 */
export async function fetchFOCuisineIds(userId: string): Promise<number[]> {
  try {
    const { data: prefs, error: prefErr } = await supabase
      .from('user_category_preferences')
      .select('category_id')
      .eq('user_id', userId)
      .eq('category_type', 'cuisine')
      .in('bucket', ['F', 'O']);
    if (prefErr) throw prefErr;

    const codes = (prefs ?? []).map((r) => r.category_id as string);
    if (codes.length === 0) return [];

    const { data: cuisines, error: cErr } = await supabase
      .from('cuisines_master')
      .select('id')
      .in('code', codes);
    if (cErr) throw cErr;

    return (cuisines ?? []).map((c) => c.id as number);
  } catch (err) {
    console.error('[MEAL-PREFS] fetchFOCuisineIds failed:', err);
    return [];
  }
}

/**
 * @summary Record user data consent timestamp in user_consent table.
 *
 * @param {string} userId - Supabase auth UUID
 *
 * @calledBy `app/(onboarding)/step-7.tsx` — on "Start Using Foofoo" press
 */
export async function recordConsent(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_consent')
    .upsert(
      { user_id: userId, data_consent_at: new Date().toISOString(), data_consent_version: 'v1.0' },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

/**
 * @summary Fetch existing meal-item bucket preferences for the given dish IDs.
 * Used to pre-populate BucketSelector on back navigation (Fix 5 — step persistence).
 *
 * @param {string} userId - Supabase auth UUID
 * @param {string[]} dishIds - String IDs of dishes currently shown
 * @returns {Promise<BucketMap>} Prior bucket assignments scoped to these dishes
 *
 * @calledBy Steps 5 and 6 — on mount to restore prior selections
 */
export async function fetchUserMealBuckets(userId: string, dishIds: string[]): Promise<BucketMap> {
  const defaultMap: BucketMap = { F: [], O: [], N: [] };
  if (dishIds.length === 0) return defaultMap;
  try {
    const { data, error } = await supabase
      .from('user_category_preferences')
      .select('category_id, bucket')
      .eq('user_id', userId)
      .eq('category_type', 'meal_item')
      .in('category_id', dishIds);
    if (error) throw error;
    (data ?? []).forEach((row) => {
      const b = row.bucket as 'F' | 'O' | 'N';
      if (defaultMap[b]) defaultMap[b].push(row.category_id as string);
    });
    return defaultMap;
  } catch (err) {
    console.error('[MEAL-PREFS] fetchUserMealBuckets failed:', err);
    return defaultMap;
  }
}
