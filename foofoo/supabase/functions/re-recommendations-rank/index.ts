/**
 * POST /re-recommendations-rank — DOC-23 §Recommendations
 * Body: { userId: string, dayOfWeek?: string }
 * Returns ranked dish candidates for today's (or specified day's) plan slots.
 * Thin wrapper — actual ranking happens in re-dish-expander.repository.ts client-side.
 * This endpoint returns the raw class plan + dish candidates for the UI layer.
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

function getTodayIST(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Asia/Kolkata' });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { userId, dayOfWeek } = await req.json() as { userId: string; dayOfWeek?: string };

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const planWeekStart = getMondayIST();
    const targetDay = dayOfWeek ?? getTodayIST();

    const { data, error } = await supabase
      .from('re_user_weekly_plans')
      .select('cohort_id, weekday_weekend, breakfast_class, breakfast_display, lunch_class, lunch_display, snack_class, snack_display, dinner_class, dinner_display')
      .eq('profile_id', userId)
      .eq('plan_week_start', planWeekStart)
      .eq('day_of_week', targetDay)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return new Response(
        JSON.stringify({ success: false, error: 'NO_PLAN_FOR_DAY', message: 'No plan generated yet for this day. Call /re-plans-week-generate first.' }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: { dayOfWeek: targetDay, plan: data } }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
