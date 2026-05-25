/**
 * @summary User profile repository — all reads and writes to the profiles table.
 * @calledBy app/(onboarding)/step-1.tsx through step-7.tsx, app/(tabs)/profile.tsx
 */

import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';
import type { UserProfile, Step1Data, UserRole, FoodPref } from '../types';

export class UsernameTakenError extends Error {
  code = 'USERNAME_TAKEN' as const;
  constructor(public username: string) {
    super(`Username "${username}" is already taken`);
    this.name = 'UsernameTakenError';
  }
}

export interface ProfileUpdate {
  name?: string;
  username?: string;
  home_state?: string;
  current_city?: string;
  food_pref?: FoodPref;
  onboarding_step?: number;
  onboarding_completed?: boolean;
  notification_time?: string;
  notifications_enabled?: boolean;
  role?: UserRole;
  updated_at?: string;
}

/**
 * @summary Fetch the full profile row for a user.
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<UserProfile | null>} Profile row or null if not found or on error
 *
 * @calledBy
 * - `app/(onboarding)/step-1.tsx` — pre-fill form on mount
 * - `app/index.tsx` — check onboarding_completed
 */
export async function fetchProfile(userId: string): Promise<(UserProfile & {
  onboarding_completed: boolean;
  onboarding_step: number;
  role: UserRole | null;
  notification_time: string | null;
  notifications_enabled: boolean;
}) | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err: any) {
    Logger.error('PROFILES', 'fetchProfile failed', { error: err?.message, userId });
    return null;
  }
}

/**
 * @summary Check if a username is available (not taken by another user).
 *
 * @param {string} username - Candidate username string to check
 * @param {string} userId - Current user's UUID — excluded from the uniqueness check so they can keep their own name
 * @returns {Promise<boolean>} True if the username is available, false if taken or on error
 *
 * @calledBy `app/(onboarding)/step-1.tsx` — debounced 500 ms as user types
 */
export async function checkUsernameAvailable(username: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data === null;
  } catch (err: any) {
    Logger.error('PROFILES', 'checkUsernameAvailable failed', { error: err?.message, username });
    return false;
  }
}

/**
 * @summary Generic profile update — updates any subset of profile fields.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {Partial<ProfileUpdate>} updates - Fields to update (only provided keys are changed)
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase update fails
 *
 * @calledBy `app/(onboarding)/step-7.tsx`, profile screen
 */
export async function updateProfile(userId: string, updates: Partial<ProfileUpdate>): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    if (error) throw new Error('[profiles.repository] updateProfile failed: ' + error.message);
  } catch (err: any) {
    Logger.error('PROFILES', 'updateProfile failed', { error: err?.message, userId });
    throw err;
  }
}

/**
 * @summary Save Step 1 profile fields: name, username, city, state.
 *
 * @description Uses upsert (not update) so a missing profile row is created if the
 *   sign-up trigger failed silently (observed on live DB with NOT NULL constraint).
 *
 * @param {string} userId - Supabase auth UUID
 * @param {Step1Data} data - Profile fields collected on the Step 1 form
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase upsert fails
 *
 * @calledBy `app/(onboarding)/step-1.tsx` — on Next press
 */
export async function saveProfileStep1(userId: string, data: Step1Data): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: data.name,
        username: data.username,
        home_state: data.home_state,
        current_city: data.current_city,
        onboarding_step: 1,
      }, { onConflict: 'id' });
    if (error) {
      // Postgres unique_violation. The DB is the source of truth — the prior
      // debounced checkUsernameAvailable is a UX hint, not a guarantee, because
      // two concurrent signups can both pass the check and race to insert.
      if (error.code === '23505' && /username/i.test(error.message)) {
        throw new UsernameTakenError(data.username);
      }
      throw error;
    }
  } catch (err: any) {
    Logger.error('PROFILES', 'saveProfileStep1 failed', { error: err?.message, userId });
    throw err;
  }
}

/**
 * @summary Advance the persisted onboarding step counter so the user can resume.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {number} step - Step number to persist (1–7)
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase update fails
 *
 * @calledBy Each onboarding step screen — called after a successful data save
 */
export async function updateOnboardingStep(userId: string, step: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_step: step })
      .eq('id', userId);
    if (error) throw error;
  } catch (err: any) {
    Logger.error('PROFILES', 'updateOnboardingStep failed', { error: err?.message, userId, step });
    throw err;
  }
}

/**
 * @summary Save notification time and enabled flag from Step 7.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {string} time - HH:MM formatted notification time (e.g. '07:30')
 * @param {boolean} enabled - Whether the user opted into notifications
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase update fails
 *
 * @calledBy `app/(onboarding)/step-7.tsx`
 */
export async function saveNotificationSettings(
  userId: string,
  time: string,
  enabled: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ notification_time: time, notifications_enabled: enabled })
      .eq('id', userId);
    if (error) throw error;
  } catch (err: any) {
    Logger.error('PROFILES', 'saveNotificationSettings failed', { error: err?.message, userId });
    throw err;
  }
}

/**
 * @summary Reset onboarding state so the user re-enters the flow from step 1.
 *
 * @description Sets onboarding_completed=false and onboarding_step=0 so
 *   index.tsx routes back to step-1 on next app open. Used by the dev reset button.
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase update fails
 *
 * @calledBy Dev reset buttons in `app/index.tsx` and `app/(tabs)/index.tsx`
 */
export async function resetOnboardingProgress(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: false, onboarding_step: 0 })
      .eq('id', userId);
    if (error) throw error;
  } catch (err: any) {
    Logger.error('PROFILES', 'resetOnboardingProgress failed', { error: err?.message, userId });
    throw err;
  }
}

/**
 * @summary Save user role (cook vs instruct) and mark onboarding complete.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {UserRole} role - 'cook' (user wants recipes) or 'instruct' (user wants to order)
 * @returns {Promise<void>}
 *
 * @throws {Error} When the Supabase update fails
 *
 * @calledBy `app/(onboarding)/step-7.tsx` — on "Start Using Foofoo" press
 */
export async function completeOnboarding(userId: string, role: UserRole): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        onboarding_completed: true,
        onboarding_step: 7,
      })
      .eq('id', userId);
    if (error) throw error;
  } catch (err: any) {
    Logger.error('PROFILES', 'completeOnboarding failed', { error: err?.message, userId, role });
    throw err;
  }
}
