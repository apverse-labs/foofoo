/**
 * @summary Regenerates a single meal slot without touching locked slots.
 *
 * @description
 * Called when user performs Not Today, Never, or manual refresh of one slot.
 * Runs the same RE v1 scoring pipeline as generate-daily-plan but only for
 * the requested slot. Excludes the just-dismissed dish from the new
 * carousel. Updates planner + planner_carousel for that slot only. Locked
 * slots are never touched.
 *
 * @param userId - From JWT (auto-extracted)
 * @param planDate - YYYY-MM-DD
 * @param slot - 'breakfast' | 'lunch' | 'dinner'
 * @param excludeDishId - Dish to exclude from new carousel (just dismissed)
 * @param action - 'not_today' | 'never' | 'refresh'
 *
 * @returns { success: true, data: { slot, newDish, carouselCount } }
 * @throws { success: false, error: { code, message, retry } }
 *
 * @calledBy
 * - NeverModal onConfirm (action='never', exclude the dish)
 * - NotTodayModal onConfirm (action='not_today', exclude for today)
 * - MealCard lock icon (when unlocking, action='refresh')
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTodayIST, getDateDaysAgo, getWeatherData, successResponse, stateNameToCode, loadRegionAffinity } from './helpers.ts';
import { scoreDish, type ScoreComponents } from './scoring.ts';
import { RE_V1 } from './re-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_SLOTS = new Set(['breakfast', 'lunch', 'dinner']);
const VALID_ACTIONS = new Set(['not_today', 'never', 'refresh']);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Auth guard — must precede try/catch so auth failures return 401, not 500.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'No authorization header', retry: false },
    }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'AUTH_FAILED', message: 'Invalid or expired token', retry: false },
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const planDate: string = body.planDate || getTodayIST();
    const slot: string = body.slot;
    const excludeDishId: number | null = body.excludeDishId ?? null;
    const action: string = body.action || 'refresh';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'INVALID_DATE', message: 'planDate must be YYYY-MM-DD', retry: false },
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!VALID_SLOTS.has(slot)) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'INVALID_SLOT', message: 'slot must be breakfast | lunch | dinner', retry: false },
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!VALID_ACTIONS.has(action)) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'INVALID_ACTION', message: 'action must be not_today | never | refresh', retry: false },
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[REGEN-SLOT] user=${user.id} slot=${slot} action=${action} exclude=${excludeDishId}`);
    const startTime = Date.now();

    // --- LOAD EXISTING PLAN (to ensure it exists + respect lock) ---
    const { data: planner, error: plannerErr } = await supabase
      .from('planner')
      .select('id, plan_date, locked_slots, breakfast_ref_id, lunch_ref_id, dinner_ref_id')
      .eq('user_id', user.id)
      .eq('plan_date', planDate)
      .maybeSingle();

    if (plannerErr) throw new Error('Failed to read planner: ' + plannerErr.message);
    if (!planner) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'PLAN_NOT_FOUND', message: 'No plan exists for this date — generate one first', retry: false },
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const lockedSlots: string[] = planner.locked_slots ?? [];
    if (lockedSlots.includes(slot)) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'SLOT_LOCKED', message: `Slot ${slot} is locked — unlock first`, retry: false },
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- LOAD USER CONTEXT (parallel) ---
    const [profile, dietRules, cuisinePrefs, mealPrefs, neverList, recentPlans, inferredPrefs, affinityRows] =
      await Promise.all([
        supabase.from('profiles').select('food_pref, home_state, current_city').eq('id', user.id).maybeSingle().then(r => r.data),
        supabase.from('user_diet_rules').select('food_pref, excluded_ingredients').eq('user_id', user.id).maybeSingle().then(r => r.data),
        supabase.from('user_category_preferences').select('category_id, bucket').eq('user_id', user.id).eq('category_type', 'cuisine').then(r => r.data || []),
        supabase.from('user_category_preferences').select('category_id, bucket').eq('user_id', user.id).eq('category_type', 'meal_item').then(r => r.data || []),
        supabase.from('never_list').select('dish_id').eq('user_id', user.id).eq('is_active', true).then(r => r.data || []),
        supabase.from('planner').select('breakfast_ref_id, lunch_ref_id, dinner_ref_id').eq('user_id', user.id).gte('plan_date', getDateDaysAgo(RE_V1.VARIETY_GUARD_DAYS)).lt('plan_date', planDate).then(r => r.data || []),
        supabase.from('user_inferred_prefs').select('spice_score, complexity_score, repeat_tolerance, cuisine_drift').eq('user_id', user.id).maybeSingle().then(r => r.data),
        supabase.from('user_recipe_affinity').select('dish_id, affinity').eq('user_id', user.id).then(r => r.data || []),
      ]);

    const affinityByDishId: Record<number, number> = {};
    for (const row of affinityRows as Array<{ dish_id: number; affinity: number }>) {
      affinityByDishId[row.dish_id] = Number(row.affinity);
    }
    const reVersion: 'v1' | 'v2' = inferredPrefs ? 'v2' : 'v1';

    const foodPref = dietRules?.food_pref || profile?.food_pref || 'veg';
    const excludedIngredients = new Set<number>(dietRules?.excluded_ingredients || []);
    const neverDishIds = new Set<number>((neverList as any[]).map((n) => n.dish_id));
    if (excludeDishId != null) neverDishIds.add(excludeDishId);

    const cuisineBuckets: Record<string, string> = {};
    for (const p of cuisinePrefs as any[]) cuisineBuckets[p.category_id] = p.bucket;

    const mealItemBuckets: Record<string, string> = {};
    for (const p of mealPrefs as any[]) mealItemBuckets[p.category_id] = p.bucket;

    const recentDishIds = new Set<number>(
      (recentPlans as any[]).flatMap((p) => [p.breakfast_ref_id, p.lunch_ref_id, p.dinner_ref_id].filter(Boolean)),
    );

    // --- FETCH WEATHER + REGION AFFINITY (parallel) ---
    const homeStateCode = stateNameToCode(profile?.home_state);
    const [weather, regionAffinityByCuisineId] = await Promise.all([
      getWeatherData(supabase, profile?.current_city || profile?.home_state || 'Mumbai'),
      loadRegionAffinity(supabase, homeStateCode),
    ]);

    // --- FETCH ELIGIBLE DISHES (hard diet filter) ---
    let dishQuery = supabase
      .from('dishes')
      .select(`id, name, slug, cuisine_id, diet_type, spice_level, cook_time_mins, difficulty, calories, meal_types, dish_role, hero_image_url, blurhash, ingredient_ids, allergen_ids, cuisines(id, code, name)`)
      .eq('is_active', true)
      .limit(2000);

    if (foodPref === 'veg') dishQuery = dishQuery.in('diet_type', ['veg', 'vegan', 'jain']);
    else if (foodPref === 'vegan') dishQuery = dishQuery.eq('diet_type', 'vegan');
    else if (foodPref === 'jain') dishQuery = dishQuery.in('diet_type', ['veg', 'jain']).eq('is_jain', true);
    else if (foodPref === 'egg') dishQuery = dishQuery.in('diet_type', ['veg', 'egg', 'vegan']);

    const { data: allDishes, error: dishError } = await dishQuery;
    if (dishError) throw new Error('Failed to fetch dishes: ' + dishError.message);

    const cuisineIdToCode: Record<number, string> = {};
    for (const d of allDishes as any[]) {
      if (d.cuisines?.code) cuisineIdToCode[d.cuisine_id] = d.cuisines.code;
    }

    const dayOfWeek = new Date(planDate + 'T00:00:00').getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Avoid suggesting the dishes still assigned to other (un-targeted) slots
    const otherSlotIds = new Set<number>(
      [planner.breakfast_ref_id, planner.lunch_ref_id, planner.dinner_ref_id]
        .filter((id, idx) => {
          const slotName = ['breakfast', 'lunch', 'dinner'][idx];
          return slotName !== slot && id != null;
        }) as number[],
    );

    // --- SCORE for this slot only ---
    const scored = (allDishes as any[])
      .filter((d) => Array.isArray(d.meal_types) && d.meal_types.includes(slot))
      .filter((d) => !otherSlotIds.has(d.id))
      .map((d) => {
        const r = scoreDish(d, user.id, planDate, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds, regionAffinityByCuisineId, inferredPrefs as any, affinityByDishId);
        return { dish: d, score: r.score, components: r.components };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    console.log(`[REGEN-SLOT] ${slot}: ${scored.length} eligible dishes scored`);

    const carouselScored = scored.slice(0, RE_V1.CAROUSEL_SIZE);
    const carousel = carouselScored.map(({ dish }) => dish);
    const carouselScores = carouselScored.map(({ score }) => score);
    const newTop = carousel[0] ?? null;

    if (!newTop) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'ELIGIBLE_POOL_EMPTY', message: 'No suitable dishes available after applying filters', retry: false },
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- UPDATE PLANNER (only this slot) ---
    const updateFields: Record<string, unknown> = {
      [`${slot}_ref_type`]: 'dish',
      [`${slot}_ref_id`]: newTop.id,
      updated_at: new Date().toISOString(),
    };
    const { error: updateErr } = await supabase
      .from('planner')
      .update(updateFields)
      .eq('id', planner.id);
    if (updateErr) throw new Error('Failed to update planner: ' + updateErr.message);

    // --- REPLACE planner_carousel atomically via RPC ---
    // delete+insert runs inside a single transaction server-side so two
    // concurrent regen requests can't observe a partially-empty carousel.
    const carouselRows = carousel.map((d: any, i: number) => ({
      planner_id: planner.id, meal_slot: slot, ref_type: 'dish', ref_id: d.id, position: i, re_score: carouselScores[i] ?? null,
    }));
    if (carouselRows.length > 0) {
      const { error: rpcErr } = await supabase.rpc('replace_planner_carousel_slot', {
        p_planner_id: planner.id,
        p_meal_slot: slot,
        p_rows: carouselRows,
      });
      if (rpcErr) console.error('[REGEN-SLOT] carousel replace error:', rpcErr.message);
    }

    // --- LOG TO suggestion_logs (the action that triggered the regen) ---
    if (excludeDishId != null) {
      const { error: logErr } = await supabase.from('suggestion_logs').insert({
        user_id: user.id,
        dish_id: excludeDishId,
        plan_date: planDate,
        meal_slot: slot,
        action,
        position: 0,
        re_version: reVersion,
      });
      if (logErr) console.error('[REGEN-SLOT] suggestion_logs (dismiss) error:', logErr.message);
    }

    // Log every newly surfaced carousel dish as 'shown' (RE v2 learns from positions 0–7)
    const shownLogs = carousel.map((d: any, i: number) => ({
      user_id: user.id,
      dish_id: d.id,
      plan_date: planDate,
      meal_slot: slot,
      action: 'shown',
      position: i,
      re_version: reVersion,
    }));
    if (shownLogs.length > 0) {
      const { error: shownErr } = await supabase.from('suggestion_logs').insert(shownLogs);
      if (shownErr) console.error('[REGEN-SLOT] suggestion_logs (shown) error:', shownErr.message);
    }

    // --- LOG DECISION TO recommendation_debug_log (best-effort) ---
    const topScored = scored[0];
    const topComponents: ScoreComponents | null = topScored?.components ?? null;
    const debugRow = {
      user_id: user.id, plan_date: planDate, meal_slot: slot,
      dish_id: newTop.id, re_version: reVersion,
      final_score: topScored?.score ?? 1.0,
      eligible_pool_size: scored.length,
      weather_input: weather
        ? { city: profile?.current_city || profile?.home_state || 'Mumbai', temp: Math.round(weather.tempCelsius), code: weather.weatherCode }
        : null,
      score_breakdown: {
        winner: { dish_name: newTop.name, final_score: topScored?.score ?? 1.0, components: topComponents ?? {} },
        alternatives: [],
        context: {
          weather: weather ? { city: profile?.current_city || profile?.home_state || 'Mumbai', temp: Math.round(weather.tempCelsius), code: weather.weatherCode } : null,
          day_of_week: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek],
          is_weekend: isWeekend,
          dish_pool_size: scored.length,
        },
        regen: { triggered_by: action, excluded_dish_id: excludeDishId },
        re_version: reVersion, source: 'regen', generation_time_ms: Date.now() - startTime,
      },
    };
    const { error: debugErr } = await supabase.from('recommendation_debug_log').insert(debugRow);
    if (debugErr) console.error('[REGEN-SLOT] recommendation_debug_log error:', debugErr.message);

    const elapsed = Date.now() - startTime;
    console.log(`[REGEN-SLOT] ${slot} regenerated in ${elapsed}ms → ${newTop.name}`);

    return successResponse({
      slot,
      newDish: newTop,
      carouselCount: carousel.length,
      carousel,
      action,
      excludedDishId: excludeDishId,
      generatedInMs: elapsed,
      reVersion,
    }, corsHeaders);
  } catch (error: any) {
    console.error('[REGEN-SLOT] Fatal error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'REGENERATION_FAILED', message: error.message, retry: true },
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
