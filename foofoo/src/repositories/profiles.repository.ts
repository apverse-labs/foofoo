import { supabase } from '../services/supabase';
import type { UserProfile, Step1Data, UserRole, FoodPref } from '../types';

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
 * @returns {Promise<UserProfile | null>} Profile row or null if not found
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
  } catch (err) {
    console.error('[PROFILES] fetchProfile failed:', err);
    return null;
  }
}

/**
 * @summary Check if a username is available (not taken by another user).
 *
 * @param {string} username - Candidate username string
 * @param {string} userId - Current user's UUID (excluded from uniqueness check)
 * @returns {Promise<boolean>} True if available, false if taken
 *
 * @calledBy `app/(onboarding)/step-1.tsx` — debounced 500ms as user types
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
  } catch (err) {
    console.error('[PROFILES] checkUsernameAvailable failed:', err);
    return false;
  }
}

/**
 * @summary Alias for fetchProfile — preferred name in Phase 3 audit spec.
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<UserProfile | null>} Profile row or null
 *
 * @calledBy Anywhere fetchProfile is needed
 */
export const getProfile = fetchProfile;

/**
 * @summary Generic profile update — updates any subset of profile fields.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {Partial<ProfileUpdate>} updates - Fields to update
 * @returns {Promise<void>}
 *
 * @throws {Error} When Supabase update fails
 *
 * @calledBy Onboarding step-7, profile screen
 */
export async function updateProfile(userId: string, updates: Partial<ProfileUpdate>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw new Error('[profiles.repository] updateProfile failed: ' + error.message);
}

/**
 * @summary Alias for checkUsernameAvailable — preferred name in Phase 3 audit spec.
 *
 * @param {string} username - Candidate username
 * @param {string} currentUserId - Exclude this user from check
 * @returns {Promise<boolean>} True if available
 *
 * @calledBy Wherever checkUsernameAvailable is called
 */
export const isUsernameAvailable = checkUsernameAvailable;

/**
 * @summary Save Step 1 profile fields: name, username, city, state.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {Step1Data} data - Profile fields from Step 1 form
 * @returns {Promise<void>}
 *
 * @throws {Error} When Supabase update fails
 *
 * @calledBy `app/(onboarding)/step-1.tsx` — on Next press
 */
export async function saveProfileStep1(userId: string, data: Step1Data): Promise<void> {
  // upsert instead of update — creates the row if the signup trigger failed
  // (live DB had username NOT NULL which silently aborted the trigger)
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
  if (error) throw error;
}

/**
 * @summary Advance the persisted onboarding step counter.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {number} step - Step number (1–7)
 *
 * @calledBy Each onboarding step screen — called after successful save
 */
export async function updateOnboardingStep(userId: string, step: number): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_step: step })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * @summary Save notification time and enabled flag from Step 7.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {string} time - HH:MM formatted time string
 * @param {boolean} enabled - Whether notifications are enabled
 *
 * @calledBy `app/(onboarding)/step-7.tsx`
 */
export async function saveNotificationSettings(
  userId: string,
  time: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_time: time, notifications_enabled: enabled })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * @summary Reset onboarding state so the user re-enters the flow from step 1.
 *
 * @description Used by the dev reset button. Sets onboarding_completed=false and
 *   onboarding_step=0 so index.tsx routes back to step-1 on next app open.
 *
 * @param {string} userId - Supabase auth UUID
 *
 * @calledBy Dev reset buttons in app/index.tsx and app/(tabs)/index.tsx
 */
export async function resetOnboardingProgress(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: false, onboarding_step: 0 })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * @summary Save user role (cook vs instruct) and mark onboarding complete.
 *
 * @param {string} userId - Supabase auth UUID
 * @param {UserRole} role - 'cook' or 'instruct'
 *
 * @calledBy `app/(onboarding)/step-7.tsx` — on "Start Using Foofoo" press
 */
export async function completeOnboarding(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      role,
      onboarding_completed: true,
      onboarding_step: 7,
    })
    .eq('id', userId);
  if (error) throw error;
}
