/**
 * @summary Receives RE score breakdown and writes to recommendation_debug_log table.
 *
 * @description
 * Called by generate-daily-plan after scoring is complete for each meal slot.
 * Writes the full score breakdown (winner + alternatives + context) to the DB
 * so developers and AI can audit and tune RE weights.
 * Sampled at 100% during development, 5% in production via SAMPLE_RATE env var.
 *
 * @calledBy generate-daily-plan/index.ts — after scoring each slot
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: { code: 'AUTH_FAILED', message: 'No auth header', retry: false } }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check sample rate — default 100% dev, 5% prod
    const sampleRateStr = Deno.env.get('LOG_SAMPLE_RATE') ?? '1.0';
    const sampleRate = parseFloat(sampleRateStr);
    if (Math.random() > sampleRate) {
      return new Response(JSON.stringify({ success: true, data: { sampled_out: true } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // Use service role so we can write regardless of RLS row state
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the requesting user from their JWT
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userSupabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ success: false, error: { code: 'AUTH_FAILED', message: 'Invalid token', retry: false } }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { mealSlot, planDate, dishId, scoreBreakdown } = body;

    if (!mealSlot || !planDate || !dishId) {
      return new Response(JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'mealSlot, planDate, and dishId are required', retry: false } }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: insertError } = await supabase
      .from('recommendation_debug_log')
      .insert({
        user_id: user.id,
        plan_date: planDate,
        meal_slot: mealSlot,
        dish_id: dishId,
        score_breakdown: scoreBreakdown,
      });

    if (insertError) {
      console.error('[LOG-RE] insert failed:', insertError.message);
      return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: insertError.message, retry: true } }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: { logged: true } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[LOG-RE] fatal:', err.message);
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message, retry: true } }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
