/**
 * @summary Permanently deletes a user from Supabase Auth.
 * Requires service_role — cannot be called directly from client.
 *
 * @description
 * Called from account.repository.ts after all user data tables
 * have been cleared. Security check: requesting user JWT must
 * match the userId being deleted. Uses admin API to hard-delete
 * from auth.users (this cascades to profiles via FK).
 *
 * @param userId - UUID of the account to delete
 * @returns { success: true } or error response
 *
 * @calledBy src/repositories/account.repository.ts deleteAccount()
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: requestingUser }, error: authError } =
      await userClient.auth.getUser();

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { userId } = body;

    if (requestingUser.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden — can only delete own account' }),
        { status: 403, headers: corsHeaders }
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw new Error('Auth deletion failed: ' + deleteError.message);
    }

    console.log(`[DELETE-USER-ACCOUNT] User ${userId.slice(0, 8)} deleted successfully`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[DELETE-USER-ACCOUNT] Error:', err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
