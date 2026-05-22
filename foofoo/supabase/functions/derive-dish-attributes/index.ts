/**
 * @summary Edge Function wrapper around the SQL `derive_dish_attributes()`
 *          batch run. Invokes it for every active dish that has ingredient
 *          links, returns counts and conflicts.
 *
 * @description
 * The actual derivation logic lives in the SQL function — see
 * `supabase/migrations/20260522000003_sprint5_content_backfill.sql`. That
 * function:
 *   - reads meal_ingredients + the `ingredients` table (slug + is_gluten +
 *     is_dairy + is_nut + is_egg + is_shellfish + category),
 *   - derives allergen_ids, ingredient_ids, is_jain (fail-closed),
 *   - inserts an etl_jobs row tagged 'derive_dish_attributes_conflict' when
 *     declared diet_type disagrees with inferred diet_type.
 *
 * This wrapper exists so it can be invoked from anywhere (CRON, admin tool)
 * rather than running the DO-block manually.
 *
 * @calledBy Weekly CRON after new dishes / ingredient changes land.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: dishes, error: listErr } = await supabase
    .from('dishes')
    .select('id')
    .eq('is_active', true);
  if (listErr) return jsonError(listErr.message);

  let derived = 0;
  for (const d of dishes ?? []) {
    const { error } = await supabase.rpc('derive_dish_attributes', { p_dish_id: d.id });
    if (!error) derived++;
  }

  const { count: conflictCount } = await supabase
    .from('etl_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('job_name', 'derive_dish_attributes_conflict');

  return new Response(JSON.stringify({
    success: true,
    data: { derived, conflicts_total: conflictCount ?? 0 },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

function jsonError(message: string) {
  return new Response(JSON.stringify({
    success: false,
    error: { code: 'DERIVE_FAILED', message, retry: true },
  }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
