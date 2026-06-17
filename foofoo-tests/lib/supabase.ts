import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { RE_STAGING, assertSafeForTesting } from "../config/targets";

// This client historically pointed at a dedicated MVP project, but that
// project (ufgfznpqixplcbhmsqqw) is now DEP-PRODUCTION (see SYSTEM_STATE.md) —
// running these tests against it would create/delete real user data.
// foofoo-staging carries the full CKPT-001 schema (DEP-STAGING ledger entry),
// so it is the safe default; SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY env vars
// still override for local use but are gated by assertSafeForTesting below.
const supabaseUrl = process.env.SUPABASE_URL || RE_STAGING.url;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || RE_STAGING.anonKey;
// Service role key is optional — if absent, admin calls will fail at runtime,
// not at module load time, so contract-only tests can still import this module.
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || RE_STAGING.serviceKey || "placeholder-key-not-set";

if (!supabaseUrl) {
  throw new Error("Missing env var: SUPABASE_URL (and no SUPABASE_STAGING_URL fallback configured)");
}

assertSafeForTesting({ projectRef: "", url: supabaseUrl });

/** Anon-key client — respects Row Level Security */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/** Service-role client — bypasses RLS; use only in trusted test helpers.
 *  Requires SUPABASE_SERVICE_ROLE_KEY env var.  Missing key → runtime failure only. */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/** Sign in a test user and return the authenticated client */
export async function signInTestUser(
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInTestUser failed: ${error.message}`);
  return client;
}

/** Create a fresh test user via the admin client and return their credentials */
export async function createTestUser(
  email: string,
  password: string
): Promise<{ id: string; email: string }> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error) throw new Error(`createTestUser failed: ${error.message}`);
  return { id: data.user.id, email: data.user.email! };
}

/** Delete a test user by ID via the admin client */
export async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`deleteTestUser failed: ${error.message}`);
}
