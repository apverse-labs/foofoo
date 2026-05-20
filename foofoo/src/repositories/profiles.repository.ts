import { supabase } from '../services/supabase';
import type { UserProfile, Step1Data, UserRole } from '../types';

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
      .single();
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
  const { error } = await supabase
    .from('profiles')
    .update({
      name: data.name,
      username: data.username,
      home_state: data.home_state,
      current_city: data.current_city,
      onboarding_step: 1,
    })
    .eq('id', userId);
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
