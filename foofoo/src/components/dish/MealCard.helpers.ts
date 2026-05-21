/**
 * @summary Helper utilities for MealCard — logging and display helpers.
 * @calledBy src/components/dish/MealCard.tsx
 */

import { supabase } from '../../services/supabase';
import type { SuggestionAction } from '../../types';

/**
 * @summary Logs a dish interaction to suggestion_logs.
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
 * @summary Returns display label for spice level.
 */
export function spiceLabel(level: number): string {
  const labels: Record<number, string> = { 1: 'Mild', 2: 'Medium', 3: 'Spicy', 4: 'Very Spicy' };
  return labels[level] ?? 'Medium';
}

/**
 * @summary Formats cook time for display.
 */
export function cookTimeLabel(mins: number): string {
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
