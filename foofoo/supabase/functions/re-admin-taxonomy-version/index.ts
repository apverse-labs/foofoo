/**
 * GET /re-admin-taxonomy-version — DOC-23 §Admin
 * Returns the currently active taxonomy version and release metadata.
 * Requires service-role or admin JWT.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data, error } = await supabase
      .from('re_taxonomy_releases')
      .select('taxonomy_version, version_to, risk_level, qa_status, released_at, release_notes')
      .eq('qa_status', 'pass')
      .not('released_at', 'is', null)
      .order('released_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data: data ?? { taxonomyVersion: null, message: 'No released taxonomy version yet.' } }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
