/**
 * @summary Generates or retrieves the daily meal plan for a user.
 *
 * @description
 * Called when user opens Home screen. If a plan already exists for today
 * (and no slots are unlocked-empty), returns the cached plan. Otherwise runs
 * RE v1 scoring pipeline and writes to planner + planner_carousel tables.
 *
 * RE v1 Pipeline:
 * 1. Hard filter — diet_type, allergens (integer IDs), never_list, is_active
 * 2. Base score 1.0 for all eligible dishes
 * 3. Cuisine boost (re-config.ts weights)
 * 4. Meal item boost
 * 5. Weather boost — from weather_cache or OpenWeatherMap API
 * 6. Day-of-week boost
 * 7. Variety guard — dishes seen in last VARIETY_GUARD_DAYS penalised
 * 8. Random factor
 * 9. Rank — top CAROUSEL_SIZE per slot
 *
 * @param planDate - ISO date string YYYY-MM-DD (defaults to today IST)
 * @param forceRegenerate - boolean, default false
 *
 * @returns { success: true, data: { planId, breakfast, lunch, dinner, generatedAt, reVersion, reSummary } }
 *
 * @calledBy `app/(tabs)/index.tsx` on Home screen mount and pull-to-refresh
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTodayIST, getDateDaysAgo, getWeatherData, fetchCarousel, successResponse, stateNameToCode, loadRegionAffinity } from './helpers.ts';
import { generateSlot, buildReasoning, type SlotResult } from './scoring.ts';
import { RE_V1 } from './re-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth guard — must precede try/catch so auth failures return 401, not 500.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'No authorization header', retry: false },
    }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isServiceRole = SERVICE_ROLE_KEY.length > 0 && authHeader === `Bearer ${SERVICE_ROLE_KEY}`;

    // Service role calls (5AM CRON batch) use elevated privileges with explicit
    // targetUserId in body. User calls go through normal auth.getUser().
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      isServiceRole ? SERVICE_ROLE_KEY : (Deno.env.get('SUPABASE_ANON_KEY') ?? ''),
      isServiceRole
        ? { auth: { persistSession: false, autoRefreshToken: false } }
        : { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json().catch(() => ({}));
    const planDate = body.planDate || getTodayIST();
    const forceRegenerate = body.forceRegenerate || false;

    let user: { id: string };
    if (isServiceRole) {
      const targetUserId = body.targetUserId;
      if (!targetUserId || typeof targetUserId !== 'string') {
        throw new Error('Service-role call requires targetUserId');
      }
      user = { id: targetUserId };
    } else {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        return new Response(JSON.stringify({
          success: false,
          error: { code: 'AUTH_FAILED', message: 'Invalid or expired token', retry: false },
        }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      user = authUser;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'INVALID_DATE', message: 'planDate must be YYYY-MM-DD format', retry: false },
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- CHECK EXISTING PLAN ---
    if (!forceRegenerate) {
      const { data: existingPlan } = await supabase
        .from('planner')
        .select('id, plan_date, re_version, breakfast_ref_id, lunch_ref_id, dinner_ref_id, locked_slots')
        .eq('user_id', user.id)
        .eq('plan_date', planDate)
        .maybeSingle();

      if (existingPlan?.breakfast_ref_id && existingPlan?.lunch_ref_id && existingPlan?.dinner_ref_id) {
        const carousel = await fetchCarousel(supabase, existingPlan.id);
        return successResponse({ planId: existingPlan.id, ...carousel, cached: true }, corsHeaders);
      }
    }

    console.log('[RE-v1] Generating plan for user:', user.id, 'date:', planDate);
    const startTime = Date.now();

    // --- LOAD USER CONTEXT (parallel) ---
    const [profile, dietRules, cuisinePrefs, mealPrefs, neverList, recentPlans, inferredPrefs, affinityRows] =
      await Promise.all([
        supabase.from('profiles').select('food_pref, home_state, current_city').eq('id', user.id).maybeSingle().then(r => r.data),
        supabase.from('user_diet_rules').select('food_pref, excluded_ingredients').eq('user_id', user.id).maybeSingle().then(r => r.data),
        supabase.from('user_category_preferences').select('category_id, bucket').eq('user_id', user.id).eq('category_type', 'cuisine').then(r => r.data || []),
        supabase.from('user_category_preferences').select('category_id, bucket').eq('user_id', user.id).eq('category_type', 'meal_item').then(r => r.data || []),
        supabase.from('never_list').select('dish_id').eq('user_id', user.id).eq('is_active', true).then(r => r.data || []),
        supabase.from('planner').select('breakfast_ref_id, lunch_ref_id, dinner_ref_id').eq('user_id', user.id).gte('plan_date', getDateDaysAgo(RE_V1.VARIETY_GUARD_DAYS)).lt('plan_date', planDate).then(r => r.data || []),
        // RE v2: inferred prefs + pre-computed affinity. Both are nullable —
        // if either is missing, we degrade gracefully to v1 behaviour.
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
    const neverDishIds = new Set<number>(neverList.map((n: any) => n.dish_id));

    const cuisineBuckets: Record<string, string> = {};
    for (const p of cuisinePrefs as any[]) cuisineBuckets[p.category_id] = p.bucket;

    const mealItemBuckets: Record<string, string> = {};
    for (const p of mealPrefs as any[]) mealItemBuckets[p.category_id] = p.bucket;

    const recentDishIds = new Set<number>(
      (recentPlans as any[]).flatMap(p => [p.breakfast_ref_id, p.lunch_ref_id, p.dinner_ref_id].filter(Boolean))
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

    console.log('[RE-v1] Eligible dish pool after diet filter:', allDishes?.length ?? 0);

    const cuisineIdToCode: Record<number, string> = {};
    for (const d of allDishes as any[]) {
      if (d.cuisines?.code) cuisineIdToCode[d.cuisine_id] = d.cuisines.code;
    }

    const dayOfWeek = new Date(planDate + 'T00:00:00').getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // --- CHECK LOCKED SLOTS ---
    const { data: existingForLocks } = await supabase
      .from('planner')
      .select('id, breakfast_ref_id, lunch_ref_id, dinner_ref_id, locked_slots')
      .eq('user_id', user.id)
      .eq('plan_date', planDate)
      .maybeSingle();

    const lockedSlots: string[] = existingForLocks?.locked_slots || [];

    // --- SCORE AND GENERATE SLOTS ---
    const assignedDishIds = new Set<number>();

    const breakfastResult = generateSlot('breakfast', user.id, planDate, allDishes as any[], assignedDishIds, lockedSlots.includes('breakfast') ? existingForLocks?.breakfast_ref_id : undefined, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds, regionAffinityByCuisineId, inferredPrefs as any, affinityByDishId);
    const lunchResult     = generateSlot('lunch',     user.id, planDate, allDishes as any[], assignedDishIds, lockedSlots.includes('lunch')     ? existingForLocks?.lunch_ref_id     : undefined, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds, regionAffinityByCuisineId, inferredPrefs as any, affinityByDishId);
    const dinnerResult    = generateSlot('dinner',    user.id, planDate, allDishes as any[], assignedDishIds, lockedSlots.includes('dinner')    ? existingForLocks?.dinner_ref_id    : undefined, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds, regionAffinityByCuisineId, inferredPrefs as any, affinityByDishId);

    const breakfast = { top: breakfastResult.top, carousel: breakfastResult.carousel, scores: breakfastResult.carouselScores };
    const lunch     = { top: lunchResult.top,     carousel: lunchResult.carousel,     scores: lunchResult.carouselScores };
    const dinner    = { top: dinnerResult.top,    carousel: dinnerResult.carousel,    scores: dinnerResult.carouselScores };

    // Fallback if dish pool is insufficient
    const anyDishes = (allDishes as any[]) || [];
    if (!breakfast.top && anyDishes.length > 0) breakfast.top = anyDishes[0];
    if (!lunch.top && anyDishes.length > 1) lunch.top = anyDishes[1];
    if (!dinner.top && anyDishes.length > 2) dinner.top = anyDishes[2];

    // Hard-fail when the entire dish pool is empty (e.g. unsupported diet).
    if (!breakfast.top && !lunch.top && !dinner.top && anyDishes.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'ELIGIBLE_POOL_EMPTY', message: 'No eligible dishes match the diet/allergen filters', retry: false },
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!breakfast.top || !lunch.top || !dinner.top) {
      console.warn('[RE-v1] FALLBACK: insufficient dish pool — check dishes table');
    }

    // --- WRITE PLAN ---
    const { data: savedPlan, error: planError } = await supabase
      .from('planner')
      .upsert({
        user_id: user.id, plan_date: planDate,
        breakfast_ref_type: 'dish', breakfast_ref_id: breakfast.top?.id ?? null,
        lunch_ref_type: 'dish',     lunch_ref_id: lunch.top?.id ?? null,
        dinner_ref_type: 'dish',    dinner_ref_id: dinner.top?.id ?? null,
        re_version: reVersion,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,plan_date' })
      .select().single();

    if (planError) throw new Error('Failed to save plan: ' + planError.message);
    console.log('[RE-v1] Plan saved with ID:', savedPlan.id);

    // --- WRITE CAROUSEL ---
    await supabase.from('planner_carousel').delete().eq('planner_id', savedPlan.id);
    const carouselRows = [
      ...breakfast.carousel.map((d: any, i: number) => ({ planner_id: savedPlan.id, meal_slot: 'breakfast', ref_type: 'dish', ref_id: d.id, position: i, re_score: breakfast.scores[i] ?? null })),
      ...lunch.carousel.map((d: any, i: number)     => ({ planner_id: savedPlan.id, meal_slot: 'lunch',     ref_type: 'dish', ref_id: d.id, position: i, re_score: lunch.scores[i] ?? null })),
      ...dinner.carousel.map((d: any, i: number)    => ({ planner_id: savedPlan.id, meal_slot: 'dinner',    ref_type: 'dish', ref_id: d.id, position: i, re_score: dinner.scores[i] ?? null })),
    ];
    if (carouselRows.length > 0) {
      const { error: carouselError } = await supabase.from('planner_carousel').insert(carouselRows);
      if (carouselError) console.error('[RE-v1] Carousel write error:', carouselError.message);
    }

    // --- LOG SUGGESTION EVENTS (full carousel, not just position 0) ---
    // 'shown' for every dish surfaced; RE v2 learns from positions 1-7, not just the winner.
    const slotCarousels: Array<[string, any[]]> = [
      ['breakfast', breakfast.carousel],
      ['lunch', lunch.carousel],
      ['dinner', dinner.carousel],
    ];
    const logRows = slotCarousels.flatMap(([slot, carousel]) =>
      carousel.map((d: any, i: number) => ({
        user_id: user.id,
        dish_id: d.id,
        plan_date: planDate,
        meal_slot: slot,
        action: 'shown',
        position: i,
        re_version: reVersion,
      })),
    );
    if (logRows.length > 0) {
      const { error: logErr } = await supabase.from('suggestion_logs').insert(logRows);
      if (logErr) console.error('[RE-v1] suggestion_logs error:', logErr.message);
    }

    const elapsed = Date.now() - startTime;

    // --- LOG RE DECISIONS ---
    const weatherInfo = weather
      ? { city: profile?.current_city || profile?.home_state || 'Mumbai', temp: Math.round(weather.tempCelsius), condition: weather.tempCelsius > RE_V1.TEMP_HOT_CELSIUS ? 'Hot' : weather.tempCelsius < RE_V1.TEMP_COLD_CELSIUS ? 'Cold' : weather.weatherCode >= 500 ? 'Rainy' : 'Normal' }
      : null;

    const buildDebugRow = (slotResult: SlotResult, slotName: string, topDish: any) => ({
      user_id: user.id, plan_date: planDate, meal_slot: slotName,
      dish_id: topDish?.id ?? null, re_version: reVersion,
      final_score: slotResult.slotScore,
      eligible_pool_size: slotResult.totalEligible ?? 0,
      weather_input: weatherInfo,
      score_breakdown: {
        winner: { dish_name: topDish?.name ?? 'unknown', final_score: slotResult.slotScore, components: slotResult.slotComponents ?? {} },
        alternatives: slotResult.slotAlternatives ?? [],
        context: {
          weather: weatherInfo,
          day_of_week: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek],
          is_weekend: isWeekend,
          total_eligible_dishes: (allDishes as any[]).length,
          hard_filtered_out: (allDishes as any[]).length - (slotResult.totalEligible ?? 0),
          dish_pool_size: slotResult.totalEligible ?? 0,
        },
        re_version: reVersion, generation_time_ms: elapsed,
      },
    });

    const debugRows = [
      buildDebugRow(breakfastResult, 'breakfast', breakfast.top),
      buildDebugRow(lunchResult, 'lunch', lunch.top),
      buildDebugRow(dinnerResult, 'dinner', dinner.top),
    ].filter(r => r.dish_id !== null);

    if (debugRows.length > 0) {
      const { error: debugErr } = await supabase.from('recommendation_debug_log').insert(debugRows);
      if (debugErr) console.error('[RE-v1] recommendation_debug_log error:', debugErr.message);
    }

    // --- BUILD reSummary for client-side UserJourneyLogger ---
    const buildReSummarySlot = (slotResult: SlotResult, topDish: any) => {
      if (!topDish) return null;
      const reasoning = slotResult.slotComponents
        ? buildReasoning(topDish, slotResult.slotComponents, weather, isWeekend)
        : `App chose ${topDish.name}`;
      return {
        winner: { name: topDish.name, score: slotResult.slotScore, cuisine: topDish.cuisines?.name ?? '' },
        alternatives: slotResult.slotAlternatives.map(a => ({ dish_name: a.dish_name, final_score: a.final_score, why_not_first: a.why_not_first })),
        reasoning,
      };
    };

    console.log(`[RE-v1] Plan generated in ${elapsed}ms`);

    return successResponse({
      planId: savedPlan.id, planDate, reVersion, generatedInMs: elapsed, cached: false,
      breakfast: { dish: breakfast.top, carouselCount: breakfast.carousel.length },
      lunch:     { dish: lunch.top,     carouselCount: lunch.carousel.length },
      dinner:    { dish: dinner.top,    carouselCount: dinner.carousel.length },
      reSummary: {
        breakfast: buildReSummarySlot(breakfastResult, breakfast.top),
        lunch:     buildReSummarySlot(lunchResult, lunch.top),
        dinner:    buildReSummarySlot(dinnerResult, dinner.top),
      },
    }, corsHeaders);

  } catch (error: any) {
    console.error('[RE-v1] Fatal error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'PLAN_GENERATION_FAILED', message: error.message, retry: true },
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
