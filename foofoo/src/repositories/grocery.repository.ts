/**
 * @summary Aggregates today's (or this week's) ingredients into a categorised list.
 *
 * @description
 * Reads planner → resolves dish IDs → loads meal_ingredients → joins ingredients
 * → groups by category. Deduplicates so the same ingredient appearing in
 * multiple dishes is shown once.
 *
 * @calledBy app/(tabs)/grocery.tsx
 */

import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';
import { CATEGORY_ORDER, categoryDisplayName, categoryEmoji } from '../utils/ingredientCategory';
import type { GroceryCategory, GroceryIngredient } from '../types';

/**
 * @summary Returns the next N IST date strings starting at planDate (inclusive).
 * @param {string} planDate - Starting YYYY-MM-DD
 * @param {number} days - Number of days
 * @returns {string[]} ISO date strings
 */
function rangeDates(planDate: string, days: number): string[] {
  const out: string[] = [];
  const start = new Date(planDate + 'T00:00:00');
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
}

/**
 * @summary Internal: fetches all dish IDs across the given plan dates.
 * @param {string} userId - Supabase auth UUID
 * @param {string[]} dates - Plan dates to include
 * @returns {Promise<number[]>} Deduplicated dish IDs across all slots
 */
async function fetchDishIdsForDates(userId: string, dates: string[]): Promise<number[]> {
  const { data: plans, error } = await supabase
    .from('planner')
    .select('breakfast_ref_id, breakfast_ref_type, lunch_ref_id, lunch_ref_type, dinner_ref_id, dinner_ref_type')
    .eq('user_id', userId)
    .in('plan_date', dates);

  if (error) {
    Logger.warn('GROCERY-REPO', 'planner fetch failed', { error: error.message });
    return [];
  }
  if (!plans?.length) return [];

  const ids = new Set<number>();
  for (const p of plans as Array<Record<string, unknown>>) {
    for (const slot of ['breakfast', 'lunch', 'dinner']) {
      const refType = p[`${slot}_ref_type`];
      const refId = p[`${slot}_ref_id`];
      // MVP only handles dish-type refs; combo support comes with RE v2
      if ((refType == null || refType === 'dish') && typeof refId === 'number') ids.add(refId);
    }
  }
  return Array.from(ids);
}

/**
 * @summary Fetches and categorises the grocery list for one date or a 7-day range.
 *
 * @description Returns category groups in CATEGORY_ORDER. Ingredients within each
 *   category are sorted alphabetically. Empty array if no plan exists.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {string} planDate - YYYY-MM-DD start date
 * @param {boolean} [weekMode=false] - If true, aggregates 7 days starting at planDate
 * @returns {Promise<GroceryCategory[]>} Categorised list (empty if no plan)
 * @throws {Error} Only on hard Supabase failure of the ingredient fetch
 * @calledBy app/(tabs)/grocery.tsx
 */
export async function getGroceryList(
  userId: string,
  planDate: string,
  weekMode = false,
): Promise<GroceryCategory[]> {
  const dates = weekMode ? rangeDates(planDate, 7) : [planDate];
  const dishIds = await fetchDishIdsForDates(userId, dates);
  if (dishIds.length === 0) return [];

  const { data: mealIngredients, error } = await supabase
    .from('meal_ingredients')
    .select(`
      dish_id,
      ingredients (
        id, name, slug, category,
        is_veg, is_vegan, is_jain_compatible
      )
    `)
    .in('dish_id', dishIds);

  if (error) {
    Logger.error('GROCERY-REPO', 'meal_ingredients fetch failed', { error: error.message });
    throw new Error(error.message);
  }
  if (!mealIngredients?.length) return [];

  // PostgREST embeds many-to-one relations as either an object or a single-element
  // array depending on schema introspection. Normalise both shapes here so the
  // grouping/dedup below doesn't have to care.
  const seen = new Set<number>();
  const unique: GroceryIngredient[] = [];
  for (const mi of (mealIngredients as unknown as Array<{ ingredients: GroceryIngredient | GroceryIngredient[] | null }>)) {
    const ing = Array.isArray(mi.ingredients) ? mi.ingredients[0] : mi.ingredients;
    if (ing && !seen.has(ing.id)) {
      seen.add(ing.id);
      unique.push(ing);
    }
  }

  const grouped: Record<string, GroceryIngredient[]> = {};
  for (const ing of unique) {
    (grouped[ing.category] ||= []).push(ing);
  }

  // Render known categories first in canonical order; trailing categories
  // (e.g. anything new added without updating CATEGORY_ORDER) at the end.
  const knownCats = CATEGORY_ORDER.filter(c => grouped[c]?.length);
  const extraCats = Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)).sort();

  return [...knownCats, ...extraCats].map(cat => ({
    category: cat,
    displayName: categoryDisplayName(cat),
    emoji: categoryEmoji(cat),
    ingredients: grouped[cat].sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
