/**
 * @summary Generates or retrieves the daily meal plan for a user.
 *
 * @description
 * Called when user opens Home screen. If a plan already exists for
 * today (and no slots are unlocked-empty), returns the cached plan.
 * Otherwise runs RE v1 scoring pipeline and writes to planner +
 * planner_carousel tables.
 *
 * RE v1 Pipeline:
 * 1. Hard filter — diet_type, allergens (integer IDs), never_list, is_active
 * 2. Base score 1.0 for all eligible dishes
 * 3. Cuisine boost — F bucket +0.3, O bucket +0.1, N bucket excluded
 * 4. Meal item boost — F +0.25, O +0.05
 * 5. Weather boost — fetch from weather_cache or OpenWeatherMap API
 * 6. Day-of-week — quick dishes on weekdays +0.1
 * 7. Variety guard — dishes in last 3 days get -0.5 penalty
 * 8. Random factor — add random 0 to 0.15
 * 9. Rank — top 8 per slot become carousel
 *
 * @param planDate - ISO date string YYYY-MM-DD (defaults to today IST)
 * @param forceRegenerate - boolean, default false
 *
 * @returns { success: true, data: { planId, breakfast, lunch, dinner, generatedAt, reVersion, reSummary } }
 *
 * @calledBy app/(tabs)/index.tsx on Home screen mount and pull-to-refresh
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreComponents {
  base: number;
  cuisineBoost: number;
  mealItemBoost: number;
  weatherBoost: number;
  dayBoost: number;
  varietyPenalty: number;
  randomFactor: number;
}

interface ScoreResult {
  score: number;
  components: ScoreComponents;
}

interface ScoredDish {
  dish: any;
  score: number;
  components: ScoreComponents;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json().catch(() => ({}));
    const planDate = body.planDate || getTodayIST();
    const forceRegenerate = body.forceRegenerate || false;

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
    const [profile, dietRules, cuisinePrefs, mealPrefs, neverList, recentPlans] =
      await Promise.all([
        supabase.from('profiles')
          .select('food_pref, home_state, current_city')
          .eq('id', user.id).maybeSingle().then(r => r.data),
        supabase.from('user_diet_rules')
          .select('food_pref, excluded_ingredients')
          .eq('user_id', user.id).maybeSingle().then(r => r.data),
        supabase.from('user_category_preferences')
          .select('category_id, bucket')
          .eq('user_id', user.id)
          .eq('category_type', 'cuisine').then(r => r.data || []),
        supabase.from('user_category_preferences')
          .select('category_id, bucket')
          .eq('user_id', user.id)
          .eq('category_type', 'meal_item').then(r => r.data || []),
        supabase.from('never_list')
          .select('dish_id').eq('user_id', user.id).eq('is_active', true).then(r => r.data || []),
        supabase.from('planner')
          .select('breakfast_ref_id, lunch_ref_id, dinner_ref_id')
          .eq('user_id', user.id)
          .gte('plan_date', getDateDaysAgo(3))
          .lt('plan_date', planDate)
          .then(r => r.data || []),
      ]);

    const foodPref = dietRules?.food_pref || profile?.food_pref || 'veg';
    const excludedIngredients = new Set<number>(dietRules?.excluded_ingredients || []);
    const neverDishIds = new Set<number>(neverList.map((n: any) => n.dish_id));

    const cuisineBuckets: Record<string, string> = {};
    for (const p of cuisinePrefs as any[]) cuisineBuckets[p.category_id] = p.bucket;

    const mealItemBuckets: Record<string, string> = {};
    for (const p of mealPrefs as any[]) mealItemBuckets[p.category_id] = p.bucket;

    const recentDishIds = new Set<number>(
      (recentPlans as any[]).flatMap(p =>
        [p.breakfast_ref_id, p.lunch_ref_id, p.dinner_ref_id].filter(Boolean)
      )
    );

    // --- FETCH WEATHER ---
    const weather = await getWeatherData(
      supabase,
      profile?.current_city || profile?.home_state || 'Mumbai'
    );

    // --- FETCH ELIGIBLE DISHES (hard filter: diet_type + is_active) ---
    let dishQuery = supabase
      .from('dishes')
      .select(`
        id, name, slug, cuisine_id, diet_type, spice_level,
        cook_time_mins, difficulty, calories, meal_types, dish_role,
        hero_image_url, blurhash, ingredient_ids, allergen_ids,
        cuisines(id, code, name)
      `)
      .eq('is_active', true);

    if (foodPref === 'veg') {
      dishQuery = dishQuery.in('diet_type', ['veg', 'vegan', 'jain']);
    } else if (foodPref === 'vegan') {
      dishQuery = dishQuery.eq('diet_type', 'vegan');
    } else if (foodPref === 'jain') {
      dishQuery = dishQuery.in('diet_type', ['veg', 'jain']);
    } else if (foodPref === 'egg') {
      dishQuery = dishQuery.in('diet_type', ['veg', 'egg', 'vegan', 'jain']);
    }

    const { data: allDishes, error: dishError } = await dishQuery;
    if (dishError) throw new Error('Failed to fetch dishes: ' + dishError.message);

    console.log('[RE-v1] Eligible dish pool after diet filter:', allDishes?.length ?? 0);

    const cuisineIdToCode: Record<number, string> = {};
    for (const d of allDishes as any[]) {
      if (d.cuisines?.code) cuisineIdToCode[d.cuisine_id] = d.cuisines.code;
    }

    // --- SCORING ---
    const dayOfWeek = new Date(planDate + 'T00:00:00').getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const scoreDish = (dish: any): ScoreResult => {
      const components: ScoreComponents = {
        base: 1.0, cuisineBoost: 0, mealItemBoost: 0,
        weatherBoost: 0, dayBoost: 0, varietyPenalty: 0, randomFactor: 0,
      };

      if (neverDishIds.has(dish.id)) return { score: -1, components };
      if (dish.allergen_ids?.length && excludedIngredients.size) {
        if ((dish.allergen_ids as number[]).some((id: number) => excludedIngredients.has(id))) {
          return { score: -1, components };
        }
      }
      const cuisineCode = cuisineIdToCode[dish.cuisine_id];
      if (cuisineCode && cuisineBuckets[cuisineCode] === 'N') return { score: -1, components };

      // Step 3: Cuisine boost
      if (cuisineCode) {
        if (cuisineBuckets[cuisineCode] === 'F') components.cuisineBoost = 0.3;
        else if (cuisineBuckets[cuisineCode] === 'O') components.cuisineBoost = 0.1;
      }

      // Step 4: Meal item boost
      const dishKey = String(dish.id);
      if (mealItemBuckets[dishKey] === 'F') components.mealItemBoost = 0.25;
      else if (mealItemBuckets[dishKey] === 'O') components.mealItemBoost = 0.05;

      // Step 5: Weather boost
      if (weather) {
        const isRainy = weather.weatherCode >= 500 && weather.weatherCode < 600;
        const isHot = weather.tempCelsius > 32;
        const isCold = weather.tempCelsius < 18;
        if (isRainy || isCold) {
          if (dish.spice_level >= 3) components.weatherBoost += 0.15;
          if (dish.calories > 400) components.weatherBoost += 0.1;
        }
        if (isHot) {
          if (dish.spice_level <= 2) components.weatherBoost += 0.1;
          if (dish.calories < 350) components.weatherBoost += 0.1;
        }
      }

      // Step 6: Day-of-week
      if (!isWeekend && dish.cook_time_mins && dish.cook_time_mins <= 20) components.dayBoost = 0.1;
      else if (isWeekend && dish.cook_time_mins && dish.cook_time_mins > 30) components.dayBoost = 0.05;

      // Step 7: Variety guard
      if (recentDishIds.has(dish.id)) components.varietyPenalty = -0.5;

      // Step 8: Random factor
      components.randomFactor = parseFloat((Math.random() * 0.15).toFixed(3));

      const score = components.base + components.cuisineBoost + components.mealItemBoost +
        components.weatherBoost + components.dayBoost + components.varietyPenalty + components.randomFactor;

      return { score: parseFloat(score.toFixed(3)), components };
    };

    // --- GENERATE SLOTS ---
    const assignedDishIds = new Set<number>();

    const generateSlot = (mealSlot: string, lockedDishId?: number) => {
      if (lockedDishId) {
        const locked = (allDishes as any[]).find(d => d.id === lockedDishId);
        return { top: locked, carousel: locked ? [locked] : [], slotScore: 1.0, slotComponents: null, slotAlternatives: [] };
      }

      const eligible: ScoredDish[] = ((allDishes as any[]) || [])
        .filter(d => Array.isArray(d.meal_types) && d.meal_types.includes(mealSlot))
        .map(d => { const r = scoreDish(d); return { dish: d, score: r.score, components: r.components }; })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);

      console.log(`[RE-v1] ${mealSlot}: ${eligible.length} eligible dishes scored`);

      const carousel = eligible.slice(0, 8).map(({ dish }) => dish);
      const top = carousel.find(d => !assignedDishIds.has(d.id)) ?? carousel[0] ?? null;
      if (top) assignedDishIds.add(top.id);

      const topEntry = eligible.find(e => e.dish.id === top?.id);
      const slotAlternatives = eligible
        .filter(e => e.dish.id !== top?.id)
        .slice(0, 3)
        .map(e => ({
          dish_name: e.dish.name,
          final_score: e.score,
          why_not_first: buildAlternativeReason(e.components, top ? (topEntry?.score ?? 1.0) - e.score : 0),
          components: e.components,
        }));

      return {
        top,
        carousel,
        slotScore: topEntry?.score ?? 1.0,
        slotComponents: topEntry?.components ?? null,
        slotAlternatives,
        totalEligible: eligible.length,
      };
    };

    // Check for existing locked slots
    const { data: existingForLocks } = await supabase
      .from('planner')
      .select('id, breakfast_ref_id, lunch_ref_id, dinner_ref_id, locked_slots')
      .eq('user_id', user.id)
      .eq('plan_date', planDate)
      .maybeSingle();

    const lockedSlots: string[] = existingForLocks?.locked_slots || [];
    const breakfastResult = generateSlot('breakfast', lockedSlots.includes('breakfast') ? existingForLocks?.breakfast_ref_id : undefined);
    const lunchResult = generateSlot('lunch', lockedSlots.includes('lunch') ? existingForLocks?.lunch_ref_id : undefined);
    const dinnerResult = generateSlot('dinner', lockedSlots.includes('dinner') ? existingForLocks?.dinner_ref_id : undefined);

    const breakfast = { top: breakfastResult.top, carousel: breakfastResult.carousel };
    const lunch = { top: lunchResult.top, carousel: lunchResult.carousel };
    const dinner = { top: dinnerResult.top, carousel: dinnerResult.carousel };

    // Fallback if dish pool insufficient
    const anyDishes = (allDishes as any[]) || [];
    if (!breakfast.top && anyDishes.length > 0) breakfast.top = anyDishes[0];
    if (!lunch.top && anyDishes.length > 1) lunch.top = anyDishes[1];
    if (!dinner.top && anyDishes.length > 2) dinner.top = anyDishes[2];

    if (!breakfast.top || !lunch.top || !dinner.top) {
      console.warn('[RE-v1] FALLBACK: insufficient dish pool — check dishes table');
    }

    // --- WRITE PLAN ---
    const planData = {
      user_id: user.id,
      plan_date: planDate,
      breakfast_ref_type: 'dish',
      breakfast_ref_id: breakfast.top?.id ?? null,
      lunch_ref_type: 'dish',
      lunch_ref_id: lunch.top?.id ?? null,
      dinner_ref_type: 'dish',
      dinner_ref_id: dinner.top?.id ?? null,
      re_version: 'v1',
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: savedPlan, error: planError } = await supabase
      .from('planner')
      .upsert(planData, { onConflict: 'user_id,plan_date' })
      .select()
      .single();

    if (planError) throw new Error('Failed to save plan: ' + planError.message);
    console.log('[RE-v1] Plan saved with ID:', savedPlan.id);

    // --- WRITE CAROUSEL ---
    await supabase.from('planner_carousel').delete().eq('planner_id', savedPlan.id);

    const carouselRows = [
      ...breakfast.carousel.map((d: any, i: number) => ({
        planner_id: savedPlan.id, meal_slot: 'breakfast', ref_type: 'dish', ref_id: d.id, position: i,
      })),
      ...lunch.carousel.map((d: any, i: number) => ({
        planner_id: savedPlan.id, meal_slot: 'lunch', ref_type: 'dish', ref_id: d.id, position: i,
      })),
      ...dinner.carousel.map((d: any, i: number) => ({
        planner_id: savedPlan.id, meal_slot: 'dinner', ref_type: 'dish', ref_id: d.id, position: i,
      })),
    ];

    if (carouselRows.length > 0) {
      const { error: carouselError } = await supabase.from('planner_carousel').insert(carouselRows);
      if (carouselError) console.error('[RE-v1] Carousel write error:', carouselError.message);
    }

    // --- LOG TO suggestion_logs ---
    const logRows = [
      breakfast.top && { user_id: user.id, dish_id: breakfast.top.id, plan_date: planDate, meal_slot: 'breakfast', action: 'viewed', position: 0, re_version: 'v1' },
      lunch.top && { user_id: user.id, dish_id: lunch.top.id, plan_date: planDate, meal_slot: 'lunch', action: 'viewed', position: 0, re_version: 'v1' },
      dinner.top && { user_id: user.id, dish_id: dinner.top.id, plan_date: planDate, meal_slot: 'dinner', action: 'viewed', position: 0, re_version: 'v1' },
    ].filter(Boolean);

    if (logRows.length > 0) {
      await supabase.from('suggestion_logs').insert(logRows).then(r => {
        if (r.error) console.error('[RE-v1] suggestion_logs error:', r.error.message);
      });
    }

    const elapsed = Date.now() - startTime;

    // --- LOG RE DECISIONS TO recommendation_debug_log (fire-and-forget per slot) ---
    const weatherInfo = weather
      ? { city: profile?.current_city || profile?.home_state || 'Mumbai', temp: Math.round(weather.tempCelsius), condition: weather.tempCelsius > 32 ? 'Hot' : weather.tempCelsius < 18 ? 'Cold' : weather.weatherCode >= 500 ? 'Rainy' : 'Normal' }
      : null;

    const buildDebugLog = (slotResult: ReturnType<typeof generateSlot>, slotName: string, topDish: any) => ({
      user_id: user.id,
      plan_date: planDate,
      meal_slot: slotName,
      dish_id: topDish?.id ?? null,
      re_version: 'v1',
      final_score: slotResult.slotScore,
      eligible_pool_size: (slotResult as any).totalEligible ?? 0,
      weather_input: weatherInfo ? { city: weatherInfo.city, temp: weatherInfo.temp, condition: weatherInfo.condition } : null,
      score_breakdown: {
        winner: {
          dish_name: topDish?.name ?? 'unknown',
          final_score: slotResult.slotScore,
          components: slotResult.slotComponents ?? {},
        },
        alternatives: slotResult.slotAlternatives ?? [],
        context: {
          weather: weatherInfo,
          day_of_week: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek],
          is_weekend: isWeekend,
          total_eligible_dishes: (allDishes as any[]).length,
          hard_filtered_out: (allDishes as any[]).length - ((slotResult as any).totalEligible ?? 0),
          dish_pool_size: (slotResult as any).totalEligible ?? 0,
        },
        re_version: 'v1',
        generation_time_ms: elapsed,
      },
    });

    const debugRows = [
      buildDebugLog(breakfastResult, 'breakfast', breakfast.top),
      buildDebugLog(lunchResult, 'lunch', lunch.top),
      buildDebugLog(dinnerResult, 'dinner', dinner.top),
    ].filter(r => r.dish_id !== null);

    if (debugRows.length > 0) {
      supabase.from('recommendation_debug_log').insert(debugRows).then(r => {
        if (r.error) console.error('[RE-v1] recommendation_debug_log error:', r.error.message);
      });
    }

    // --- BUILD reSummary for client-side UserJourneyLogger ---
    const buildReSummarySlot = (slotResult: ReturnType<typeof generateSlot>, topDish: any) => {
      if (!topDish) return null;
      const reasoning = slotResult.slotComponents
        ? buildReasoning(topDish, slotResult.slotComponents, weather, isWeekend)
        : `App chose ${topDish.name}`;
      return {
        winner: {
          name: topDish.name,
          score: slotResult.slotScore,
          cuisine: topDish.cuisines?.name ?? '',
        },
        alternatives: slotResult.slotAlternatives.map(a => ({
          dish_name: a.dish_name,
          final_score: a.final_score,
          why_not_first: a.why_not_first,
        })),
        reasoning,
      };
    };

    console.log(`[RE-v1] Plan generated in ${elapsed}ms`);

    return successResponse({
      planId: savedPlan.id,
      planDate,
      reVersion: 'v1',
      generatedInMs: elapsed,
      breakfast: { dish: breakfast.top, carouselCount: breakfast.carousel.length },
      lunch: { dish: lunch.top, carouselCount: lunch.carousel.length },
      dinner: { dish: dinner.top, carouselCount: dinner.carousel.length },
      cached: false,
      reSummary: {
        breakfast: buildReSummarySlot(breakfastResult, breakfast.top),
        lunch: buildReSummarySlot(lunchResult, lunch.top),
        dinner: buildReSummarySlot(dinnerResult, dinner.top),
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

// ── Helper: plain-English reasoning for the winner dish ──────
function buildReasoning(
  dish: any,
  components: ScoreComponents,
  weather: { weatherCode: number; tempCelsius: number } | null,
  isWeekend: boolean,
): string {
  const reasons: string[] = [];

  if (components.cuisineBoost >= 0.3) {
    reasons.push(`✓ ${dish.cuisines?.name ?? 'Cuisine'} — you marked this as Frequently (+${components.cuisineBoost.toFixed(2)})`);
  } else if (components.cuisineBoost > 0) {
    reasons.push(`✓ ${dish.cuisines?.name ?? 'Cuisine'} — you marked this as Occasionally (+${components.cuisineBoost.toFixed(2)})`);
  }

  if (components.mealItemBoost >= 0.2) {
    reasons.push(`✓ You marked ${dish.name} specifically as Frequently (+${components.mealItemBoost.toFixed(2)})`);
  } else if (components.mealItemBoost > 0) {
    reasons.push(`✓ You marked ${dish.name} specifically as Occasionally (+${components.mealItemBoost.toFixed(2)})`);
  }

  if (weather && components.weatherBoost > 0) {
    const isHot = weather.tempCelsius > 32;
    const isCold = weather.tempCelsius < 18;
    const isRainy = weather.weatherCode >= 500 && weather.weatherCode < 600;
    if (isHot) reasons.push(`✓ Hot day (${Math.round(weather.tempCelsius)}°C) — light dishes preferred (+${components.weatherBoost.toFixed(2)})`);
    else if (isRainy) reasons.push(`✓ Rainy day — warming dishes preferred (+${components.weatherBoost.toFixed(2)})`);
    else if (isCold) reasons.push(`✓ Cold day — hearty dishes preferred (+${components.weatherBoost.toFixed(2)})`);
  }

  if (components.dayBoost > 0) {
    if (!isWeekend) reasons.push(`✓ Weekday — quick dish (${dish.cook_time_mins ?? '?'} mins) preferred (+${components.dayBoost.toFixed(2)})`);
    else reasons.push(`✓ Weekend — more time to cook (+${components.dayBoost.toFixed(2)})`);
  }

  if (components.varietyPenalty < 0) {
    reasons.push(`✗ ${dish.name} was seen recently (variety penalty: ${components.varietyPenalty})`);
  } else {
    reasons.push(`✓ Haven't had ${dish.name} in the last 3 days — no variety penalty`);
  }

  return `Why ${dish.name} was chosen:\n${reasons.map(r => `  ${r}`).join('\n')}`;
}

// ── Helper: why an alternative didn't win ────────────────────
function buildAlternativeReason(components: ScoreComponents, scoreDiff: number): string {
  const reasons: string[] = [];
  if (components.varietyPenalty < 0) reasons.push(`had it recently (${components.varietyPenalty} variety penalty)`);
  if (components.cuisineBoost < 0.3 && components.cuisineBoost > 0) reasons.push('cuisine is Occasional, not Frequent');
  if (components.mealItemBoost === 0) reasons.push('dish not in meal preferences');
  if (reasons.length === 0 && scoreDiff > 0) reasons.push(`scored ${scoreDiff.toFixed(2)} below winner`);
  return reasons.join(', ') || 'lower overall score';
}

// ── Helper: today in IST ─────────────────────────────────────
function getTodayIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// ── Helper: N days ago in IST ────────────────────────────────
function getDateDaysAgo(n: number): string {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ── Helper: fetch weather (cache first) ─────────────────────
async function getWeatherData(supabase: any, city: string) {
  try {
    const { data: rows } = await supabase
      .from('weather_cache')
      .select('weather_code, temp_celsius, expires_at')
      .eq('city', city)
      .limit(1);

    const cached = rows?.[0];
    if (cached && new Date(cached.expires_at) > new Date()) {
      return { weatherCode: cached.weather_code, tempCelsius: Number(cached.temp_celsius) };
    }

    const apiKey = Deno.env.get('OPENWEATHERMAP_KEY');
    if (!apiKey) return null;

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&appid=${apiKey}&units=metric`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const weatherCode: number = data.weather?.[0]?.id;
    const tempCelsius: number = data.main?.temp;
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    await supabase.from('weather_cache')
      .insert({ city, weather_code: weatherCode, temp_celsius: tempCelsius, expires_at: expiresAt })
      .then(() => {});

    return { weatherCode, tempCelsius };
  } catch {
    return null;
  }
}

// ── Helper: fetch existing carousel ─────────────────────────
async function fetchCarousel(supabase: any, planId: string) {
  const { data } = await supabase
    .from('planner_carousel')
    .select(`
      ref_id, ref_type, meal_slot, position,
      dishes:ref_id(id, name, slug, cuisine_id, diet_type, spice_level,
                   cook_time_mins, difficulty, calories, meal_types,
                   dish_role, hero_image_url, blurhash,
                   cuisines(id, code, name))
    `)
    .eq('planner_id', planId)
    .order('position');

  const bySlot: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [] };
  for (const row of data || []) {
    if (bySlot[row.meal_slot]) bySlot[row.meal_slot].push(row);
  }

  return {
    breakfast: { dish: bySlot.breakfast[0]?.dishes, carouselCount: bySlot.breakfast.length },
    lunch: { dish: bySlot.lunch[0]?.dishes, carouselCount: bySlot.lunch.length },
    dinner: { dish: bySlot.dinner[0]?.dishes, carouselCount: bySlot.dinner.length },
  };
}

// ── Helper: success response ─────────────────────────────────
function successResponse(data: any, headers: any) {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
