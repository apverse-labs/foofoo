/**
 * supabase-re.ts
 *
 * Supabase client factory for the RE (Recommendation Engine) staging project.
 * Mirrors lib/supabase.ts (MVP) but targets the RE staging Supabase project
 * (SCHEMA-RE-001 … 005). Reads RE-specific env vars with a fallback to the
 * EXPO_PUBLIC_ prefixed variants the app itself uses, so the same secrets work
 * for both the app and the test suite.
 *
 * Exports:
 *   - supabaseRE       — anon-key client (respects RE RLS)
 *   - supabaseREAdmin  — service-role client (bypasses RLS); optional. If no
 *                        service key is present it logs a warning at import time
 *                        but never throws, so contract-only tests can still load.
 *   - RE_URL / RE_ANON_KEY / RE_SERVICE_KEY — resolved values for callers/skips
 *   - hasREConfig()    — true when URL + anon key are present (integration gate)
 *   - hasREService()   — true when a real service-role key is configured
 *   - signInRETestUser / createRETestUser / deleteRETestUser — RLS/DPDP helpers
 *
 * Run: imported by integration/re-*.test.ts and personas/re-persona-runner.ts
 * Requires: SUPABASE_STAGING_URL + SUPABASE_STAGING_ANON_KEY (GitHub Secrets).
 *           SUPABASE_STAGING_SERVICE_ROLE_KEY for RLS / DPDP / seed-count tests.
 *           EXPO_PUBLIC_SUPABASE_RE_* accepted as local-dev fallback.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const RE_URL =
  process.env.SUPABASE_STAGING_URL ||
  process.env.SUPABASE_RE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_RE_URL ||
  '';

export const RE_ANON_KEY =
  process.env.SUPABASE_STAGING_ANON_KEY ||
  process.env.SUPABASE_RE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_RE_ANON_KEY ||
  '';

export const RE_SERVICE_KEY =
  process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_RE_SERVICE_KEY ||
  process.env.SUPABASE_RE_SERVICE_ROLE_KEY ||
  '';

/** True when an RE staging URL + anon key are available (gate for integration tests). */
export function hasREConfig(): boolean {
  return Boolean(RE_URL && RE_ANON_KEY);
}

/** True when a real RE service-role key is configured (gate for RLS / DPDP / seeding). */
export function hasREService(): boolean {
  return Boolean(RE_URL && RE_SERVICE_KEY);
}

// Harmless placeholders so module import never throws even when env is unset.
// Every real call is guarded by hasREConfig() / hasREService() in the tests.
const SAFE_URL = RE_URL || 'https://re-placeholder.invalid';
const SAFE_ANON = RE_ANON_KEY || 're-anon-placeholder-not-set';

/** Anon-key client — respects RE Row Level Security. */
export const supabaseRE: SupabaseClient = createClient(SAFE_URL, SAFE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
});

if (!hasREService()) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase-re] No RE service-role key (SUPABASE_RE_SERVICE_KEY) found. ' +
      'supabaseREAdmin falls back to the anon key; RLS-bypass operations ' +
      '(persona seeding, RLS isolation, DPDP cascade, seed counts) are skipped ' +
      'by the tests that require them.',
  );
}

/**
 * Service-role client — bypasses RE RLS. Falls back to the anon key when no
 * service key is set so the export always exists; callers MUST gate real use
 * with hasREService().
 */
export const supabaseREAdmin: SupabaseClient = createClient(
  SAFE_URL,
  RE_SERVICE_KEY || SAFE_ANON,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/** Sign in an RE test user and return an authenticated anon client. */
export async function signInRETestUser(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createClient(SAFE_URL, SAFE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInRETestUser failed: ${error.message}`);
  return client;
}

/** Create an RE test user via the service-role admin client. */
export async function createRETestUser(
  email: string,
  password: string,
): Promise<{ id: string; email: string }> {
  const { data, error } = await supabaseREAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createRETestUser failed: ${error.message}`);
  return { id: data.user.id, email: data.user.email! };
}

/** Delete an RE test user by ID via the service-role admin client. */
export async function deleteRETestUser(userId: string): Promise<void> {
  const { error } = await supabaseREAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`deleteRETestUser failed: ${error.message}`);
}
