/**
 * @summary Repository for the Profile tab — preference summary, settings, password, sign-out.
 *
 * @description
 * Aggregates fast counts (allergens, cuisines) into a single profile summary
 * to avoid the Profile screen issuing many queries on mount. All update
 * functions write to profiles, leaving onboarding repositories untouched.
 *
 * @calledBy app/(tabs)/profile.tsx
 */

import { supabase } from '../services/supabase';
import { Logger } from '../utils/systemLogger';
import type { FoodPref } from '../types';

export interface ProfileSettingsUpdate {
  notifications_enabled?: boolean;
  notification_time?: string; // 'HH:MM:SS' or 'HH:MM'
}

export interface ProfileSummary {
  id: string;
  name: string;
  username: string;
  email: string;
  food_pref: FoodPref | null;
  avatar_url: string | null;
  premium_tier: string | null;
  created_at: string;
  notifications_enabled: boolean;
  notification_time: string | null;
  allergenCount: number;
  cuisineCount: number;
}

/**
 * @summary Fetches the user's profile plus quick counts for the summary card.
 *
 * @description Three queries in parallel: profile row, allergen IDs from
 *   user_diet_rules, and cuisine F/O count from user_category_preferences.
 *   Returns null on any fatal error.
 *
 * @param {string} userId - Supabase auth UUID
 * @returns {Promise<ProfileSummary | null>}
 * @calledBy app/(tabs)/profile.tsx on mount
 */
export async function getProfileSummary(userId: string): Promise<ProfileSummary | null> {
  try {
    const [profileRes, dietRes, prefRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_diet_rules').select('excluded_ingredients').eq('user_id', userId).maybeSingle(),
      supabase
        .from('user_category_preferences')
        .select('category_id', { count: 'exact', head: false })
        .eq('user_id', userId)
        .eq('category_type', 'cuisine')
        .in('bucket', ['F', 'O']),
    ]);

    if (profileRes.error) throw profileRes.error;
    const p = profileRes.data;
    if (!p) return null;

    const allergens = (dietRes.data as { excluded_ingredients?: number[] } | null)?.excluded_ingredients ?? [];
    const cuisineCount = (prefRes.data ?? []).length;

    return {
      id: p.id,
      name: p.name ?? '',
      username: p.username ?? '',
      email: p.email ?? '',
      food_pref: p.food_pref ?? null,
      avatar_url: p.avatar_url ?? null,
      premium_tier: p.premium_tier ?? 'free',
      created_at: p.created_at,
      notifications_enabled: !!p.notifications_enabled,
      notification_time: p.notification_time ?? null,
      allergenCount: allergens.length,
      cuisineCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    Logger.error('PROFILE-SETTINGS', 'getProfileSummary failed', { error: msg });
    return null;
  }
}

/**
 * @summary Updates user profile settings fields.
 *
 * @description Persists notification toggle and time. The notification_time
 *   column is a Postgres `time` so we accept HH:MM or HH:MM:SS strings and
 *   leave format normalisation to the server.
 *
 * @param {string} userId - Auth UUID
 * @param {ProfileSettingsUpdate} updates - Fields to update
 * @returns {Promise<void>}
 * @throws {Error} when the update fails
 * @calledBy app/(tabs)/profile.tsx notification toggle and time picker
 */
export async function updateProfileSettings(
  userId: string,
  updates: ProfileSettingsUpdate,
): Promise<void> {
  const payload: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) {
    Logger.error('PROFILE-SETTINGS', 'updateProfileSettings failed', { error: error.message });
    throw new Error(error.message);
  }
}

/**
 * @summary Changes the current user's Supabase Auth password.
 *
 * @description Calls supabase.auth.updateUser({ password }). Minimum length 8
 *   enforced client-side here so we fail fast before the round-trip.
 *
 * @param {string} newPassword - New password (>=8 chars)
 * @returns {Promise<void>}
 * @throws {Error} when the password is too short or the Auth API returns an error
 * @calledBy app/(tabs)/profile.tsx change-password form
 */
export async function changePassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    Logger.error('PROFILE-SETTINGS', 'changePassword failed', { error: error.message });
    throw new Error(error.message);
  }
}

/**
 * @summary Signs the current user out of Supabase Auth.
 *
 * @description Calls supabase.auth.signOut() which clears the session in
 *   storage and triggers the root layout to navigate to the auth gate.
 *
 * @returns {Promise<void>}
 * @throws {Error} when the Auth API returns an error
 * @calledBy app/(tabs)/profile.tsx sign-out button
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    Logger.error('PROFILE-SETTINGS', 'signOut failed', { error: error.message });
    throw new Error(error.message);
  }
}

/**
 * @summary Formats a Postgres `time` value (HH:MM:SS) into a human label.
 *
 * @description Returns "08:30 AM" / "07:00 PM" style. Falls back to "—" for null.
 *
 * @param {string | null} t - time-only string or null
 * @returns {string}
 */
export function formatNotificationTime(t: string | null): string {
  if (!t) return '—';
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * @summary Returns "Month YYYY" for a date string (e.g., profile member-since).
 * @param {string} iso - ISO date string
 * @returns {string}
 */
export function formatMemberSince(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * @summary Returns user initials from a full name (max 2 chars, upper-case).
 * @param {string} name - Full name (e.g., "Rahul Sharma")
 * @returns {string}
 */
export function initialsFromName(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * @summary Returns a human label for a diet_type code.
 * @param {string | null} d - diet code
 * @returns {string}
 */
export function dietLabel(d: string | null): string {
  switch (d) {
    case 'veg': return '🌱 Vegetarian';
    case 'non_veg': return '🍗 Non-Vegetarian';
    case 'egg': return '🥚 Egg';
    case 'vegan': return '🌿 Vegan';
    case 'jain': return '✨ Jain';
    default: return 'Not set';
  }
}
