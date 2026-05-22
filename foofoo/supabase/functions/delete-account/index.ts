/**
 * @summary Permanently deletes the authenticated user's account.
 *
 * @description
 * Play Store policy (since 2023) requires apps with sign-in to provide
 * in-app account deletion. This function:
 *   1. Verifies the caller's JWT and resolves user_id.
 *   2. Anonymises suggestion_logs + user_feedback (FKs are SET NULL) so
 *      analytics history is preserved without PII.
 *   3. Calls supabase.auth.admin.deleteUser(user_id) with the service
 *      role key. The CASCADE on profiles_id_fkey takes care of every
 *      public.* row tied to the user (planner, never_list, user_diet_rules,
 *      user_consent, user_category_preferences, app_events, etc.).
 *   4. audit_log rows are deliberately retained (DPDP 3-year requirement).
 *
 * The client is responsible for calling supabase.auth.signOut() after the
 * function returns success.
 *
 * @returns {{ success: true, data: { user_id, deleted_at } }}
 * @throws  {{ success: false, error: { code, message, retry } }}
 *
 * @calledBy app/(tabs)/profile.tsx — Delete Account confirmation flow
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing authorization header', retry: false },
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session', retry: false },
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[DELETE-ACCOUNT] user=${user.id} email=${user.email ?? 'unknown'}`);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // suggestion_logs and user_feedback have ON DELETE SET NULL — explicit
    // here so the anonymisation happens in a predictable order (and so it
    // works even if FK rules are changed later).
    await admin.from('suggestion_logs').update({ user_id: null }).eq('user_id', user.id);
    await admin.from('user_feedback').update({ user_id: null }).eq('user_id', user.id);

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`[DELETE-ACCOUNT] failed user=${user.id}: ${deleteError.message}`);
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'DELETE_FAILED', message: deleteError.message, retry: true },
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // audit_log retained for DPDP compliance (3-year retention).
    // No FK on user_id — the UUID survives the auth.users delete as a
    // historical reference.
    await admin.from('audit_log').insert({
      user_id: user.id,
      action: 'account_deleted',
      metadata: { deletion_method: 'self_service', email_hash: hashEmail(user.email ?? '') },
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({
      success: true,
      data: { user_id: user.id, deleted_at: new Date().toISOString() },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error(`[DELETE-ACCOUNT] unhandled: ${message}`);
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'INTERNAL_ERROR', message, retry: true },
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function hashEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}
