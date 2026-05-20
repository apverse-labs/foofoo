/**
 * Supabase connection and schema smoke tests.
 * Usage: call testSupabaseConnection() inside app/index.tsx's useEffect during local dev,
 * then check the Metro bundler console for [TEST] lines.
 * Remove the call before shipping.
 */
import { supabase } from '../services/supabase';

/**
 * @summary Phase 1B — unauthenticated reads against public/anon-readable tables.
 * @returns Object with pass/fail flags for each tested table.
 */
export async function testSupabaseConnection() {
  console.log('[TEST] ─── Supabase connection test starting ───');

  // Test 1: cuisines_master (anon SELECT policy exists)
  const { data: cuisines, error: cuisineErr } = await supabase
    .from('cuisines_master')
    .select('id, name')
    .limit(3);

  if (cuisineErr) {
    console.error('[TEST] FAIL — cuisines_master:', cuisineErr.message, '| code:', cuisineErr.code);
  } else {
    console.log('[TEST] PASS — cuisines_master. Sample:', JSON.stringify(cuisines));
  }

  // Test 2: ingredients_master
  const { data: ingredients, error: ingErr } = await supabase
    .from('ingredients_master')
    .select('id, name, is_allergen')
    .limit(5);

  if (ingErr) {
    console.error('[TEST] FAIL — ingredients_master:', ingErr.message);
  } else {
    console.log('[TEST] PASS — ingredients_master. Count:', ingredients?.length);
  }

  // Test 3: ingredient_aliases
  const { data: aliases, error: aliasErr } = await supabase
    .from('ingredient_aliases')
    .select('id, ingredient_id, alias')
    .limit(5);

  if (aliasErr) {
    console.error('[TEST] FAIL — ingredient_aliases:', aliasErr.message);
  } else {
    console.log('[TEST] PASS — ingredient_aliases:', JSON.stringify(aliases));
  }

  // Test 4: dishes
  const { data: dishes, error: dishErr } = await supabase
    .from('dishes')
    .select('id, name, meal_types')
    .limit(3);

  if (dishErr) {
    console.error('[TEST] FAIL — dishes:', dishErr.message);
  } else {
    console.log('[TEST] PASS — dishes. Count:', dishes?.length);
  }

  // Test 5: Row counts to verify seed data
  const counts = await Promise.all([
    supabase.from('cuisines_master').select('*', { count: 'exact', head: true }),
    supabase.from('ingredients_master').select('*', { count: 'exact', head: true }),
    supabase.from('ingredient_aliases').select('*', { count: 'exact', head: true }),
    supabase.from('dishes').select('*', { count: 'exact', head: true }),
  ]);

  const labels = ['cuisines_master', 'ingredients_master', 'ingredient_aliases', 'dishes'];
  const minRows = [17, 20, 51, 20];
  counts.forEach(({ count, error }, i) => {
    if (error) {
      console.error(`[TEST] COUNT FAIL — ${labels[i]}:`, error.message);
    } else {
      const pass = (count ?? 0) >= minRows[i];
      console.log(`[TEST] ${pass ? 'PASS' : 'FAIL'} — ${labels[i]}: ${count} rows (need ≥${minRows[i]})`);
    }
  });

  console.log('[TEST] ─── Connection test done ───');

  return {
    cuisines: !cuisineErr,
    ingredients: !ingErr,
    aliases: !aliasErr,
    dishes: !dishErr,
  };
}

/**
 * @summary Phase 1C — authenticated reads against user-scoped tables.
 * @param userId  The UUID from supabase.auth.getUser().data.user.id
 */
export async function testAuthenticatedReads(userId: string) {
  console.log('[TEST] ─── Authenticated reads test (userId:', userId, ') ───');

  // Test: profiles
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  console.log('[TEST] profiles read:', profileErr ? 'FAIL: ' + profileErr.message : 'PASS');
  if (profile) console.log('[TEST] profiles data:', JSON.stringify(profile));

  // Test: user_diet_rules
  const { data: dietRules, error: dietErr } = await supabase
    .from('user_diet_rules')
    .select('*')
    .eq('user_id', userId);
  console.log('[TEST] user_diet_rules read:', dietErr ? 'FAIL: ' + dietErr.message : 'PASS');
  if (dietRules) console.log('[TEST] user_diet_rules data:', JSON.stringify(dietRules));

  // Test: user_category_preferences
  const { data: catPrefs, error: catErr } = await supabase
    .from('user_category_preferences')
    .select('*')
    .eq('user_id', userId);
  console.log('[TEST] user_category_preferences read:', catErr ? 'FAIL: ' + catErr.message : 'PASS');

  // Test: user_consent
  const { data: consent, error: consentErr } = await supabase
    .from('user_consent')
    .select('*')
    .eq('user_id', userId);
  console.log('[TEST] user_consent read:', consentErr ? 'FAIL: ' + consentErr.message : 'PASS');

  // Type-safety check: excluded_ingredients must be integer array
  if (dietRules && dietRules.length > 0) {
    const ids = dietRules[0].excluded_ingredients;
    if (Array.isArray(ids)) {
      const allNumbers = ids.every((x: unknown) => typeof x === 'number');
      console.log('[TEST] excluded_ingredients type check:', allNumbers ? 'PASS (integers)' : 'FAIL (has non-numbers): ' + JSON.stringify(ids.slice(0, 3)));
    } else {
      console.log('[TEST] excluded_ingredients type check: FAIL (not an array)');
    }
  }

  // Bucket value check
  if (catPrefs && catPrefs.length > 0) {
    const validBuckets = catPrefs.every((r: { bucket: string }) => ['F', 'O', 'N'].includes(r.bucket));
    const validTypes = catPrefs.every((r: { category_type: string }) => ['cuisine', 'meal_item'].includes(r.category_type));
    console.log('[TEST] bucket values check:', validBuckets ? 'PASS' : 'FAIL (invalid bucket value)');
    console.log('[TEST] category_type values check:', validTypes ? 'PASS' : 'FAIL (invalid category_type)');
  }

  console.log('[TEST] ─── Authenticated reads test done ───');
}
