import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl) {
  throw new Error("Missing env var: SUPABASE_URL");
}

/** Anon-key client — respects Row Level Security */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/** Service-role client — bypasses RLS; use only in trusted test helpers */
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
