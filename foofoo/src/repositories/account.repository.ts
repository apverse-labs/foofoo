/**
 * @summary Handles permanent account deletion — all user data.
 *
 * @description
 * Implements DPDP Act Right to Erasure and Google Play Store
 * account deletion requirement (mandatory since Dec 2023).
 * Processes deletion in correct order to respect FK constraints.
 * suggestion_logs are anonymised (user_id→null) not deleted
 * — kept for RE analytics with personal data removed.
 * Calls delete-user-account Edge Function for auth.users deletion.
 *
 * @calledBy app/(tabs)/profile.tsx handleDeleteAccount
 */

import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';

export async function deleteAccount(userId: string): Promise<void> {
  Logger.info('ACCOUNT-REPO',
    'Account deletion started', { userId: userId.slice(0, 8) });

  // Step 1: Anonymise suggestion_logs — keep for analytics
  const { error: anonError } = await supabase
    .from('suggestion_logs')
    .update({ user_id: null })
    .eq('user_id', userId);

  if (anonError) {
    Logger.warn('ACCOUNT-REPO',
      'suggestion_logs anonymisation failed',
      { error: anonError.message });
  }

  // Step 2: Delete from user data tables (FK order)
  const tablesToClear = [
    'user_inferred_prefs',
    'user_recipe_affinity',
    'user_behavioral_profile',
    'user_dish_patterns',
    'never_list',
    'experiment_assignments',
    'notification_log',
    'user_consent',
    'user_category_preferences',
    'user_diet_rules',
  ];

  for (const table of tablesToClear) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) {
        Logger.warn('ACCOUNT-REPO',
          `Delete from ${table} failed`, { error: error.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn('ACCOUNT-REPO',
        `Exception deleting from ${table}`, { error: msg });
    }
  }

  // Step 3: Delete planner_carousel then planner
  const { data: plans } = await supabase
    .from('planner')
    .select('id')
    .eq('user_id', userId);

  if (plans && plans.length > 0) {
    const planIds = plans.map((p: { id: string }) => p.id);
    await supabase
      .from('planner_carousel')
      .delete()
      .in('planner_id', planIds);

    await supabase
      .from('planner')
      .delete()
      .eq('user_id', userId);
  }

  // Step 4: Delete app_events
  await supabase
    .from('app_events')
    .delete()
    .eq('user_id', userId);

  // Step 5: Call Edge Function to delete from auth.users
  const { data, error: fnError } = await supabase.functions.invoke(
    'delete-user-account',
    { body: { userId } }
  );

  if (fnError) {
    Logger.error('ACCOUNT-REPO',
      'Auth deletion Edge Function failed',
      { error: fnError.message });
    throw new Error('Account deletion failed. Please contact support.');
  }

  if (!data?.success) {
    throw new Error('Auth deletion returned failure. Please try again.');
  }

  Logger.info('ACCOUNT-REPO',
    'Account deletion complete', { userId: userId.slice(0, 8) });
}
