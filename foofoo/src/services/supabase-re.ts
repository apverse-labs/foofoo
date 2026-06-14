import { createClient } from '@supabase/supabase-js';

/**
 * @summary Read-only Supabase client for RE module reference tables.
 *
 * @description Points to the RE staging project during development (SCHEMA-RE-001).
 *   All user-specific RE writes (re_user_household_profiles, household_members)
 *   also go through this client for now. In BUILD-08 both env vars will be
 *   updated to point to the production project once SCHEMA-RE-001 is promoted.
 *
 *   Auth sessions still come from the primary `supabase` client (production).
 *   This client uses only the anon key — it relies on Supabase RLS for security.
 */
const RE_URL = process.env.EXPO_PUBLIC_SUPABASE_RE_URL ?? '';
const RE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_RE_ANON_KEY ?? '';

export const supabaseRE = createClient(
  RE_URL || 'https://ssr-placeholder.invalid',
  RE_ANON_KEY || 'ssr-placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
