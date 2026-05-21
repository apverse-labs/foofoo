/**
 * @summary Helper utilities for MealCard — interaction logging and display formatters.
 * @calledBy src/components/dish/MealCard.tsx
 */

import { supabase } from '../../services/supabase';
import type { SuggestionAction } from '../../types';

/**
 * @summary Logs a dish interaction directly to suggestion_logs (non-fatal fire-and-forget).
 *
 * @description Used by MealCard for interactions that don't go through the repository layer
 *   (e.g. inline swipe logging). Errors are silently swallowed so they never block UI.
 *
 * @param {{ userId: string; dishId: number; planDate: string; mealSlot: string; action: SuggestionAction; position: number }} params - All fields required for a suggestion_logs row
 * @returns {Promise<void>}
 *
 * @calledBy `src/components/dish/MealCard.tsx` — swipe and interaction handlers
 */
export async function logInteraction(params: {
  userId: string;
  dishId: number;
  planDate: string;
  mealSlot: string;
  action: SuggestionAction;
  position: number;
}): Promise<void> {
  try {
    await supabase.from('suggestion_logs').insert({
      user_id: params.userId,
      dish_id: params.dishId,
      plan_date: params.planDate,
      meal_slot: params.mealSlot,
      action: params.action,
      position: params.position,
      re_version: 'v1',
    });
  } catch {
    // Logging errors are non-fatal
  }
}

/**
 * @summary Returns a human-readable spice label for the given spice level integer.
 *
 * @param {number} level - Spice level (1–4) from the dishes table
 * @returns {string} Display label: 'Mild', 'Medium', 'Spicy', or 'Very Spicy'
 *
 * @calledBy `src/components/dish/MealCard.tsx` — dish meta row
 */
export function spiceLabel(level: number): string {
  const labels: Record<number, string> = { 1: 'Mild', 2: 'Medium', 3: 'Spicy', 4: 'Very Spicy' };
  return labels[level] ?? 'Medium';
}

/**
 * @summary Formats cook time in minutes as a compact human-readable string.
 *
 * @param {number} mins - Cook time in minutes from the dishes table
 * @returns {string} '25m' for under an hour, '1h 5m' for 65 minutes, etc.
 *
 * @calledBy `src/components/dish/MealCard.tsx` — dish meta row
 */
export function cookTimeLabel(mins: number): string {
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
