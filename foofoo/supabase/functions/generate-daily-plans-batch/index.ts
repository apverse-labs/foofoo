/**
 * @summary Batch generates meal plans for all onboarded users (5 AM IST CRON).
 *
 * @description
 * Runs daily at 5:00 AM IST (23:30 UTC) via pg_cron + pg_net. Iterates every
 * profile with onboarding_completed=true and ensures a planner row exists for
 * "tomorrow" in IST. Skips users who already have a complete plan for that
 * date (locked slots preserved). Per-user failures are logged but never abort
 * the batch.
 *
 * Implementation note: the per-user RE v1 scoring is duplicated inline (not
 * an HTTP roundtrip into generate-daily-plan) so we can stay inside this
 * function's service-role context without crossing the platform JWT gate.
 * Long-term, both functions should share a common module via _shared/.
 *
 * @returns {{ success: true, data: { planDate, processed, skipped, errors, ms } }}
 * @calledBy public.run_daily_plans_batch() via pg_cron 5AM IST schedule
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateSlot, buildReasoning, type SlotResult } from './scoring.ts';
import { getDateDaysAgo, getWeatherData, stateNameToCode, loadRegionAffinity } from './helpers.ts';
import { RE_V1 } from './re-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * @summary Returns tomorrow's date in IST as YYYY-MM-DD.
 * @returns {string} ISO date string
 */
function getTomorrowIST(): string {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
}

interface ProcessResult {
  processed: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
}

/**
 * @summary Generates the planner row + carousel for one user, in-process.
 *
 * @description Mirror of the RE v1 pipeline inside generate-daily-plan, with
 *   the auth/cache layers removed. Uses the supplied service-role client so
 *   inserts/upserts/deletes work across users without per-call JWT.
 *
 * @param {SupabaseClient} supabase - service-role client
 * @param {string} userId - user to generate for
 * @param {string} planDate - YYYY-MM-DD target
 * @returns {Promise<{ ok: boolean; message?: string }>}
 */
async function generatePlanForUser(
  supabase: SupabaseClient,
  userId: string,
  planDate: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const [profile, dietRules, cuisinePrefs, mealPrefs, neverList, recentPlans, inferredPrefs, affinityRows] = await Promise.all([
      supabase.from('profiles').select('food_pref, home_state, current_city').eq('id', userId).maybeSingle().then(r => r.data),
      supabase.from('user_diet_rules').select('food_pref, excluded_ingredients').eq('user_id', userId).maybeSingle().then(r => r.data),
      supabase.from('user_category_preferences').select('category_id, bucket').eq('user_id', userId).eq('category_type', 'cuisine').then(r => r.data || []),
      supabase.from('user_category_preferences').select('category_id, bucket').eq('user_id', userId).eq('category_type', 'meal_item').then(r => r.data || []),
      supabase.from('never_list').select('dish_id').eq('user_id', userId).eq('is_active', true).then(r => r.data || []),
      supabase.from('planner').select('breakfast_ref_id, lunch_ref_id, dinner_ref_id').eq('user_id', userId).gte('plan_date', getDateDaysAgo(RE_V1.VARIETY_GUARD_DAYS)).lt('plan_date', planDate).then(r => r.data || []),
      supabase.from('user_inferred_prefs').select('spice_score, complexity_score, repeat_tolerance, cuisine_drift').eq('user_id', userId).maybeSingle().then(r => r.data),
      supabase.from('user_recipe_affinity').select('dish_id, affinity').eq('user_id', userId).then(r => r.data || []),
    ]);

    const foodPref = (dietRules as any)?.food_pref || (profile as any)?.food_pref || 'veg';
    const excludedIngredients = new Set<number>((dietRules as any)?.excluded_ingredients || []);
    const neverDishIds = new Set<number>((neverList as any[]).map(n => n.dish_id));

    const cuisineBuckets: Record<string, string> = {};
    for (const p of cuisinePrefs as any[]) cuisineBuckets[p.category_id] = p.bucket;
    const mealItemBuckets: Record<string, string> = {};
    for (const p of mealPrefs as any[]) mealItemBuckets[p.category_id] = p.bucket;
    const recentDishIds = new Set<number>(
      (recentPlans as any[]).flatMap(p => [p.breakfast_ref_id, p.lunch_ref_id, p.dinner_ref_id].filter(Boolean))
    );

    // RE v2: when inferred prefs exist, we stamp re_version='v2' and feed the
    // signals into scoring. Affinity is applied even without inferred prefs
    // since it's a direct historical engagement signal.
    const affinityByDishId: Record<number, number> = {};
    for (const row of affinityRows as Array<{ dish_id: number; affinity: number }>) {
      affinityByDishId[row.dish_id] = Number(row.affinity);
    }
    const reVersion: 'v1' | 'v2' = inferredPrefs ? 'v2' : 'v1';

    const homeStateCode = stateNameToCode((profile as any)?.home_state);
    const [weather, regionAffinityByCuisineId] = await Promise.all([
      getWeatherData(supabase, (profile as any)?.current_city || (profile as any)?.home_state || 'Mumbai'),
      loadRegionAffinity(supabase, homeStateCode),
    ]);

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
    if (dishError) throw new Error('dishes: ' + dishError.message);

    const cuisineIdToCode: Record<number, string> = {};
    for (const d of allDishes as any[]) {
      if (d.cuisines?.code) cuisineIdToCode[d.cuisine_id] = d.cuisines.code;
    }
    const dayOfWeek = new Date(planDate + 'T00:00:00').getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const { data: existingForLocks } = await supabase
      .from('planner')
      .select('id, breakfast_ref_id, lunch_ref_id, dinner_ref_id, locked_slots')
      .eq('user_id', userId)
      .eq('plan_date', planDate)
      .maybeSingle();
    const lockedSlots: string[] = (existingForLocks as any)?.locked_slots || [];
    const assignedDishIds = new Set<number>();

    const breakfastResult = generateSlot('breakfast', userId, planDate, allDishes as any[], assignedDishIds, lockedSlots.includes('breakfast') ? (existingForLocks as any)?.breakfast_ref_id : undefined, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds, regionAffinityByCuisineId, inferredPrefs as any, affinityByDishId);
    const lunchResult     = generateSlot('lunch',     userId, planDate, allDishes as any[], assignedDishIds, lockedSlots.includes('lunch')     ? (existingForLocks as any)?.lunch_ref_id     : undefined, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds, regionAffinityByCuisineId, inferredPrefs as any, affinityByDishId);
    const dinnerResult    = generateSlot('dinner',    userId, planDate, allDishes as any[], assignedDishIds, lockedSlots.includes('dinner')    ? (existingForLocks as any)?.dinner_ref_id    : undefined, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds, regionAffinityByCuisineId, inferredPrefs as any, affinityByDishId);

    const breakfast = { top: breakfastResult.top, carousel: breakfastResult.carousel, scores: breakfastResult.carouselScores };
    const lunch     = { top: lunchResult.top,     carousel: lunchResult.carousel,     scores: lunchResult.carouselScores };
    const dinner    = { top: dinnerResult.top,    carousel: dinnerResult.carousel,    scores: dinnerResult.carouselScores };

    const anyDishes = (allDishes as any[]) || [];
    if (!breakfast.top && anyDishes.length > 0) breakfast.top = anyDishes[0];
    if (!lunch.top && anyDishes.length > 1) lunch.top = anyDishes[1];
    if (!dinner.top && anyDishes.length > 2) dinner.top = anyDishes[2];

    const { data: savedPlan, error: planError } = await supabase
      .from('planner')
      .upsert({
        user_id: userId, plan_date: planDate,
        breakfast_ref_type: 'dish', breakfast_ref_id: breakfast.top?.id ?? null,
        lunch_ref_type: 'dish',     lunch_ref_id: lunch.top?.id ?? null,
        dinner_ref_type: 'dish',    dinner_ref_id: dinner.top?.id ?? null,
        re_version: reVersion,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,plan_date' })
      .select().single();
    if (planError) throw new Error('planner upsert: ' + planError.message);

    await supabase.from('planner_carousel').delete().eq('planner_id', savedPlan.id);
    const carouselRows = [
      ...breakfast.carousel.map((d: any, i: number) => ({ planner_id: savedPlan.id, meal_slot: 'breakfast', ref_type: 'dish', ref_id: d.id, position: i, re_score: breakfast.scores[i] ?? null })),
      ...lunch.carousel.map((d: any, i: number)     => ({ planner_id: savedPlan.id, meal_slot: 'lunch',     ref_type: 'dish', ref_id: d.id, position: i, re_score: lunch.scores[i] ?? null })),
      ...dinner.carousel.map((d: any, i: number)    => ({ planner_id: savedPlan.id, meal_slot: 'dinner',    ref_type: 'dish', ref_id: d.id, position: i, re_score: dinner.scores[i] ?? null })),
    ];
    if (carouselRows.length > 0) {
      const { error: cErr } = await supabase.from('planner_carousel').insert(carouselRows);
      if (cErr) console.error('[BATCH] carousel insert', cErr.message);
    }

    const slotCarousels: Array<[string, any[]]> = [
      ['breakfast', breakfast.carousel],
      ['lunch', lunch.carousel],
      ['dinner', dinner.carousel],
    ];
    const logRows = slotCarousels.flatMap(([slot, carousel]) =>
      carousel.map((d: any, i: number) => ({
        user_id: userId, dish_id: d.id, plan_date: planDate, meal_slot: slot,
        action: 'shown', position: i, re_version: reVersion,
      })),
    );
    if (logRows.length > 0) {
      await supabase.from('suggestion_logs').insert(logRows);
    }

    // --- LOG RE DECISIONS to recommendation_debug_log ---
    const weatherInfo = weather
      ? {
          city: (profile as any)?.current_city || (profile as any)?.home_state || 'Mumbai',
          temp: Math.round(weather.tempCelsius),
          condition: weather.tempCelsius > RE_V1.TEMP_HOT_CELSIUS ? 'Hot'
            : weather.tempCelsius < RE_V1.TEMP_COLD_CELSIUS ? 'Cold'
            : weather.weatherCode >= 500 ? 'Rainy' : 'Normal',
        }
      : null;

    const buildDebugRow = (slotResult: SlotResult, slotName: string, topDish: any) => ({
      user_id: userId, plan_date: planDate, meal_slot: slotName,
      dish_id: topDish?.id ?? null, re_version: reVersion,
      final_score: slotResult.slotScore,
      eligible_pool_size: slotResult.totalEligible ?? 0,
      weather_input: weatherInfo,
      score_breakdown: {
        winner: {
          dish_name: topDish?.name ?? 'unknown',
          final_score: slotResult.slotScore,
          components: slotResult.slotComponents ?? {},
          reasoning: slotResult.slotComponents && topDish
            ? buildReasoning(topDish, slotResult.slotComponents, weather, isWeekend)
            : null,
        },
        alternatives: slotResult.slotAlternatives ?? [],
        context: {
          weather: weatherInfo,
          day_of_week: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek],
          is_weekend: isWeekend,
          total_eligible_dishes: (allDishes as any[]).length,
          hard_filtered_out: (allDishes as any[]).length - (slotResult.totalEligible ?? 0),
          dish_pool_size: slotResult.totalEligible ?? 0,
        },
        re_version: reVersion, source: 'batch',
      },
    });

    const debugRows = [
      buildDebugRow(breakfastResult, 'breakfast', breakfast.top),
      buildDebugRow(lunchResult, 'lunch', lunch.top),
      buildDebugRow(dinnerResult, 'dinner', dinner.top),
    ].filter(r => r.dish_id !== null);
    if (debugRows.length > 0) {
      const { error: debugErr } = await supabase.from('recommendation_debug_log').insert(debugRows);
      if (debugErr) console.error('[BATCH] recommendation_debug_log error', debugErr.message);
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

/**
 * @summary Returns user IDs that already have a full plan for the date.
 * @param {SupabaseClient} supabase - service-role client
 * @param {string} planDate - YYYY-MM-DD
 * @returns {Promise<Set<string>>} user IDs to skip
 */
async function getUsersWithExistingPlans(
  supabase: SupabaseClient,
  planDate: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('planner')
    .select('user_id, breakfast_ref_id, lunch_ref_id, dinner_ref_id')
    .eq('plan_date', planDate);
  if (error) {
    console.warn('[BATCH] read existing plans failed', error.message);
    return new Set();
  }
  return new Set(
    (data ?? [])
      .filter(p => p.breakfast_ref_id && p.lunch_ref_id && p.dinner_ref_id)
      .map(p => p.user_id as string),
  );
}

/**
 * @summary Iterates all onboarded users and dispatches plan generation.
 * @param {SupabaseClient} supabase - service-role client
 * @param {string} planDate - YYYY-MM-DD target date
 * @returns {Promise<ProcessResult>}
 */
async function processAllUsers(
  supabase: SupabaseClient,
  planDate: string,
): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, skipped: 0, errors: 0, errorMessages: [] };
  const { data: users, error: usersErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('onboarding_completed', true);
  if (usersErr) {
    result.errors = 1;
    result.errorMessages.push(`profiles query failed: ${usersErr.message}`);
    return result;
  }
  const skipIds = await getUsersWithExistingPlans(supabase, planDate);
  for (const u of (users ?? [])) {
    const uid = (u as { id: string }).id;
    if (skipIds.has(uid)) { result.skipped += 1; continue; }
    const res = await generatePlanForUser(supabase, uid, planDate);
    if (res.ok) {
      result.processed += 1;
    } else {
      result.errors += 1;
      result.errorMessages.push(`${uid}: ${res.message ?? 'unknown'}`);
      console.error('[BATCH] user failed', uid, res.message);
    }
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'MISSING_ENV', message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set', retry: false },
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const planDate = (typeof body.planDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.planDate))
    ? body.planDate
    : getTomorrowIST();

  console.log('[BATCH] starting for planDate=', planDate);
  const result = await processAllUsers(supabase, planDate);
  const ms = Date.now() - t0;

  try {
    await supabase.from('etl_jobs').insert({
      job_name: 'generate-daily-plans-batch',
      status: result.errors > 0 && result.processed === 0 ? 'failed' : 'completed',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      rows_processed: result.processed,
      error_message: result.errors > 0 ? result.errorMessages.slice(0, 5).join(' | ') : null,
      metadata: {
        planDate,
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        elapsed_ms: ms,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[BATCH] etl_jobs insert failed', msg);
  }

  console.log(`[BATCH] done planDate=${planDate} processed=${result.processed} skipped=${result.skipped} errors=${result.errors} in ${ms}ms`);

  return new Response(JSON.stringify({
    success: true,
    data: { planDate, processed: result.processed, skipped: result.skipped, errors: result.errors, elapsed_ms: ms },
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
