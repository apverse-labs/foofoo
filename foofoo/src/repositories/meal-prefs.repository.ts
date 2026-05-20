import { supabase } from '../services/supabase';
import type { DishRow, BucketMap } from '../types';

/**
 * @summary Fetch breakfast dishes filtered by cuisine IDs (top 20).
 *
 * @param {number[]} cuisineIds - Integer IDs of F+O cuisines from Step 4
 * @returns {Promise<DishRow[]>} Up to 20 breakfast dishes
 *
 * @calledBy `app/(onboarding)/step-5.tsx` — on mount
 */
export async function fetchBreakfastDishes(cuisineIds: number[]): Promise<DishRow[]> {
  if (cuisineIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('dishes')
      .select('id, name, meal_types, cuisine_id, diet_type')
      .contains('meal_types', ['breakfast'])
      .in('cuisine_id', cuisineIds)
      .eq('is_active', true)
      .limit(20);
    if (error) throw error;
    return (data ?? []) as DishRow[];
  } catch (err) {
    console.error('[MEAL-PREFS] fetchBreakfastDishes failed:', err);
    return [];
  }
}

/**
 * @summary Fetch lunch/dinner dishes filtered by cuisine IDs, deduplicated (top 30).
 *
 * @param {number[]} cuisineIds - Integer IDs of F+O cuisines from Step 4
 * @returns {Promise<DishRow[]>} Up to 30 unique lunch or dinner dishes
 *
 * @calledBy `app/(onboarding)/step-6.tsx` — on mount
 */
export async function fetchLunchDinnerDishes(cuisineIds: number[]): Promise<DishRow[]> {
  if (cuisineIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('dishes')
      .select('id, name, meal_types, cuisine_id, diet_type')
      .overlaps('meal_types', ['lunch', 'dinner'])
      .in('cuisine_id', cuisineIds)
      .eq('is_active', true)
      .limit(30);
    if (error) throw error;
    const seen = new Set<number>();
    return ((data ?? []) as DishRow[]).filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
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
    await supabase
      .from('user_category_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('category_type', 'meal_item')
      .in('category_id', dishIds);
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
      { user_id: userId, data_consent_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}
