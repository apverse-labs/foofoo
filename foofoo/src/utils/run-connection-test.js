// Standalone Node.js runner for Supabase connection + schema verification.
// Usage:
//   node src/utils/run-connection-test.js
//   node src/utils/run-connection-test.js test@example.com MyPassword1
// The email/password args sign in as a real user so RLS-gated queries work.
'use strict';

const { createClient } = require('../../node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://ufgfznpqixplcbhmsqqw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZ2Z6bnBxaXhwbGNiaG1zcXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTg4MjMsImV4cCI6MjA5NDczNDgyM30.DUP9dIp2g6E-g3fphtdSNmQAKrmecJj6WEs0NKe-f4M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const pass  = (msg) => console.log(`  PASS  ${msg}`);
const fail  = (msg) => console.error(`  FAIL  ${msg}`);
const info  = (msg) => console.log(`  INFO  ${msg}`);
const note  = (msg) => console.log(`  NOTE  ${msg}`);

// RLS note: cuisines_master, ingredients_master, ingredient_aliases, dishes all require
// `authenticated` role — anon client returns 0 rows (not an error).
// Pass email + password as CLI args for an authenticated count check.
const [,, testEmail, testPassword] = process.argv;

async function runConnectionTest() {

  // ── Optional sign-in ────────────────────────────────────────────────────
  let userId = null;
  if (testEmail && testPassword) {
    console.log(`\n  Signing in as ${testEmail}…`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail, password: testPassword,
    });
    if (error) {
      fail(`Sign-in failed: ${error.message}`);
    } else {
      userId = data.user.id;
      pass(`Signed in — userId: ${userId}`);
    }
  } else {
    note('No credentials supplied — count checks use anon key (RLS returns 0 rows for seed tables).');
    note('Re-run with: node run-connection-test.js <email> <password> for full verification.');
  }

  // ── Phase 1B: table reachability ────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  Phase 1B — Table reachability (no error = reachable)');
  console.log('══════════════════════════════════════════════');

  for (const { table, cols } of [
    { table: 'cuisines_master',          cols: 'id, name' },
    { table: 'ingredients_master',       cols: 'id, name, is_allergen' },
    { table: 'ingredient_aliases',       cols: 'id, ingredient_id, alias' },
    { table: 'dishes',                   cols: 'id, name, meal_types' },
  ]) {
    const { data, error } = await supabase.from(table).select(cols).limit(3);
    if (error) fail(`${table}: ${error.message} (${error.code})`);
    else       pass(`${table} reachable — RLS rows visible to this client: ${data.length}`);
  }

  // ── Phase 2A: column structure ──────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  Phase 2A — Column structure (all expected columns present?)');
  console.log('══════════════════════════════════════════════');

  for (const { table, cols } of [
    { table: 'profiles',               cols: 'id,name,username,food_pref,home_state,current_city,onboarding_completed,onboarding_step,notifications_enabled,notification_time,role' },
    { table: 'user_diet_rules',        cols: 'id,user_id,food_pref,excluded_ingredients' },
    { table: 'user_category_preferences', cols: 'id,user_id,category_type,category_id,bucket' },
    { table: 'user_consent',           cols: 'id,user_id,data_consent_at' },
    { table: 'ingredient_aliases',     cols: 'id,ingredient_id,alias' },
    { table: 'cuisines_master',        cols: 'id,code,name,display_name,tier,display_order,is_active,is_user_facing' },
    { table: 'dishes',                 cols: 'id,name,slug,cuisine_id,diet_type,dish_role,meal_types,spice_level,difficulty,cook_time_mins,calories,is_active' },
  ]) {
    const { error } = await supabase.from(table).select(cols).limit(0);
    if (error) fail(`${table} columns [${cols}]: ${error.message}`);
    else       pass(`${table} — all expected columns present`);
  }

  // ── Phase 2B: seed counts (needs auth) ──────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  Phase 2B — Seed data row counts');
  console.log('══════════════════════════════════════════════');

  const countChecks = [
    { table: 'cuisines_master',    min: 17 },
    { table: 'ingredients_master', min: 20 },
    { table: 'ingredient_aliases', min: 51 },
    { table: 'dishes',             min: 20 },
  ];

  for (const { table, min } of countChecks) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      fail(`${table} count query error: ${error.message}`);
    } else if (count === 0 && !userId) {
      note(`${table}: 0 rows via anon client (RLS expected — SQL Editor confirmed data exists). Sign in to verify.`);
    } else if (count >= min) {
      pass(`${table}: ${count} rows ≥ ${min}`);
    } else {
      fail(`${table}: ${count} rows — below minimum ${min}`);
    }
  }

  // ── Phase 1B: allergen search ────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  Phase 1B — Allergen alias search (needs auth)');
  console.log('══════════════════════════════════════════════');

  for (const term of ['pea', 'milk', 'wheat']) {
    const { data, error } = await supabase
      .from('ingredient_aliases')
      .select('alias, ingredient_id')
      .ilike('alias', `%${term}%`)
      .limit(10);
    if (error) {
      fail(`searchAllergens("${term}"): ${error.message}`);
    } else if (data.length === 0 && !userId) {
      note(`searchAllergens("${term}"): 0 results via anon (RLS — will work in app with auth session)`);
    } else if (data.length > 0) {
      pass(`searchAllergens("${term}"): ${data.length} result(s): ${JSON.stringify(data)}`);
    } else {
      fail(`searchAllergens("${term}"): 0 results even with auth — alias data may be missing`);
    }
  }

  // ── Phase 1C: authenticated user reads ─────────────────────────────────
  if (userId) {
    console.log('\n══════════════════════════════════════════════');
    console.log('  Phase 1C — Authenticated user table reads');
    console.log('══════════════════════════════════════════════');

    for (const { table, filter } of [
      { table: 'profiles',               filter: (q) => q.eq('id', userId) },
      { table: 'user_diet_rules',        filter: (q) => q.eq('user_id', userId) },
      { table: 'user_category_preferences', filter: (q) => q.eq('user_id', userId) },
      { table: 'user_consent',           filter: (q) => q.eq('user_id', userId) },
    ]) {
      const { data, error } = await filter(supabase.from(table).select('*'));
      if (error) fail(`${table}: ${error.message}`);
      else       pass(`${table}: ${data.length} row(s) for this user`);
    }

    // Type-safety: excluded_ingredients must be integer[]
    const { data: dr } = await supabase
      .from('user_diet_rules').select('excluded_ingredients').eq('user_id', userId).maybeSingle();
    if (dr) {
      const ids = dr.excluded_ingredients;
      const ok = Array.isArray(ids) && ids.every((x) => typeof x === 'number');
      if (ok) pass(`excluded_ingredients type: integer[] ✓`);
      else    fail(`excluded_ingredients type: expected integer[], got ${JSON.stringify(ids)}`);
    }

    // Bucket value check
    const { data: prefs } = await supabase
      .from('user_category_preferences').select('bucket,category_type').eq('user_id', userId);
    if (prefs && prefs.length > 0) {
      const badBucket = prefs.find((r) => !['F','O','N'].includes(r.bucket));
      const badType   = prefs.find((r) => !['cuisine','meal_item'].includes(r.category_type));
      if (badBucket) fail(`Invalid bucket value: ${badBucket.bucket}`);
      else           pass(`bucket values all valid (F/O/N)`);
      if (badType)   fail(`Invalid category_type: ${badType.category_type}`);
      else           pass(`category_type values all valid (cuisine/meal_item)`);
    }
  }

  console.log('');
}

runConnectionTest().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
