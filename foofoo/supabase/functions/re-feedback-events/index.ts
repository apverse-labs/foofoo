/**
 * POST /re-feedback-events — DOC-23 §Feedback
 * Body: {
 *   userId: string,
 *   dishOptionId: string,
 *   mealClassCode: string,
 *   signal: REFeedbackSignal,
 *   foodDnaTags?: string,       // from re_meal_classes.food_dna_tags (comma-sep)
 *   classFamilyCode?: string,   // from re_meal_classes.class_family_code
 *   cookComplexity?: string,    // from re_meal_classes.cook_complexity
 * }
 * Persists the feedback event and updates all affinity tables.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SIGNAL_WEIGHTS: Record<string, number> = {
  LOCK: 0.40, SEARCH_ADD_DISH: 0.40, ADD_TO_GROCERY: 0.35,
  ACCEPT: 0.25, TAP_RECIPE: 0.15, VIEW: 0.05,
  SWIPE_PAST: -0.15, NOT_TODAY: -0.30, NEVER: 0, NEVER_REMOVE: 0,
};

const CLASS_SIGNAL_WEIGHTS: Record<string, number> = {
  LOCK: 0.20, SEARCH_ADD_DISH: 0.20, ACCEPT: 0.10, VIEW: 0.02, SWIPE_PAST: -0.05,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json() as {
      userId: string;
      dishOptionId: string;
      mealClassCode: string;
      signal: string;
      foodDnaTags?: string;
      classFamilyCode?: string;
      cookComplexity?: string;
    };

    const { userId, dishOptionId, mealClassCode, signal } = body;
    if (!userId || !dishOptionId || !mealClassCode || !signal) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId, dishOptionId, mealClassCode, signal are required' }),
        { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }
    if (!(signal in SIGNAL_WEIGHTS)) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown signal: ${signal}` }),
        { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const weight = SIGNAL_WEIGHTS[signal];
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    // 1. Log raw event
    await supabase.from('re_user_feedback').insert({
      profile_id: userId,
      dish_option_id: dishOptionId,
      meal_class_code: mealClassCode,
      signal_type: signal,
      signal_weight: weight,
      session_date: today,
    });

    // 2. Upsert dish affinity
    const { data: existing } = await supabase
      .from('re_user_dish_affinity')
      .select('affinity_score, lock_count, accept_count, reject_count, is_never')
      .eq('profile_id', userId)
      .eq('dish_option_id', dishOptionId)
      .maybeSingle();

    const prev = existing as Record<string, number | boolean> | null;
    const newAffinity = Math.max(-0.30, Math.min(0.40, ((prev?.affinity_score as number) ?? 0) + weight));
    const newLocks = ((prev?.lock_count as number) ?? 0) + (signal === 'LOCK' ? 1 : 0);
    const newAccepts = ((prev?.accept_count as number) ?? 0) + (signal === 'ACCEPT' ? 1 : 0);
    const newRejects = ((prev?.reject_count as number) ?? 0) + (signal === 'SWIPE_PAST' ? 1 : 0);
    const isNever = signal === 'NEVER' ? true : signal === 'NEVER_REMOVE' ? false : ((prev?.is_never as boolean) ?? false);
    const repeatPreferred = newLocks >= 3;

    const dishRow: Record<string, unknown> = {
      profile_id: userId, dish_option_id: dishOptionId, meal_class_code: mealClassCode,
      affinity_score: newAffinity, lock_count: newLocks, accept_count: newAccepts,
      reject_count: newRejects, is_never: isNever, repeat_preferred: repeatPreferred, last_updated: now,
    };
    if (signal === 'NOT_TODAY') {
      const exp = new Date(today); exp.setDate(exp.getDate() + 3);
      dishRow.not_today_until = exp.toISOString().slice(0, 10);
    } else if (signal === 'NEVER_REMOVE' || signal === 'SEARCH_ADD_DISH') {
      dishRow.not_today_until = null;
    }
    await supabase.from('re_user_dish_affinity').upsert(dishRow, { onConflict: 'profile_id,dish_option_id' });

    // 3. Update class affinity
    const classDelta = CLASS_SIGNAL_WEIGHTS[signal];
    if (classDelta !== undefined) {
      const { data: existingClass } = await supabase
        .from('re_user_class_affinity')
        .select('affinity_score, signal_count, high_complexity_accepts, high_complexity_rejects')
        .eq('profile_id', userId).eq('meal_class_code', mealClassCode).maybeSingle();
      const pc = existingClass as Record<string, number> | null;
      const isHighComplexity = (body.cookComplexity ?? '').toLowerCase() === 'high';
      await supabase.from('re_user_class_affinity').upsert({
        profile_id: userId, meal_class_code: mealClassCode,
        affinity_score: Math.max(-0.30, Math.min(0.35, ((pc?.affinity_score) ?? 0) + classDelta)),
        signal_count: ((pc?.signal_count) ?? 0) + 1,
        high_complexity_accepts: ((pc?.high_complexity_accepts) ?? 0) + (isHighComplexity && classDelta > 0 ? 1 : 0),
        high_complexity_rejects: ((pc?.high_complexity_rejects) ?? 0) + (isHighComplexity && classDelta < 0 ? 1 : 0),
        last_updated: now,
      }, { onConflict: 'profile_id,meal_class_code' });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
