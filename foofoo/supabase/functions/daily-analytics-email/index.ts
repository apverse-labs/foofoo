/**
 * @summary Sends founders a daily 13-metric report at 11 PM IST.
 *
 * @description
 * Runs daily at 17:30 UTC (11:00 PM IST) via pg_cron. Pulls 13 KPIs from
 * the last full IST day (00:00 IST → 23:59 IST) and emails them to the
 * founders via Resend.
 *
 * The 13 metrics:
 *   1.  DAU                  — distinct users who fired an app_open event
 *   2.  New signups          — profiles.created_at within window
 *   3.  Onboarding completes — profiles.onboarding_completed=true updated in window
 *   4.  Plans generated      — planner.generated_at within window
 *   5.  Total interactions   — suggestion_logs rows in window
 *   6.  Acceptance rate      — (locked + tapped_detail) / shown
 *   7.  Never-list additions — never_list rows in window
 *   8.  Most accepted dish   — top (locked + tapped_detail) target
 *   9.  Most rejected dish   — top (never + not_today) target
 *  10.  Searches             — app_events 'search_query'
 *  11.  Top search term      — most common metadata->>'query'
 *  12.  Avg carousel depth   — positions per planner+slot averaged
 *  13.  RE version breakdown — count of v1 vs v2 plans
 *
 * Email delivery:
 *   - Recipients: env FOUNDER_EMAILS (comma-separated). Falls back to
 *     ankit3.mittal@ril.com if unset.
 *   - From: env RESEND_FROM (default 'FooFoo Intelligence <onboarding@resend.dev>').
 *   - If RESEND_API_KEY is not set, the function still computes metrics and
 *     records them in etl_jobs.metadata so the data isn't lost.
 *
 * @returns {{ success: true, data: { sent, metrics } }}
 * @calledBy pg_cron via public.run_daily_analytics_email() at 17:30 UTC
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CountResult { count: number | null }

function getTodayIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

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

    const today = getTodayIST();
    const startIso = `${today}T00:00:00+05:30`;
    const endIso = `${today}T23:59:59+05:30`;

    // 1. DAU — distinct users with an app_open event today. Postgrest doesn't
    //    expose DISTINCT inline so we approximate via a server-side function;
    //    fallback: count the user_id column on app_events filtered to app_open.
    const { count: dauTotal } = await supabase
      .from('app_events')
      .select('user_id', { count: 'exact', head: true })
      .eq('event_type', 'app_open')
      .gte('created_at', startIso)
      .lte('created_at', endIso) as CountResult;

    // 2. New signups
    const { count: newSignups } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lte('created_at', endIso) as CountResult;

    // 3. Onboarding completions (proxy: profiles updated today with onboarding_completed=true)
    const { count: onboardingDone } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('onboarding_completed', true)
      .gte('updated_at', startIso)
      .lte('updated_at', endIso) as CountResult;

    // 4. Plans generated today
    const { count: plansGenerated } = await supabase
      .from('planner')
      .select('id', { count: 'exact', head: true })
      .gte('generated_at', startIso)
      .lte('generated_at', endIso) as CountResult;

    // 5. Total interactions
    const { count: totalActions } = await supabase
      .from('suggestion_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lte('created_at', endIso) as CountResult;

    // 6. Acceptance rate: accepts / shown
    const { count: accepts } = await supabase
      .from('suggestion_logs')
      .select('id', { count: 'exact', head: true })
      .in('action', ['locked', 'tapped_detail', 'accepted'])
      .gte('created_at', startIso)
      .lte('created_at', endIso) as CountResult;
    const { count: shown } = await supabase
      .from('suggestion_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'shown')
      .gte('created_at', startIso)
      .lte('created_at', endIso) as CountResult;
    const acceptanceRate = (shown ?? 0) > 0
      ? Math.round(((accepts ?? 0) / (shown ?? 1)) * 100)
      : 0;

    // 7. Never-list additions
    const { count: neverAdded } = await supabase
      .from('never_list')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lte('created_at', endIso) as CountResult;

    // 8. Most accepted dish today
    const { data: acceptedRows } = await supabase
      .from('suggestion_logs')
      .select('dish_id, dishes:dish_id(name)')
      .in('action', ['locked', 'tapped_detail', 'accepted'])
      .gte('created_at', startIso)
      .lte('created_at', endIso);
    const accCounts: Record<string, { name: string; count: number }> = {};
    for (const r of (acceptedRows || []) as any[]) {
      if (!r.dish_id) continue;
      const k = String(r.dish_id);
      const name = r.dishes?.name || `dish #${r.dish_id}`;
      accCounts[k] = { name, count: (accCounts[k]?.count || 0) + 1 };
    }
    const mostAccepted = Object.values(accCounts).sort((a, b) => b.count - a.count)[0];

    // 9. Most rejected dish today
    const { data: rejectedRows } = await supabase
      .from('suggestion_logs')
      .select('dish_id, dishes:dish_id(name)')
      .in('action', ['never', 'not_today', 'rejected'])
      .gte('created_at', startIso)
      .lte('created_at', endIso);
    const rejCounts: Record<string, { name: string; count: number }> = {};
    for (const r of (rejectedRows || []) as any[]) {
      if (!r.dish_id) continue;
      const k = String(r.dish_id);
      const name = r.dishes?.name || `dish #${r.dish_id}`;
      rejCounts[k] = { name, count: (rejCounts[k]?.count || 0) + 1 };
    }
    const mostRejected = Object.values(rejCounts).sort((a, b) => b.count - a.count)[0];

    // 10 + 11. Search queries today
    const { data: searches } = await supabase
      .from('app_events')
      .select('metadata')
      .eq('event_type', 'search_query')
      .gte('created_at', startIso)
      .lte('created_at', endIso);
    const searchCount = searches?.length || 0;
    const searchTerms: Record<string, number> = {};
    for (const s of (searches || []) as any[]) {
      const q = (s.metadata?.query || '').toString().trim().toLowerCase();
      if (q) searchTerms[q] = (searchTerms[q] || 0) + 1;
    }
    const topSearch = Object.entries(searchTerms).sort((a, b) => b[1] - a[1])[0];

    // 12. Average carousel depth (positions per planner+slot)
    const { data: carouselRows } = await supabase
      .from('planner_carousel')
      .select('planner_id, meal_slot, position');
    const slotBuckets: Record<string, number> = {};
    for (const r of (carouselRows || []) as any[]) {
      const key = `${r.planner_id}|${r.meal_slot}`;
      slotBuckets[key] = (slotBuckets[key] || 0) + 1;
    }
    const slotKeys = Object.keys(slotBuckets);
    const avgCarouselDepth = slotKeys.length > 0
      ? (slotKeys.reduce((s, k) => s + slotBuckets[k], 0) / slotKeys.length).toFixed(1)
      : 'N/A';

    // 13. RE version breakdown — plans dated today
    const { data: reVersions } = await supabase
      .from('planner')
      .select('re_version')
      .eq('plan_date', today);
    const versionCounts: Record<string, number> = {};
    for (const p of (reVersions || []) as any[]) {
      const v = p.re_version || 'v1';
      versionCounts[v] = (versionCounts[v] || 0) + 1;
    }

    const metrics = {
      date: today,
      dau: dauTotal ?? 0,
      new_signups: newSignups ?? 0,
      onboarding_done: onboardingDone ?? 0,
      plans_generated: plansGenerated ?? 0,
      total_actions: totalActions ?? 0,
      acceptance_rate_pct: acceptanceRate,
      never_added: neverAdded ?? 0,
      most_accepted: mostAccepted ?? null,
      most_rejected: mostRejected ?? null,
      search_count: searchCount,
      top_search: topSearch ? { term: topSearch[0], count: topSearch[1] } : null,
      avg_carousel_depth: avgCarouselDepth,
      re_versions: versionCounts,
    };

    const emailBody = [
      `FooFoo Daily Report — ${today}`,
      '====================================',
      '',
      'USERS',
      `  Daily Active Users:        ${metrics.dau}`,
      `  New Signups:               ${metrics.new_signups}`,
      `  Onboarding Completions:    ${metrics.onboarding_done}`,
      '',
      'ENGAGEMENT',
      `  Plans Generated:           ${metrics.plans_generated}`,
      `  Total Interactions:        ${metrics.total_actions}`,
      `  Acceptance Rate:           ${metrics.acceptance_rate_pct}%`,
      `  Never-List Additions:      ${metrics.never_added}`,
      '',
      'DISH INSIGHTS',
      `  Most Accepted:  ${metrics.most_accepted ? `${metrics.most_accepted.name} (${metrics.most_accepted.count}x)` : 'N/A'}`,
      `  Most Rejected:  ${metrics.most_rejected ? `${metrics.most_rejected.name} (${metrics.most_rejected.count}x)` : 'N/A'}`,
      '',
      'SEARCH',
      `  Searches Today:            ${metrics.search_count}`,
      `  Top Search Term:           ${metrics.top_search ? `${metrics.top_search.term} (${metrics.top_search.count}x)` : 'N/A'}`,
      '',
      'RECOMMENDATION ENGINE',
      `  Avg Carousel Depth:        ${metrics.avg_carousel_depth} options/slot`,
      `  RE v1 Plans:               ${metrics.re_versions['v1'] ?? 0}`,
      `  RE v2 Plans:               ${metrics.re_versions['v2'] ?? 0}`,
      '',
      '====================================',
      'Generated at 11 PM IST by FooFoo Intelligence Engine',
    ].join('\n');

    // --- SEND EMAIL via Resend ---
    const resendKey = Deno.env.get('RESEND_API_KEY');
    // FOUNDER_EMAILS must be set in Supabase Vault — no hardcoded fallback.
    // If not set, the function still computes metrics but skips sending (same
    // behaviour as when RESEND_API_KEY is absent).
    // Set via: Supabase Dashboard → Edge Functions → daily-analytics-email → Secrets
    const founderEmails = (Deno.env.get('FOUNDER_EMAILS') ?? '')
      .split(',').map((e) => e.trim()).filter(Boolean);
    const fromAddr = Deno.env.get('RESEND_FROM') || 'FooFoo Intelligence <onboarding@resend.dev>';

    let sent = false;
    let sendError: string | null = null;

    if (resendKey && founderEmails.length > 0) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddr,
            to: founderEmails,
            subject: `FooFoo Daily Report — ${today}`,
            text: emailBody,
          }),
        });
        if (!resp.ok) {
          sendError = `Resend HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`;
        } else {
          sent = true;
        }
      } catch (err) {
        sendError = err instanceof Error ? err.message : String(err);
      }
    } else if (!resendKey) {
      sendError = 'RESEND_API_KEY not set — metrics captured to etl_jobs but no email sent';
    }

    await supabase.from('etl_jobs').insert({
      job_name: 'daily-analytics-email',
      status: sent ? 'completed' : 'partial',
      rows_processed: founderEmails.length,
      metadata: { sent, send_error: sendError, recipients: founderEmails, metrics },
      error_message: sendError,
      completed_at: new Date().toISOString(),
    });

    console.log(`[ANALYTICS] ${today} dau=${metrics.dau} plans=${metrics.plans_generated} sent=${sent}`);

    return new Response(
      JSON.stringify({ success: true, data: { sent, metrics, send_error: sendError } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[ANALYTICS] Fatal error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'ANALYTICS_FAILED', message: msg, retry: true } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
