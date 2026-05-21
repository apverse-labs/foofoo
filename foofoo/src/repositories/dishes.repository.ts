/**
 * @summary Repository for dish detail fetches (single dish + similar dishes).
 * @calledBy app/dish/[id].tsx — Meal Detail screen
 */

import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';
import type { FullDish, SimilarDishRow } from '../types';

/**
 * @summary Fetches complete dish data for the Detail page.
 *
 * @description
 * Joins dishes with cuisines, dish_tags+tags, and meal_ingredients+ingredients.
 * Single query with select expansion for performance.
 * Returns null if dish not found or not active.
 *
 * @param {number} dishId - Integer dish ID
 * @returns {Promise<FullDish | null>} Full dish object with tags, ingredients, and cuisine
 * @throws {Error} When the Supabase query fails (non-PGRST116 errors)
 * @calledBy app/dish/[id].tsx on mount
 */
export async function getDishById(dishId: number): Promise<FullDish | null> {
  const { data, error } = await supabase
    .from('dishes')
    .select(`
      id, name, slug, description,
      diet_type, spice_level, cook_time_mins, difficulty,
      calories, meal_types, dish_role,
      hero_image_url, blurhash,
      allergen_ids, is_jain, is_active, cuisine_id,
      cuisines ( id, code, name, display_name ),
      dish_tags (
        tag_id,
        tags ( id, category, value, display_name, tier )
      ),
      meal_ingredients (
        display_order,
        ingredients ( id, name, slug, category,
                      is_veg, is_vegan, is_jain_compatible,
                      is_gluten, is_dairy, is_nut, is_egg )
      )
    `)
    .eq('id', dishId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    Logger.error('DISHES-REPO', 'getDishById failed', { dishId, error: error.message });
    throw new Error(error.message);
  }
  return (data as unknown as FullDish) ?? null;
}

/**
 * @summary Gets similar dishes for 'You might also like' section.
 *
 * @param {number} dishId - Current dish ID
 * @param {number} [limit=4] - Max results
 * @returns {Promise<SimilarDishRow[]>} Array of similar dish summaries (empty if none)
 * @calledBy app/dish/[id].tsx — bottom-of-page rail
 */
export async function getSimilarDishes(dishId: number, limit = 4): Promise<SimilarDishRow[]> {
  const { data, error } = await supabase
    .from('dish_similar')
    .select(`
      similar_dish_id,
      dishes:similar_dish_id ( id, name, hero_image_url, blurhash,
                               diet_type, cook_time_mins, cuisines(name) )
    `)
    .eq('dish_id', dishId)
    .order('similarity_score', { ascending: false })
    .limit(limit);

  if (error) {
    Logger.warn('DISHES-REPO', 'getSimilarDishes failed (non-fatal)', { dishId, error: error.message });
    return [];
  }
  return (data as unknown as SimilarDishRow[]) ?? [];
}
