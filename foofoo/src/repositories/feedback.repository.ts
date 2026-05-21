/**
 * @summary Passive feedback loop — silent learning engine for RE v2.
 *
 * @description
 * Every gesture creates a suggestion_logs row. RE v2 reads these to compute
 * user_inferred_prefs. NO UI — completely invisible to user.
 *
 * All async functions are fire-and-forget: never await in UI code, never block.
 *
 * @calledBy MealCard, Meal Detail, Grocery, DatePickerModal, regenerate-slot client wrapper
 */

import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';
import type { SuggestionAction } from '../types';

/**
 * @summary Logs a user interaction to suggestion_logs table.
 *
 * @description
 * Called silently on every gesture. Fire-and-forget — never awaited in UI code.
 * RE v2 reads this table weekly to compute user_inferred_prefs.
 *
 * Action types logged:
 *   shown        — every dish surfaced (position 0–7)
 *   viewed       — dish was shown as default (position 0)
 *   swiped_to    — user swiped to this dish (positions 1+)
 *   swiped_past  — user swiped away from this dish
 *   locked       — user locked this slot with this dish
 *   unlocked     — user unlocked a slot
 *   never        — user never-listed this dish
 *   not_today    — user skipped this dish for today
 *   tapped_detail   — user opened meal detail
 *   tapped_ingredients — user viewed ingredients (Grocery tab open or detail scroll)
 *   added_to_date — user added dish to a future date
 *
 * @param {string} userId - Supabase auth UUID
 * @param {number | null} dishId - Dish ID (null for screen-level events like grocery open)
 * @param {string} planDate - YYYY-MM-DD of the plan
 * @param {string} mealSlot - 'breakfast' | 'lunch' | 'dinner' | 'all'
 * @param {SuggestionAction} action - One of the action types above
 * @param {number} position - Position in carousel (0=default, 1-7=swiped to)
 * @param {string} [reVersion='v1'] - RE version that suggested this dish
 * @returns {Promise<void>}
 *
 * @calledBy All gesture handlers in MealCard, Meal Detail, Grocery, DatePickerModal
 */
export async function logSuggestionAction(
  userId: string,
  dishId: number | null,
  planDate: string,
  mealSlot: string,
  action: SuggestionAction,
  position: number,
  reVersion = 'v1',
): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.from('suggestion_logs').insert({
    user_id: userId,
    dish_id: dishId,
    plan_date: planDate,
    meal_slot: mealSlot,
    action,
    position,
    re_version: reVersion,
  });
  if (error) Logger.warn('FEEDBACK-REPO', 'suggestion log failed', { action, dishId, error: error.message });
}

/**
 * @summary Logs a screen view to app_events.
 *
 * @description Fire-and-forget. RE v2 + analytics use this to compute funnels
 *   (e.g. "Home → Detail → Grocery" navigation flows).
 *
 * @param {string} userId - Supabase auth UUID
 * @param {string} screen - Screen name (e.g. 'home', 'detail', 'grocery')
 * @param {Record<string, unknown>} [metadata] - Optional extra context
 * @returns {Promise<void>}
 *
 * @calledBy Every screen on mount
 */
export async function logScreenView(
  userId: string,
  screen: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.from('app_events').insert({
    user_id: userId,
    event_type: 'screen_view',
    screen,
    metadata,
  });
  if (error) Logger.warn('FEEDBACK-REPO', 'app_event screen_view failed', { screen, error: error.message });
}

/**
 * @summary Logs a feature interaction (button tap, gesture) to app_events.
 *
 * @description Fire-and-forget. Used for key UI interactions like lock, share,
 *   never confirm, plus tap — separate from suggestion_logs (which is RE-focused).
 *
 * @param {string} userId
 * @param {string} feature - feature name (e.g. 'lock', 'never_confirm', 'share')
 * @param {Record<string, unknown>} [metadata] - Extra context
 * @returns {Promise<void>}
 *
 * @calledBy Lock/Never/NotToday/Plus/Share handlers
 */
export async function logFeatureTap(
  userId: string,
  feature: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.from('app_events').insert({
    user_id: userId,
    event_type: 'feature_tap',
    screen: typeof metadata.screen === 'string' ? (metadata.screen as string) : null,
    metadata: { feature, ...metadata },
  });
  if (error) Logger.warn('FEEDBACK-REPO', 'app_event feature_tap failed', { feature, error: error.message });
}
