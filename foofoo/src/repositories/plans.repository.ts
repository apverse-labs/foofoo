/**
 * @summary All planner and recommendation-engine repository functions.
 * @calledBy app/(tabs)/index.tsx
 */

import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';
import type { GeneratedPlan, Dish, SuggestionAction } from '../types';

/**
 * @summary Calls generate-daily-plan Edge Function and returns the user's meal plan.
 *
 * @param {string} planDate - Date to generate for, YYYY-MM-DD format
 * @param {boolean} [forceRegenerate=false] - When true, bypasses the cached plan and re-runs RE scoring
 * @returns {Promise<GeneratedPlan>} Breakfast, lunch, dinner dishes with carousel metadata
 *
 * @throws {Error} 'Not authenticated' when no active Supabase session exists
 * @throws {Error} Edge Function error message when the function returns success=false
 *
 * @calledBy
 * - `app/(tabs)/index.tsx` — Home screen on mount and pull-to-refresh
 */
export async function generateDailyPlan(planDate: string, forceRegenerate = false): Promise<GeneratedPlan> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('generate-daily-plan', {
      body: { planDate, forceRegenerate },
    });

    if (response.error) throw new Error(response.error.message);
    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Plan generation failed');
    }

    return response.data.data as GeneratedPlan;
  } catch (err: any) {
    Logger.error('PLANS-REPO', 'generateDailyPlan failed', { error: err?.message, planDate });
    throw err;
  }
}

/**
 * @summary Fetches ordered carousel dishes for a single meal slot from the planner_carousel table.
 *
 * @param {string} planId - UUID of the planner row
 * @param {string} mealSlot - One of 'breakfast', 'lunch', or 'dinner'
 * @returns {Promise<Dish[]>} Dish objects ordered by carousel position (index 0 = primary suggestion)
 *
 * @throws {Error} When the Supabase query fails
 *
 * @calledBy `app/(tabs)/index.tsx` — background load after plan is shown
 */
export async function getCarouselForSlot(planId: string, mealSlot: string): Promise<Dish[]> {
  try {
    const { data, error } = await supabase
      .from('planner_carousel')
      .select(`
        position,
        dishes:ref_id(id, name, slug, cuisine_id, diet_type, spice_level,
                     cook_time_mins, difficulty, calories, meal_types,
                     dish_role, hero_image_url, blurhash,
                     cuisines(id, code, name))
      `)
      .eq('planner_id', planId)
      .eq('meal_slot', mealSlot)
      .order('position');

    if (error) throw new Error('Failed to fetch carousel: ' + error.message);
    return (data?.map((row: any) => row.dishes).filter(Boolean) ?? []) as Dish[];
  } catch (err: any) {
    Logger.error('PLANS-REPO', 'getCarouselForSlot failed', { error: err?.message, planId, mealSlot });
    throw err;
  }
}

/**
 * @summary Logs a user interaction on a dish suggestion to suggestion_logs.
 *
 * @description Non-fatal — logging failures are silently swallowed so they never block UI.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {number} dishId - Integer ID of the dish that was acted on
 * @param {string} planDate - YYYY-MM-DD date the plan was generated for
 * @param {string} slot - Meal slot: 'breakfast', 'lunch', or 'dinner'
 * @param {SuggestionAction} action - The gesture or action taken (swiped, locked, never, etc.)
 * @param {number} position - Zero-based carousel position of the dish at time of action
 * @returns {Promise<void>}
 *
 * @calledBy
 * - `app/(tabs)/index.tsx` — MealCard swipe, lock, detail tap
 */
export async function logSuggestionAction(
  userId: string,
  dishId: number,
  planDate: string,
  slot: string,
  action: SuggestionAction,
  position: number,
): Promise<void> {
  try {
    await supabase.from('suggestion_logs').insert({
      user_id: userId,
      dish_id: dishId,
      plan_date: planDate,
      meal_slot: slot,
      action,
      position,
      re_version: 'v1',
    });
  } catch {
    // Non-fatal — logging must not block UI
  }
}

/**
 * @summary Locks a meal slot so RE will not re-suggest a different dish for that slot.
 *
 * @param {string} planId - UUID of the planner row to lock a slot on
 * @param {string} slot - Meal slot to lock: 'breakfast', 'lunch', or 'dinner'
 * @param {number} dishId - Integer ID of the dish being locked in
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase read or update fails
 *
 * @calledBy `app/(tabs)/index.tsx` — MealCard lock icon tap (when unlocked)
 */
export async function lockSlot(planId: string, slot: string, dishId: number): Promise<void> {
  try {
    const { data: plan } = await supabase
      .from('planner')
      .select('locked_slots')
      .eq('id', planId)
      .single();

    const current: string[] = plan?.locked_slots ?? [];
    if (current.includes(slot)) return;

    const { error } = await supabase.from('planner').update({
      locked_slots: [...current, slot],
      [`${slot}_ref_id`]: dishId,
      [`${slot}_ref_type`]: 'dish',
      updated_at: new Date().toISOString(),
    }).eq('id', planId);
    if (error) throw error;
  } catch (err: any) {
    Logger.error('PLANS-REPO', 'lockSlot failed', { error: err?.message, planId, slot });
    throw err;
  }
}

/**
 * @summary Unlocks a meal slot so RE can replace the dish on next refresh.
 *
 * @param {string} planId - UUID of the planner row
 * @param {string} slot - Meal slot to unlock: 'breakfast', 'lunch', or 'dinner'
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase read or update fails
 *
 * @calledBy `app/(tabs)/index.tsx` — MealCard lock icon tap (when already locked)
 */
export async function unlockSlot(planId: string, slot: string): Promise<void> {
  try {
    const { data: plan } = await supabase
      .from('planner')
      .select('locked_slots')
      .eq('id', planId)
      .single();

    const current: string[] = plan?.locked_slots ?? [];
    const { error } = await supabase.from('planner').update({
      locked_slots: current.filter(s => s !== slot),
      updated_at: new Date().toISOString(),
    }).eq('id', planId);
    if (error) throw error;
  } catch (err: any) {
    Logger.error('PLANS-REPO', 'unlockSlot failed', { error: err?.message, planId, slot });
    throw err;
  }
}

/**
 * @summary Adds a dish to the user's permanent never list.
 *
 * @description Once added, RE hard-filters this dish out of all future suggestions.
 *   The dish can only reappear if removed from the never list manually.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {number} dishId - Integer ID of the dish to permanently suppress
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase insert fails
 *
 * @calledBy `src/components/dish/NeverModal.tsx` — on user confirmation
 */
export async function addToNeverList(userId: string, dishId: number): Promise<void> {
  try {
    const { error } = await supabase.from('never_list').insert({
      user_id: userId,
      dish_id: dishId,
      ref_type: 'dish',
      is_active: true,
    });
    if (error) throw error;
  } catch (err: any) {
    Logger.error('PLANS-REPO', 'addToNeverList failed', { error: err?.message, dishId });
    throw err;
  }
}

/**
 * @summary Returns today's date in IST as a YYYY-MM-DD string.
 *
 * @returns {string} ISO date string in IST (e.g. '2026-05-21')
 *
 * @calledBy
 * - `app/(tabs)/index.tsx` — initial planDate state
 * - `supabase/functions/generate-daily-plan/index.ts` — default planDate
 */
export function getTodayIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}
