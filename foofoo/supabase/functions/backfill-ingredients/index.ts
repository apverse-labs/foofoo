/**
 * @summary One-shot Edge Function that batch-links ingredients to dishes via
 *          a curated keyword → ingredient-slug pattern map.
 *
 * @description
 * For Sprint 5 Day-0 backfill. For each active dish with no rows in
 * meal_ingredients, infers a likely ingredient set from:
 *   1. the dish name (longest-specific-keyword wins),
 *   2. its cuisine (when no name keyword matches),
 *   3. the diet_type — non_veg / egg dishes always include the appropriate
 *      meat or egg ingredient even when the name-pattern didn't include it
 *      (e.g. "Chicken Biryani" matches `biryani` first → still gets chicken).
 *
 * This is an APPROXIMATION. The content team refines later.
 *
 * The same logic is implemented in the SQL function
 * `public.backfill_ingredients_v1()` (migration 20260522000003) — for the
 * actual one-shot run we used the SQL function (atomic, transactional). This
 * Edge Function is kept as the canonical readable spec and is also callable
 * if you ever need to re-run from outside the DB.
 *
 * @calledBy One-time backfill run. Will become deprecated once meal_ingredients
 *           is fully manually curated.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pattern: dish name keyword → ordered list of ingredient slugs.
// Order matters: first match wins, so list longer / more-specific keys first.
const DISH_INGREDIENT_PATTERNS: Array<[string, string[]]> = [
  ['biryani',  ['basmati-rice','onion','ginger','garlic','garam-masala','curd','ghee','coriander-leaves']],
  ['pulao',    ['basmati-rice','onion','ghee','cumin','garam-masala']],
  ['khichdi',  ['rice','moong-dal','turmeric','cumin','ghee']],
  ['sambar',   ['toor-dal','tomato','tamarind','turmeric','mustard-seeds','curry-leaves','drumstick']],
  ['rasam',    ['toor-dal','tomato','tamarind','black-pepper','cumin','curry-leaves','coriander-leaves']],
  ['idli',     ['urad-dal','rice','mustard-seeds','curry-leaves']],
  ['dosa',     ['urad-dal','rice','mustard-seeds']],
  ['upma',     ['semolina','onion','mustard-seeds','curry-leaves','ginger','peas','coriander-leaves']],
  ['poha',     ['poha','onion','mustard-seeds','curry-leaves','turmeric','peanuts','coriander-leaves']],
  ['paratha',  ['wheat-flour','ghee','cumin']],
  ['roti',     ['wheat-flour','ghee']],
  ['paneer',   ['paneer','onion','tomato','cream','cumin','coriander','turmeric','red-chilli','garam-masala']],
  ['dal',      ['toor-dal','onion','tomato','turmeric','cumin','coriander','red-chilli','ghee','garlic','ginger']],
  ['chicken',  ['chicken','onion','tomato','ginger','garlic','garam-masala','coriander','turmeric','red-chilli']],
  ['mutton',   ['mutton','onion','ginger','garlic','garam-masala','coriander','turmeric','curd']],
  ['fish',     ['fish','onion','tomato','turmeric','red-chilli','coriander','mustard-seeds','curry-leaves']],
  ['prawn',    ['prawns','onion','tomato','turmeric','red-chilli','coriander','curry-leaves']],
  ['egg',      ['eggs','onion','tomato','turmeric','cumin','coriander','red-chilli']],
  ['halwa',    ['semolina','sugar','ghee','cardamom','cashews']],
  ['ladoo',    ['besan','sugar','ghee','cardamom']],
  ['kheer',    ['milk','rice','sugar','cardamom','cashews']],
  ['payasam',  ['milk','rice','sugar','cardamom']],
  ['raita',    ['curd','cumin','coriander-leaves','black-pepper']],
  ['chutney',  ['coriander-leaves','mint','garlic','ginger','red-chilli','tamarind']],
  ['curry',    ['onion','tomato','ginger','garlic','turmeric','coriander','red-chilli','garam-masala','sunflower-oil']],
  ['sabzi',    ['onion','tomato','turmeric','coriander','red-chilli','cumin','sunflower-oil']],
  ['soup',     ['onion','tomato','garlic','black-pepper','coriander-leaves']],
  ['rice',     ['rice','cumin','ghee']],
];

const CUISINE_DEFAULTS: Record<string, string[]> = {
  punjabi:        ['onion','tomato','ginger','garlic','cumin','coriander','turmeric','red-chilli','ghee'],
  south_indian:   ['mustard-seeds','curry-leaves','coconut','tamarind','urad-dal','red-chilli'],
  gujarati:       ['mustard-seeds','turmeric','sugar','coriander-leaves'],
  maharashtrian:  ['mustard-seeds','curry-leaves','coconut','tamarind','coriander-leaves'],
  bengali:        ['mustard-oil','mustard-seeds','turmeric','ginger'],
  rajasthani:     ['ghee','cumin','coriander','red-chilli'],
};

const CUISINE_NAME_MAP: Record<string, keyof typeof CUISINE_DEFAULTS> = {
  punjabi: 'punjabi', 'north indian': 'punjabi', delhi: 'punjabi', mughlai: 'punjabi',
  awadhi: 'punjabi', 'up (general)': 'punjabi', kashmiri: 'punjabi',
  'south indian': 'south_indian', tamil: 'south_indian', kerala: 'south_indian',
  karnataka: 'south_indian', andhra: 'south_indian', telangana: 'south_indian',
  chettinad: 'south_indian', malabar: 'south_indian', udupi: 'south_indian',
  hyderabadi: 'south_indian', mangalorean: 'south_indian', 'coorg (kodava)': 'south_indian',
  gujarati: 'gujarati', kutchi: 'gujarati',
  maharashtrian: 'maharashtrian', kolhapuri: 'maharashtrian', malvani: 'maharashtrian',
  vidarbha: 'maharashtrian', konkani: 'maharashtrian', goan: 'maharashtrian',
  bengali: 'bengali', odia: 'bengali', assamese: 'bengali',
  rajasthani: 'rajasthani', indori: 'rajasthani', 'madhya pradesh': 'rajasthani',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Service-role auth guard — one-shot admin function, not callable by users.
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceRoleKey || !authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'Service role key required', retry: false },
    }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Fetch the slug → id map once
  const { data: ingRows, error: ingErr } = await supabase
    .from('ingredients').select('id, slug');
  if (ingErr) return jsonError(ingErr.message);
  const slugToId = new Map<string, number>((ingRows ?? []).map((r) => [r.slug, r.id]));

  // Fetch dishes with no ingredients yet
  const { data: dishes, error: dishErr } = await supabase
    .from('dishes')
    .select('id, name, diet_type, cuisine_id, cuisines:cuisine_id(name)')
    .eq('is_active', true);
  if (dishErr) return jsonError(dishErr.message);

  let dishesLinked = 0;
  let dishesSkipped = 0;
  let rowsInserted = 0;

  for (const dish of dishes ?? []) {
    const { count } = await supabase
      .from('meal_ingredients')
      .select('id', { count: 'exact', head: true })
      .eq('dish_id', dish.id);
    if ((count ?? 0) > 0) continue;

    const nameLc = (dish.name ?? '').toLowerCase();
    let slugs: string[] | null = null;

    for (const [keyword, list] of DISH_INGREDIENT_PATTERNS) {
      if (nameLc.includes(keyword)) { slugs = [...list]; break; }
    }
    if (!slugs) {
      const cuisineNameLc = ((dish as any).cuisines?.name ?? '').toLowerCase();
      const key = CUISINE_NAME_MAP[cuisineNameLc];
      if (key) slugs = [...CUISINE_DEFAULTS[key]];
    }
    if (!slugs) { dishesSkipped++; continue; }

    // diet-type guarantee
    if (dish.diet_type === 'non_veg') {
      if (nameLc.includes('chicken') && !slugs.includes('chicken')) slugs.push('chicken');
      else if (nameLc.includes('mutton') && !slugs.includes('mutton')) slugs.push('mutton');
      else if ((nameLc.includes('fish') || nameLc.includes('machli') || nameLc.includes('macher'))
               && !slugs.includes('fish')) slugs.push('fish');
      else if ((nameLc.includes('prawn') || nameLc.includes('shrimp'))
               && !slugs.includes('prawns')) slugs.push('prawns');
    } else if (dish.diet_type === 'egg' && !slugs.includes('eggs')) {
      slugs.push('eggs');
    }

    const rows = slugs
      .map((slug, ord) => ({ slug, ord: ord + 1, ingredient_id: slugToId.get(slug) }))
      .filter((r) => r.ingredient_id !== undefined)
      .map((r) => ({ dish_id: dish.id, ingredient_id: r.ingredient_id!, display_order: r.ord }));

    if (rows.length === 0) { dishesSkipped++; continue; }

    const { error: insErr, count: insCnt } = await supabase
      .from('meal_ingredients').upsert(rows, {
        onConflict: 'dish_id,ingredient_id',
        ignoreDuplicates: true,
        count: 'exact',
      });
    if (insErr) {
      console.error('[BACKFILL]', dish.id, dish.name, insErr.message);
      continue;
    }
    dishesLinked++;
    rowsInserted += insCnt ?? 0;
  }

  // Refresh ingredient_ids[] on every linked dish
  await supabase.rpc('refresh_dish_ingredient_ids');

  return new Response(JSON.stringify({
    success: true,
    data: { dishesLinked, dishesSkipped, rowsInserted },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

function jsonError(message: string) {
  return new Response(JSON.stringify({
    success: false,
    error: { code: 'BACKFILL_FAILED', message, retry: false },
  }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
