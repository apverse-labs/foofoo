/**
 * @summary Pre-computes per-user-per-dish affinity scores for fast RE lookup.
 *
 * @description
 * Runs weekly (Saturday 22:00 UTC = Sunday 03:30 IST), after
 * calculate-inferred-prefs. Pre-computation avoids scanning suggestion_logs
 * at plan-generation time — the RE just hits user_recipe_affinity by
 * (user_id, dish_id) for an O(1) lookup.
 *
 * Affinity in [0, 1], centred at 0.5:
 *   1.0 = strongly prefers
 *   0.5 = neutral
 *   0.0 = dislikes / explicitly never-listed
 *
 * Decay weights (recency matters more than ancient history):
 *   ≤ 7 days     → 1.00
 *   8 – 30 days  → 0.50
 *   31 – 90 days → 0.20
 *   > 90 days    → 0.05  (we only fetch last 90 days, so unused in practice)
 *
 * Per-action deltas applied to the 0.5 baseline:
 *   locked / tapped_detail / accepted  →  +0.30 × decay
 *   added_to_date                       →  +0.20 × decay
 *   swiped_to (pos 1..7)                →  +0.10 × decay
 *   tapped_ingredients                  →  +0.05 × decay
 *   swiped_past                         →  -0.10 × decay
 *   not_today                           →  -0.20 × decay
 *   rejected                            →  -0.30 × decay
 *   never                               →  hard-pins affinity to 0.0
 *
 * @returns {{ success: true, data: { users_processed, pairs_written, errors } }}
 * @calledBy pg_cron via public.run_compute_recipe_affinity() Sat 22:00 UTC
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTION_DELTA: Record<string, number> = {
  locked: 0.30,
  tapped_detail: 0.30,
  accepted: 0.30,
  added_to_date: 0.20,
  swiped_to: 0.10,
  tapped_ingredients: 0.05,
  swiped_past: -0.10,
  not_today: -0.20,
  rejected: -0.30,
};

function decayFor(ageDays: number): number {
  if (ageDays <= 7) return 1.0;
  if (ageDays <= 30) return 0.5;
  if (ageDays <= 90) return 0.2;
  return 0.05;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

const BATCH_SIZE = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Service-role auth guard — only pg_cron and admin tooling should invoke this.
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceRoleKey || !authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'Service role key required', retry: false },
    }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const cutoffMs = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const cutoffIso = new Date(cutoffMs).toISOString();
    let usersProcessed = 0, pairsWritten = 0, errors = 0;

    // Pull every action in the window in one go. For MVP scale (<10K rows /
    // user / 90d) this stays well under the Postgrest 1000-row default once
    // we page; for now we accept the default page and document it.
    const { data: allLogs, error: logsErr } = await supabase
      .from('suggestion_logs')
      .select('user_id, dish_id, action, position, created_at')
      .gte('created_at', cutoffIso)
      .not('user_id', 'is', null)
      .not('dish_id', 'is', null);

    if (logsErr) throw new Error('Failed to fetch suggestion logs: ' + logsErr.message);

    // Group by user → list of {dish_id, action, age_days}
    type Row = { dish_id: number; action: string; ageDays: number };
    const perUser: Record<string, Row[]> = {};
    for (const log of (allLogs || []) as any[]) {
      const uid = log.user_id as string;
      const dishId = log.dish_id as number;
      const ageDays = Math.max(0, (Date.now() - new Date(log.created_at).getTime()) / 86_400_000);
      (perUser[uid] ||= []).push({ dish_id: dishId, action: log.action, ageDays });
    }

    // Fetch all active never_list entries — those dishes hard-pin to 0.
    const { data: neverRows } = await supabase
      .from('never_list')
      .select('user_id, dish_id')
      .eq('is_active', true);
    const neverByUser: Record<string, Set<number>> = {};
    for (const n of (neverRows || []) as any[]) {
      (neverByUser[n.user_id] ||= new Set()).add(n.dish_id);
    }

    const userIds = Object.keys(perUser);
    console.log(`[AFFINITY] processing ${userIds.length} users`);

    for (const userId of userIds) {
      try {
        const rows = perUser[userId];
        const dishScores: Record<number, number> = {};

        for (const r of rows) {
          const delta = ACTION_DELTA[r.action];
          if (delta === undefined && r.action !== 'never') continue; // ignore shown / viewed / refresh / unlocked

          if (r.action === 'never') {
            dishScores[r.dish_id] = -999; // sentinel: pin to 0
            continue;
          }
          if (dishScores[r.dish_id] === -999) continue; // already pinned

          if (dishScores[r.dish_id] === undefined) dishScores[r.dish_id] = 0.5;
          dishScores[r.dish_id] += delta * decayFor(r.ageDays);
        }

        // Hard-pin active never-list entries even if they have no log rows.
        const neverSet = neverByUser[userId];
        if (neverSet) {
          for (const dishId of neverSet) dishScores[dishId] = -999;
        }

        // Build upsert payload. Clamp scores to [0, 1]; sentinel → 0.
        const payload = Object.entries(dishScores).map(([dishIdStr, score]) => ({
          user_id: userId,
          dish_id: Number(dishIdStr),
          affinity: parseFloat(clamp(score === -999 ? 0 : score, 0, 1).toFixed(3)),
          computed_at: new Date().toISOString(),
        }));

        // Batch upsert.
        for (let i = 0; i < payload.length; i += BATCH_SIZE) {
          const slice = payload.slice(i, i + BATCH_SIZE);
          const { error: upErr } = await supabase
            .from('user_recipe_affinity')
            .upsert(slice, { onConflict: 'user_id,dish_id' });
          if (upErr) throw new Error(upErr.message);
          pairsWritten += slice.length;
        }

        usersProcessed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[AFFINITY] Failed for ${userId}: ${msg}`);
        errors++;
      }
    }

    await supabase.from('etl_jobs').insert({
      job_name: 'compute-recipe-affinity',
      status: errors === 0 ? 'completed' : 'partial',
      rows_processed: pairsWritten,
      metadata: { users_processed: usersProcessed, pairs_written: pairsWritten, errors },
      completed_at: new Date().toISOString(),
    });

    console.log(`[AFFINITY] Done: users=${usersProcessed} pairs=${pairsWritten} errors=${errors}`);

    return new Response(
      JSON.stringify({ success: true, data: { users_processed: usersProcessed, pairs_written: pairsWritten, errors } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[AFFINITY] Fatal error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'AFFINITY_FAILED', message: msg, retry: true } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
