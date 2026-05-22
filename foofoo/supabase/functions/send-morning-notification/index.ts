/**
 * @summary Sends each user their personalised morning meal plan
 * notification via OneSignal REST API.
 *
 * @description
 * Called by pg_cron at 5:15 AM IST (23:45 UTC) — 15 minutes after
 * generate-daily-plans-batch so plans are guaranteed to exist.
 * For each user with notifications_enabled=true and a valid
 * onesignal_player_id: fetches today's breakfast dish, builds a
 * personalised heading + body, sends via OneSignal REST API, and
 * records the send in notification_log so we never double-send.
 *
 * Safety rails:
 *   - Idempotent: at most one 'morning_plan' notification per user per IST day.
 *   - Quiet hours: never sends between 22:00 and 06:00 IST regardless of CRON time.
 *   - If OneSignal reports "All included players are not subscribed", clear
 *     the stale onesignal_player_id (user uninstalled the app).
 *
 * @returns {{ success: true, data: { sent, skipped, errors, date } }}
 * @calledBy pg_cron via public.run_morning_notifications() at 23:45 UTC daily
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * @summary Returns today's IST date as YYYY-MM-DD.
 * @returns {string}
 */
function getTodayIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * @summary Returns the current IST hour (0-23).
 * @returns {number}
 */
function getISTHour(): number {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours();
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

    const todayIST = getTodayIST();
    const istHour = getISTHour();
    let sent = 0, skipped = 0, errors = 0;

    // Quiet-hours guard (10 PM – 6 AM IST). Cron normally fires at 05:15 so this
    // only trips if someone invokes the function manually overnight.
    if (istHour >= 22 || istHour < 6) {
      console.log('[NOTIFY] Quiet hours — skipping all sends, IST hour=', istHour);
      return new Response(
        JSON.stringify({ success: true, data: { sent: 0, skipped: 0, errors: 0, date: todayIST, reason: 'quiet_hours' } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    if (!oneSignalAppId || !oneSignalKey) {
      throw new Error('Missing OneSignal credentials in Edge Function env (ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY)');
    }

    // Eligible users: notifications enabled + valid player id + plan for today.
    // planner has no FK from breakfast_ref_id to dishes, so we fetch them separately.
    const { data: users, error: usersErr } = await supabase
      .from('profiles')
      .select(`
        id, name, onesignal_player_id, notification_time, notifications_enabled,
        planner!inner ( id, plan_date, breakfast_ref_id )
      `)
      .eq('notifications_enabled', true)
      .not('onesignal_player_id', 'is', null)
      .eq('planner.plan_date', todayIST);

    if (usersErr) throw new Error('Failed to load users: ' + usersErr.message);

    const userRows = (users || []) as Array<{
      id: string; name: string | null; onesignal_player_id: string;
      notification_time: string | null;
      planner: Array<{ id: string; plan_date: string; breakfast_ref_id: number | null }>;
    }>;

    // Bulk-fetch breakfast dishes referenced across all users (one round-trip).
    const breakfastIds = Array.from(new Set(
      userRows.flatMap(u => (u.planner || []).map(p => p.breakfast_ref_id).filter((x): x is number => x !== null)),
    ));
    const dishMap: Record<number, { id: number; name: string; hero_image_url: string | null; cook_time_mins: number | null; diet_type: string }> = {};
    if (breakfastIds.length > 0) {
      const { data: dishRows } = await supabase
        .from('dishes')
        .select('id, name, hero_image_url, cook_time_mins, diet_type')
        .in('id', breakfastIds);
      for (const d of (dishRows || []) as any[]) dishMap[d.id] = d;
    }

    for (const user of userRows) {
      try {
        // Idempotency: already sent a morning_plan notification today?
        const { data: existing } = await supabase
          .from('notification_log')
          .select('id')
          .eq('user_id', user.id)
          .eq('notification_type', 'morning_plan')
          .gte('sent_at', `${todayIST}T00:00:00+05:30`)
          .lte('sent_at', `${todayIST}T23:59:59+05:30`)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const plan = user.planner?.[0];
        const breakfast = plan?.breakfast_ref_id ? dishMap[plan.breakfast_ref_id] : null;
        if (!plan) { skipped++; continue; }

        const firstName = user.name?.split(' ')[0] || 'there';
        const title = `Good morning, ${firstName}!`;
        const body = breakfast
          ? `Breakfast idea: ${breakfast.name} (${breakfast.cook_time_mins ?? 15} mins)`
          : `Your meal plan for today is ready!`;

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${oneSignalKey}`,
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            include_player_ids: [user.onesignal_player_id],
            headings: { en: title },
            contents: { en: body },
            url: 'foofoo://home',
            data: {
              type: 'morning_plan',
              plan_date: todayIST,
              breakfast_dish_id: breakfast?.id ?? null,
            },
            big_picture: breakfast?.hero_image_url || undefined,
            android_channel_id: 'morning_plan',
          }),
        });

        const result = await response.json().catch(() => ({} as any));

        if (Array.isArray(result?.errors) && result.errors.length > 0) {
          const errStr = result.errors.join(', ');
          // Stale player id → user uninstalled the app. Clear it so we stop trying.
          if (errStr.includes('All included players are not subscribed')) {
            await supabase.from('profiles').update({ onesignal_player_id: null }).eq('id', user.id);
            skipped++;
            continue;
          }
          throw new Error(errStr);
        }

        await supabase.from('notification_log').insert({
          user_id: user.id,
          notification_type: 'morning_plan',
          sent_at: new Date().toISOString(),
        });

        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[NOTIFY] Failed for user ${user.id}: ${msg}`);
        errors++;
      }
    }

    await supabase.from('etl_jobs').insert({
      job_name: 'send-morning-notification',
      status: errors === 0 ? 'completed' : 'partial',
      rows_processed: sent,
      metadata: { sent, skipped, errors, date: todayIST },
      completed_at: new Date().toISOString(),
    });

    console.log(`[NOTIFY] Done: sent=${sent} skipped=${skipped} errors=${errors} date=${todayIST}`);

    return new Response(
      JSON.stringify({ success: true, data: { sent, skipped, errors, date: todayIST } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[NOTIFY] Fatal error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'NOTIFY_FAILED', message: msg, retry: true } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
