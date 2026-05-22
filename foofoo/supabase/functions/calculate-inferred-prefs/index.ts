/**
 * @summary Analyses each user's suggestion_logs history to compute
 * inferred taste preferences. Writes to user_inferred_prefs.
 * This is what makes the RE "learn" from user behaviour.
 *
 * @description
 * Runs weekly (Saturday 21:30 UTC = Sunday 3:00 AM IST).
 * For each user with ≥14 days of suggestion_logs AND ≥20 weighted actions,
 * computes:
 *   - spice_score (-1..+1)
 *   - complexity_score (-1..+1)
 *   - repeat_tolerance (0..1)
 *   - cuisine_drift (jsonb: cuisine_code → drift_score in -1..+1)
 *
 * Scoring uses ACTION_WEIGHTS so 'locked' counts harder than 'swiped_to',
 * 'never' counts as a strong negative, etc. Random 'shown' / neutral 'viewed'
 * carry zero weight — those are surfacing signals, not preference signals.
 *
 * @returns {{ success: true, data: { processed, skipped, errors } }}
 * @calledBy pg_cron via public.run_calculate_inferred_prefs() Sat 21:30 UTC
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Per-action weight when used as a preference signal.
// 'shown' and 'viewed' are passive surfacing events — they should not move
// preferences. Strong intent gestures count harder.
const ACTION_WEIGHTS: Record<string, number> = {
  locked: 1.5,
  tapped_detail: 1.0,
  accepted: 1.0,
  added_to_date: 1.0,
  tapped_ingredients: 0.5,
  swiped_to: 0.3,
  swiped_past: -0.5,
  not_today: -0.8,
  rejected: -1.0,
  never: -2.0,
  shown: 0,
  viewed: 0,
  unlocked: 0,
  refresh: 0,
  swiped: 0,
};

// Maps the 1-4 spice scale to a -1..+1 axis.
const SPICE_NORM: Record<number, number> = { 1: -1.0, 2: -0.33, 3: 0.33, 4: 1.0 };

function normComplexity(mins: number | null | undefined): number {
  if (!mins) return 0;
  if (mins < 20) return -1.0;
  if (mins < 40) return 0.0;
  return 1.0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const cutoffIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    let processed = 0, skipped = 0, errors = 0;

    // Eligibility: ≥20 actions across ≥14 distinct days in the last 90 days.
    // We cannot do this in a single Supabase Postgrest call (no HAVING + count
    // over distinct), so we use an RPC via execute_sql — but to avoid a hard
    // dependency on a DB function, run it as a raw SQL via .rpc('exec', ...)
    // if available, otherwise fall back to a Postgrest aggregation.
    const { data: eligibleUsersRaw, error: eligErr } = await supabase
      .from('suggestion_logs')
      .select('user_id, created_at', { count: 'exact' })
      .gte('created_at', cutoffIso)
      .not('user_id', 'is', null);

    if (eligErr) throw new Error('Failed to fetch logs for eligibility: ' + eligErr.message);

    // Group in-memory: count actions + distinct dates per user.
    const userStats: Record<string, { count: number; dates: Set<string> }> = {};
    for (const row of (eligibleUsersRaw || []) as any[]) {
      const uid = row.user_id;
      if (!uid) continue;
      if (!userStats[uid]) userStats[uid] = { count: 0, dates: new Set() };
      userStats[uid].count += 1;
      userStats[uid].dates.add(String(row.created_at).slice(0, 10));
    }
    const eligibleUserIds = Object.entries(userStats)
      .filter(([_, s]) => s.count >= 20 && s.dates.size >= 14)
      .map(([uid]) => uid);

    console.log(`[INFERRED-PREFS] ${eligibleUserIds.length} eligible users (out of ${Object.keys(userStats).length} with logs)`);

    for (const userId of eligibleUserIds) {
      try {
        // Pull full history with dish + cuisine joined.
        const { data: logs, error: logsErr } = await supabase
          .from('suggestion_logs')
          .select(`
            action, position, created_at, meal_slot, dish_id,
            dishes:dish_id ( id, spice_level, cook_time_mins, difficulty, cuisine_id, cuisines:cuisine_id ( code ) )
          `)
          .eq('user_id', userId)
          .gte('created_at', cutoffIso);

        if (logsErr) throw new Error(logsErr.message);
        if (!logs || logs.length < 20) { skipped++; continue; }

        // --- SPICE ---
        let spiceWS = 0, spiceWT = 0;
        // --- COMPLEXITY ---
        let cxWS = 0, cxWT = 0;
        // --- REPEAT TOLERANCE ---
        const acceptedDishIds: number[] = [];
        // --- CUISINE DRIFT ---
        const cAcc: Record<string, number> = {};
        const cTot: Record<string, number> = {};

        for (const log of logs as any[]) {
          const w = ACTION_WEIGHTS[log.action] ?? 0;
          const dish = log.dishes;

          // Spice
          if (w !== 0 && dish?.spice_level) {
            const n = SPICE_NORM[dish.spice_level] ?? 0;
            spiceWS += n * w;
            spiceWT += Math.abs(w);
          }
          // Complexity (uses cook_time_mins as proxy)
          if (w !== 0) {
            cxWS += normComplexity(dish?.cook_time_mins) * w;
            cxWT += Math.abs(w);
          }
          // Repeat tolerance (counts only positive-acceptance gestures)
          if (['locked', 'tapped_detail', 'accepted', 'added_to_date'].includes(log.action) && dish?.id) {
            acceptedDishIds.push(dish.id);
          }
          // Cuisine drift
          const code = dish?.cuisines?.code;
          if (code) {
            cTot[code] = (cTot[code] || 0) + 1;
            if (['locked', 'tapped_detail', 'accepted', 'added_to_date'].includes(log.action)) {
              cAcc[code] = (cAcc[code] || 0) + 1;
            }
          }
        }

        const spice_score = spiceWT > 0 ? clamp(spiceWS / spiceWT, -1, 1) : 0;
        const complexity_score = cxWT > 0 ? clamp(cxWS / cxWT, -1, 1) : 0;

        const uniqueAccepted = new Set(acceptedDishIds).size;
        const repeat_tolerance = acceptedDishIds.length > 0
          ? clamp(1 - uniqueAccepted / acceptedDishIds.length, 0, 1)
          : 0.5;

        const cuisine_drift: Record<string, number> = {};
        for (const code of Object.keys(cTot)) {
          if (cTot[code] >= 5) {
            const rate = (cAcc[code] || 0) / cTot[code];
            cuisine_drift[code] = parseFloat(((rate - 0.5) * 2).toFixed(3));
          }
        }

        // Upsert. user_inferred_prefs has UNIQUE(user_id).
        const { error: upsertErr } = await supabase
          .from('user_inferred_prefs')
          .upsert({
            user_id: userId,
            spice_score: parseFloat(spice_score.toFixed(3)),
            complexity_score: parseFloat(complexity_score.toFixed(3)),
            repeat_tolerance: parseFloat(repeat_tolerance.toFixed(3)),
            cuisine_drift,
            computed_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (upsertErr) throw new Error(upsertErr.message);

        processed++;
        console.log(
          `[INFERRED-PREFS] User ${userId.slice(0, 8)}: spice=${spice_score.toFixed(2)} ` +
          `complexity=${complexity_score.toFixed(2)} repeat_tol=${repeat_tolerance.toFixed(2)} ` +
          `drift_keys=${Object.keys(cuisine_drift).length}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[INFERRED-PREFS] Failed for ${userId}: ${msg}`);
        errors++;
      }
    }

    await supabase.from('etl_jobs').insert({
      job_name: 'calculate-inferred-prefs',
      status: errors === 0 ? 'completed' : 'partial',
      rows_processed: processed,
      metadata: { processed, skipped, errors, eligible: eligibleUserIds.length },
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, data: { processed, skipped, errors } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[INFERRED-PREFS] Fatal error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INFERRED_PREFS_FAILED', message: msg, retry: true } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
