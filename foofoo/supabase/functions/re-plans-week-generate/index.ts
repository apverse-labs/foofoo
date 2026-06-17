/**
 * POST /re-plans-week-generate — DOC-23 §Plan generation
 * Body: { userId: string, forceRegenerate?: boolean }
 * Triggers generateUserWeeklyPlan() for the current ISO week.
 * Returns { planWeekStart, days: REDayPlan[] } or error.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getMondayIST(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  now.setDate(now.getDate() + diff);
  return now.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { userId, forceRegenerate = false } = await req.json() as {
      userId: string;
      forceRegenerate?: boolean;
    };

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const planWeekStart = getMondayIST();

    // Check if plan already exists for this week
    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from('re_user_weekly_plans')
        .select('day_of_week')
        .eq('profile_id', userId)
        .eq('plan_week_start', planWeekStart)
        .limit(1);

      if (existing && existing.length > 0) {
        const { data: days } = await supabase
          .from('re_user_weekly_plans')
          .select('*')
          .eq('profile_id', userId)
          .eq('plan_week_start', planWeekStart)
          .order('day_of_week');
        return new Response(
          JSON.stringify({ success: true, data: { planWeekStart, days, cached: true } }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Load household profile to get cohort_id
    const { data: profile, error: profileErr } = await supabase
      .from('re_user_household_profiles')
      .select('cohort_id, weekday_time_pressure')
      .eq('profile_id', userId)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!profile?.cohort_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User has no cohort assigned. Complete onboarding first.' }),
        { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Delegate to re_weekly_class_plans source matrix
    const { data: planMatrix, error: matrixErr } = await supabase
      .from('re_weekly_class_plans')
      .select('*')
      .eq('cohort_id', profile.cohort_id);

    if (matrixErr) throw matrixErr;
    if (!planMatrix || planMatrix.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: `No plan matrix found for cohort ${profile.cohort_id}` }),
        { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Upsert the plan rows for this user/week
    const upsertRows = planMatrix.map((row: Record<string, unknown>) => ({
      profile_id: userId,
      plan_week_start: planWeekStart,
      cohort_id: profile.cohort_id,
      day_of_week: row.day_of_week,
      weekday_weekend: row.weekday_weekend,
      breakfast_class: row.breakfast_primary_class,
      breakfast_display: row.breakfast_primary_class,
      lunch_class: row.lunch_primary_class,
      lunch_display: row.lunch_primary_class,
      snack_class: row.snack_primary_class,
      snack_display: row.snack_primary_class,
      dinner_class: row.dinner_primary_class,
      dinner_display: row.dinner_primary_class,
    }));

    const { error: upsertErr } = await supabase
      .from('re_user_weekly_plans')
      .upsert(upsertRows, { onConflict: 'profile_id,plan_week_start,day_of_week' });

    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({ success: true, data: { planWeekStart, days: upsertRows, cached: false } }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
