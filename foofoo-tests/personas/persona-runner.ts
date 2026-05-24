#!/usr/bin/env ts-node
// personas/persona-runner.ts
// FooFoo Persona Validation Runner
// Loops all 50 personas, creates test users, seeds DB, calls Edge Functions,
// validates RE output expectations, generates reports.
//
// Usage:
//   npx ts-node --project tsconfig.json personas/persona-runner.ts
//   npx ts-node --project tsconfig.json personas/persona-runner.ts --persona P001
//   npx ts-node --project tsconfig.json personas/persona-runner.ts --diet veg
//
// Env required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import * as path from 'path';
import * as fs from 'fs';
import { supabaseAdmin, createTestUser, deleteTestUser } from '../lib/supabase';
import { PERSONAS, FooFooPersona, DietType } from './persona-definitions';
import { PersonaResult, DailyPlanResult, SlotPlanResult, Dish, ScoredDish } from '../lib/types';

// ─── CLI Argument Parsing ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filterPersona = args.includes('--persona')
  ? args[args.indexOf('--persona') + 1]
  : null;
const filterDiet = args.includes('--diet')
  ? args[args.indexOf('--diet') + 1] as DietType
  : null;
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');

function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}
function warn(msg: string): void {
  console.warn(`[WARN] ${msg}`);
}
function debug(msg: string): void {
  if (verbose) console.log(`  [DEBUG] ${msg}`);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';

// Cuisine name → cuisine_id lookup (populated from DB at runtime)
let cuisineIdMap: Record<string, number> = {};
// Ingredient name → ingredient_id lookup
let ingredientIdMap: Record<string, number> = {};

// ─── DB Lookup Helpers ────────────────────────────────────────────────────────

async function loadLookupMaps(): Promise<void> {
  // Load cuisines
  const { data: cuisines, error: cErr } = await supabaseAdmin
    .from('cuisines')
    .select('id, code, name');

  if (!cErr && cuisines) {
    for (const c of cuisines as any[]) {
      const normalised = (c.code ?? c.name ?? '').toLowerCase().replace(/\s+/g, '_');
      cuisineIdMap[normalised] = c.id;
      // Also map the raw name
      if (c.name) cuisineIdMap[c.name.toLowerCase().replace(/\s+/g, '_')] = c.id;
    }
    debug(`Loaded ${Object.keys(cuisineIdMap).length} cuisine mappings`);
  } else {
    warn(`Could not load cuisines: ${cErr?.message}. Cuisine preference seeding will be skipped.`);
  }

  // Load ingredients
  const { data: ingredients, error: iErr } = await supabaseAdmin
    .from('ingredients')
    .select('id, name');

  if (!iErr && ingredients) {
    for (const i of ingredients as any[]) {
      const normalised = (i.name ?? '').toLowerCase().trim();
      ingredientIdMap[normalised] = i.id;
    }
    // Also load aliases
    const { data: aliases } = await supabaseAdmin
      .from('ingredient_aliases')
      .select('ingredient_id, alias');
    if (aliases) {
      for (const a of aliases as any[]) {
        if (a.alias) ingredientIdMap[a.alias.toLowerCase().trim()] = a.ingredient_id;
      }
    }
    debug(`Loaded ${Object.keys(ingredientIdMap).length} ingredient mappings`);
  } else {
    warn(`Could not load ingredients: ${iErr?.message}. Allergen/exclusion seeding will use IDs = [].`);
  }
}

function resolveIngredientIds(names: string[]): number[] {
  const ids: number[] = [];
  for (const name of names) {
    const id = ingredientIdMap[name.toLowerCase().trim()];
    if (id !== undefined) ids.push(id);
    else debug(`Ingredient not found in DB: "${name}" — treating as DATA_GAP`);
  }
  return ids;
}

function resolveCuisineId(name: string): number | null {
  const normalised = name.toLowerCase().replace(/\s+/g, '_');
  return cuisineIdMap[normalised] ?? null;
}

// ─── Data Seeding ─────────────────────────────────────────────────────────────

async function seedPersonaData(userId: string, persona: FooFooPersona): Promise<string[]> {
  const dataGaps: string[] = [];

  // 1. Diet rules
  const allergenIds = resolveIngredientIds(persona.allergens.ingredient_names);
  const exclusionIds = resolveIngredientIds(persona.exclusions.ingredient_names);

  if (persona.allergens.ingredient_names.length > 0 && allergenIds.length === 0) {
    dataGaps.push(`Allergens not in DB: ${persona.allergens.ingredient_names.join(', ')}`);
  }
  if (persona.exclusions.ingredient_names.length > 0 && exclusionIds.length === 0) {
    dataGaps.push(`Exclusions not in DB: ${persona.exclusions.ingredient_names.join(', ')}`);
  }

  const { error: drError } = await supabaseAdmin.from('user_diet_rules').upsert({
    user_id: userId,
    diet_type: persona.diet_type,
    allergen_ingredient_ids: allergenIds,
    excluded_ingredient_ids: exclusionIds,
  });
  if (drError) warn(`[${persona.id}] user_diet_rules upsert failed: ${drError.message}`);

  // 2. Cuisine preferences
  const cuisinePrefs: any[] = [];
  for (const [cuisineName, bucket] of Object.entries(persona.buckets.cuisine)) {
    const cuisineId = resolveCuisineId(cuisineName);
    if (cuisineId === null) {
      dataGaps.push(`Cuisine not in DB: ${cuisineName}`);
      continue;
    }
    cuisinePrefs.push({
      user_id: userId,
      category_type: 'cuisine',
      item_id: cuisineId,
      preference_bucket: bucket,
    });
  }

  // 3. Breakfast meal-item preferences
  for (const [itemName, bucket] of Object.entries(persona.buckets.breakfast)) {
    cuisinePrefs.push({
      user_id: userId,
      category_type: 'breakfast_item',
      item_id: ingredientIdMap[itemName.toLowerCase()] ?? 0,
      preference_bucket: bucket,
    });
  }

  // 4. Lunch/dinner meal-item preferences
  for (const [itemName, bucket] of Object.entries(persona.buckets.lunch_dinner)) {
    cuisinePrefs.push({
      user_id: userId,
      category_type: 'lunch_dinner_item',
      item_id: ingredientIdMap[itemName.toLowerCase()] ?? 0,
      preference_bucket: bucket,
    });
  }

  if (cuisinePrefs.length > 0) {
    const { error: cpError } = await supabaseAdmin
      .from('user_category_preferences')
      .insert(cuisinePrefs);
    if (cpError) warn(`[${persona.id}] user_category_preferences insert failed: ${cpError.message}`);
  }

  // 5. user_consent
  const { error: consentError } = await supabaseAdmin.from('user_consent').upsert({
    user_id: userId,
    data_consent_at: new Date().toISOString(),
    data_consent_version: '1.0',
  });
  if (consentError) debug(`[${persona.id}] user_consent upsert: ${consentError.message}`);

  return dataGaps;
}

async function seedMaturityLogs(userId: string, persona: FooFooPersona): Promise<void> {
  if (persona.re_maturity === 'cold_start') return;

  const daysBack = persona.re_maturity === 'two_week' ? 14 : 90;
  const numLogs = persona.re_maturity === 'two_week' ? 28 : 180; // ~2 meals/day

  // Get some veg-compatible dish IDs from DB
  let dishQuery = supabaseAdmin.from('dishes').select('id').limit(30);
  if (persona.diet_type === 'veg') dishQuery = dishQuery.eq('diet_type', 'veg');
  else if (persona.diet_type === 'jain') dishQuery = dishQuery.eq('is_jain', true);
  else if (persona.diet_type === 'vegan') dishQuery = dishQuery.eq('diet_type', 'vegan');

  const { data: dishes } = await dishQuery;
  if (!dishes || dishes.length === 0) {
    warn(`[${persona.id}] No dishes found for maturity log seeding`);
    return;
  }

  const dishIds = (dishes as any[]).map((d) => d.id);

  const logs = Array.from({ length: numLogs }, (_, i) => {
    const daysAgo = Math.floor((i / numLogs) * daysBack);
    return {
      user_id: userId,
      ref_type: 'dish',
      ref_id: dishIds[i % dishIds.length],
      carousel_position: (i % 3) + 1,
      action: i % 4 === 0 ? 'swiped_past' : 'locked',
      action_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  const { error } = await supabaseAdmin.from('suggestion_logs').insert(logs);
  if (error) warn(`[${persona.id}] suggestion_logs insert failed: ${error.message}`);
  else debug(`[${persona.id}] Seeded ${logs.length} suggestion logs (${persona.re_maturity})`);
}

// ─── Edge Function Invocation ─────────────────────────────────────────────────

async function invokeGenerateFirstPlan(
  userId: string,
  date: string
): Promise<{ data: any; error: any }> {
  return supabaseAdmin.functions.invoke('generate-first-plan', {
    body: { user_id: userId, date },
  });
}

async function invokeCalculateInferredPrefs(userId: string): Promise<{ data: any; error: any }> {
  return supabaseAdmin.functions.invoke('calculate-inferred-prefs', {
    body: { user_id: userId },
  });
}

// ─── Plan Validation ──────────────────────────────────────────────────────────

interface CarouselRow {
  plan_date: string;
  slot: string;
  ref_ids: number[];
  scores: number[];
}

async function fetchGeneratedPlan(userId: string): Promise<CarouselRow[]> {
  const { data, error } = await supabaseAdmin
    .from('planner_carousel')
    .select('plan_date, slot, ref_ids, scores')
    .eq('user_id', userId)
    .order('plan_date', { ascending: true })
    .limit(21); // 7 days × 3 slots

  if (error) {
    warn(`Couldn't fetch planner_carousel for ${userId}: ${error.message}`);
    return [];
  }
  return (data ?? []) as CarouselRow[];
}

interface DishRow {
  id: number;
  name: string;
  diet_type: string;
  is_jain: boolean;
  cuisine_id: number;
  ingredient_ids: number[];
  meal_types: string[];
}

async function fetchDishDetails(ids: number[]): Promise<DishRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from('dishes')
    .select('id, name, diet_type, is_jain, cuisine_id, ingredient_ids, meal_types')
    .in('id', ids);

  if (error) {
    warn(`Couldn't fetch dishes: ${error.message}`);
    return [];
  }
  return (data ?? []) as DishRow[];
}

function checkHardConstraints(
  dish: DishRow,
  persona: FooFooPersona,
  allergenIds: number[]
): string | null {
  // Diet type check
  const dt = persona.diet_type;
  if (dt === 'veg' && dish.diet_type !== 'veg') {
    return `Diet violation: ${dish.name} is ${dish.diet_type}, persona is veg`;
  }
  if (dt === 'jain' && !dish.is_jain) {
    return `Jain violation: ${dish.name} is not Jain-compatible`;
  }
  if (dt === 'vegan' && dish.diet_type !== 'vegan') {
    return `Vegan violation: ${dish.name} is ${dish.diet_type}, persona is vegan`;
  }
  if (dt === 'egg' && !['veg', 'egg'].includes(dish.diet_type)) {
    return `Egg-only violation: ${dish.name} is ${dish.diet_type}`;
  }

  // Allergen check
  if (allergenIds.length > 0 && dish.ingredient_ids) {
    for (const aId of allergenIds) {
      if (dish.ingredient_ids.includes(aId)) {
        return `Allergen violation: ${dish.name} contains allergen ingredient_id=${aId}`;
      }
    }
  }

  // must_never_contain ingredient names check (resolve to IDs)
  const neverIds = resolveIngredientIds(persona.expectations.must_never_contain);
  if (neverIds.length > 0 && dish.ingredient_ids) {
    for (const nId of neverIds) {
      if (dish.ingredient_ids.includes(nId)) {
        const ingName = Object.keys(ingredientIdMap).find((k) => ingredientIdMap[k] === nId) ?? `id=${nId}`;
        return `must_never_contain violation: ${dish.name} contains "${ingName}"`;
      }
    }
  }

  return null;
}

async function validatePlan(
  userId: string,
  persona: FooFooPersona
): Promise<{
  constraint_violations: string[];
  critical_fails: string[];
  top3_cuisine_hit_rate: number;
  seven_day_variety_score: number;
  eligible_pool_size: number;
  daily_plans: DailyPlanResult[];
}> {
  const carousel = await fetchGeneratedPlan(userId);
  const allergenIds = resolveIngredientIds(persona.allergens.ingredient_names);

  if (carousel.length === 0) {
    return {
      constraint_violations: [],
      critical_fails: [],
      top3_cuisine_hit_rate: 0,
      seven_day_variety_score: 0,
      eligible_pool_size: 0,
      daily_plans: [],
    };
  }

  // Gather all ref_ids from carousel position 1 (top suggestion for each slot)
  const allRefIds = carousel.flatMap((c) => c.ref_ids ?? []);
  const top1RefIds = carousel.map((c) => (c.ref_ids ?? [])[0]).filter(Boolean);

  const allDishes = await fetchDishDetails([...new Set(allRefIds)]);
  const dishMap = new Map<number, DishRow>(allDishes.map((d) => [d.id, d]));

  const constraint_violations: string[] = [];
  const critical_fails: string[] = [];

  // Check ALL dishes in carousel (not just top 1)
  for (const row of carousel) {
    for (const refId of row.ref_ids ?? []) {
      const dish = dishMap.get(refId);
      if (!dish) continue;
      const violation = checkHardConstraints(dish, persona, allergenIds);
      if (violation) {
        const msg = `[${row.plan_date} ${row.slot}] ${violation}`;
        constraint_violations.push(msg);
        critical_fails.push(msg);
      }
    }
  }

  // Cuisine coverage: check if top3_cuisine_match cuisines appear in top suggestions
  const expectedCuisines = persona.expectations.top3_cuisine_match;
  let cuisineHits = 0;
  let cuisineChecks = 0;

  // Group by plan_date to check per-day coverage
  const byDate = new Map<string, number[]>();
  for (const row of carousel) {
    const existing = byDate.get(row.plan_date) ?? [];
    byDate.set(row.plan_date, [...existing, ...(row.ref_ids ?? []).slice(0, 3)]);
  }

  for (const [_date, refIds] of byDate.entries()) {
    cuisineChecks++;
    const dayCuisineIds = refIds
      .map((id) => dishMap.get(id)?.cuisine_id)
      .filter((id): id is number => id !== undefined);

    const expectedCuisineIds = expectedCuisines
      .map((name) => resolveCuisineId(name))
      .filter((id): id is number => id !== null);

    if (expectedCuisineIds.length === 0) {
      cuisineHits++; // no expected cuisines = no failure
      continue;
    }

    const hasMatch = dayCuisineIds.some((cid) => expectedCuisineIds.includes(cid));
    if (hasMatch) cuisineHits++;
  }

  const top3_cuisine_hit_rate = cuisineChecks > 0 ? cuisineHits / cuisineChecks : 0;

  // Variety score: count unique dishes across all top-1 suggestions
  const top1Dishes = new Set(top1RefIds);
  const totalSlots = carousel.length;
  const seven_day_variety_score = totalSlots > 0 ? top1Dishes.size / totalSlots : 0;

  // Eligible pool size
  const { count } = await (supabaseAdmin as any)
    .from('dishes')
    .select('id', { count: 'exact', head: true })
    .eq('diet_type', ['veg', 'jain', 'vegan'].includes(persona.diet_type) ? persona.diet_type : persona.diet_type);

  const eligible_pool_size = count ?? 0;

  // Build daily plans
  const daily_plans: DailyPlanResult[] = [];
  for (const [date, refIds] of byDate.entries()) {
    const slots: SlotPlanResult[] = [];
    const slotsForDate = carousel.filter((c) => c.plan_date === date);
    for (const row of slotsForDate) {
      const top3Dishes = (row.ref_ids ?? []).slice(0, 3).map((id, idx) => {
        const d = dishMap.get(id);
        return {
          rank: idx + 1,
          dish_id: id,
          dish_name: d?.name ?? `Unknown(${id})`,
          score: (row.scores ?? [])[idx] ?? 0,
          score_breakdown: {
            base: 1.0,
            cuisine_pref: 0,
            meal_item_pref: 0,
            weather: 0,
            day_of_week: 0,
            home_state: 0,
            history: 0,
            variety_penalty: 0,
            random: 0,
            total: (row.scores ?? [])[idx] ?? 0,
          },
          passes_hard_constraints: checkHardConstraints(
            d ?? { id, name: '', diet_type: 'veg', is_jain: false, cuisine_id: 0, ingredient_ids: [], meal_types: [] },
            persona,
            allergenIds
          ) === null,
          constraint_violation: d ? checkHardConstraints(d, persona, allergenIds) ?? undefined : undefined,
        };
      });

      slots.push({
        slot: row.slot as 'breakfast' | 'lunch' | 'dinner',
        top3_dishes: top3Dishes,
        selected_dish_id: (row.ref_ids ?? [])[0] ?? 0,
        selected_dish_name: dishMap.get((row.ref_ids ?? [])[0])?.name ?? '',
      });
    }
    daily_plans.push({ date, slots });
  }

  return {
    constraint_violations,
    critical_fails,
    top3_cuisine_hit_rate,
    seven_day_variety_score,
    eligible_pool_size,
    daily_plans,
  };
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanupPersonaData(userId: string, personaId: string): Promise<void> {
  const tables = [
    'user_diet_rules',
    'user_category_preferences',
    'user_consent',
    'never_list',
    'planner',
    'planner_carousel',
    'user_inferred_prefs',
    'user_dish_patterns',
    'user_behavioral_profile',
    'experiment_assignments',
  ];

  for (const table of tables) {
    const { error } = await (supabaseAdmin as any)
      .from(table)
      .delete()
      .eq('user_id', userId);
    if (error) debug(`[${personaId}] Cleanup ${table}: ${error.message}`);
  }

  // suggestion_logs: anonymize instead of delete (DPDP spec)
  await supabaseAdmin
    .from('suggestion_logs')
    .update({ user_id: null } as any)
    .eq('user_id', userId);

  await deleteTestUser(userId);
  debug(`[${personaId}] Cleanup complete`);
}

// ─── Single Persona Execution ─────────────────────────────────────────────────

async function runPersona(persona: FooFooPersona): Promise<PersonaResult> {
  const startTime = Date.now();
  const email = `test-persona-${persona.id.toLowerCase()}@foofoo.dev`;
  const password = 'PersonaTest123!';
  const today = new Date().toISOString().split('T')[0];

  log(`▶ [${persona.id}] ${persona.name} (${persona.diet_type}, ${persona.re_maturity})`);

  let userId = '';

  try {
    if (dryRun) {
      log(`  [DRY RUN] Would create user ${email} and run ${persona.id}`);
      return {
        persona_id: persona.id,
        persona_name: persona.name,
        diet_type: persona.diet_type,
        re_maturity: persona.re_maturity,
        status: 'PASS',
        constraint_violations: [],
        critical_fails: [],
        top3_cuisine_hit_rate: 1.0,
        seven_day_variety_score: 1.0,
        eligible_pool_size: 0,
        data_gaps: [],
        daily_plans: [],
        notes: 'DRY RUN — no DB operations performed',
        duration_ms: Date.now() - startTime,
      };
    }

    // Step 1: Create test user
    const user = await createTestUser(email, password);
    userId = user.id;
    debug(`[${persona.id}] Created user ${userId}`);

    // Step 2: Seed onboarding data
    const dataGaps = await seedPersonaData(userId, persona);

    // Step 3: For mature personas, seed suggestion logs
    await seedMaturityLogs(userId, persona);

    // Step 4: For mature personas, compute inferred prefs
    if (persona.re_maturity !== 'cold_start') {
      const { error: inferError } = await invokeCalculateInferredPrefs(userId);
      if (inferError) {
        dataGaps.push(`calculate-inferred-prefs not deployed: ${inferError.message}`);
      } else {
        debug(`[${persona.id}] calculate-inferred-prefs: success`);
      }
    }

    // Step 5: Generate plan
    const efStart = Date.now();
    const { data: planData, error: planError } = await invokeGenerateFirstPlan(userId, today);
    const planDuration = Date.now() - efStart;

    if (planError) {
      const gap = `generate-first-plan not deployed: ${planError.message}`;
      dataGaps.push(gap);
      log(`  ⚠️ [${persona.id}] DATA_GAP — ${gap}`);

      await cleanupPersonaData(userId, persona.id);
      return {
        persona_id: persona.id,
        persona_name: persona.name,
        diet_type: persona.diet_type,
        re_maturity: persona.re_maturity,
        status: 'DATA_GAP',
        constraint_violations: [],
        critical_fails: [],
        top3_cuisine_hit_rate: 0,
        seven_day_variety_score: 0,
        eligible_pool_size: 0,
        data_gaps: dataGaps,
        daily_plans: [],
        notes: 'Edge function not deployed — DATA_GAP, not a test failure',
        duration_ms: Date.now() - startTime,
      };
    }

    // Step 6: Validate plan
    const validation = await validatePlan(userId, persona);

    // Step 7: Determine final status
    let status: PersonaResult['status'] = 'PASS';
    const notes: string[] = [];

    if (validation.critical_fails.length > 0) {
      status = 'CRITICAL_FAIL';
      notes.push(`CRITICAL: ${validation.critical_fails.length} hard constraint violation(s)`);
      // Per spec: halt reporting the exact dish + ingredient
      for (const cf of validation.critical_fails) {
        log(`  ❌ CRITICAL_FAIL [${persona.id}]: ${cf}`);
      }
    } else if (validation.constraint_violations.length > 0) {
      status = 'FAIL';
      notes.push(`${validation.constraint_violations.length} constraint violation(s)`);
    } else if (dataGaps.length > 0) {
      status = 'DATA_GAP';
      notes.push(`${dataGaps.length} data gap(s)`);
    }

    if (planDuration > 3000) {
      notes.push(`⚠️ Edge function responded in ${planDuration}ms (>3s spec limit)`);
    }

    if (validation.top3_cuisine_hit_rate < 0.5 && persona.expectations.top3_cuisine_match.length > 0) {
      notes.push(`Low cuisine match rate: ${(validation.top3_cuisine_hit_rate * 100).toFixed(0)}%`);
      if (status === 'PASS') status = 'FAIL';
    }

    if (validation.eligible_pool_size < 5) {
      const gap = `Eligible pool too small (${validation.eligible_pool_size} dishes)`;
      dataGaps.push(gap);
      if (status === 'PASS') status = 'DATA_GAP';
    }

    log(`  ${status === 'PASS' ? '✅' : status === 'CRITICAL_FAIL' ? '❌' : status === 'DATA_GAP' ? '⚠️' : '⚠️'} [${persona.id}] ${status} — cuisine_match=${(validation.top3_cuisine_hit_rate * 100).toFixed(0)}% variety=${(validation.seven_day_variety_score * 100).toFixed(0)}%`);

    // Step 8: Cleanup
    await cleanupPersonaData(userId, persona.id);

    return {
      persona_id: persona.id,
      persona_name: persona.name,
      diet_type: persona.diet_type,
      re_maturity: persona.re_maturity,
      status,
      constraint_violations: validation.constraint_violations,
      critical_fails: validation.critical_fails,
      top3_cuisine_hit_rate: validation.top3_cuisine_hit_rate,
      seven_day_variety_score: validation.seven_day_variety_score,
      eligible_pool_size: validation.eligible_pool_size,
      data_gaps: dataGaps,
      daily_plans: validation.daily_plans,
      notes: notes.join('; ') || undefined,
      duration_ms: Date.now() - startTime,
    };

  } catch (err: any) {
    const errorMsg = err?.message ?? String(err);
    log(`  ❌ [${persona.id}] Unexpected error: ${errorMsg}`);

    // Attempt cleanup even on error
    if (userId) {
      try { await cleanupPersonaData(userId, persona.id); } catch { /* ignore cleanup errors */ }
    }

    return {
      persona_id: persona.id,
      persona_name: persona.name,
      diet_type: persona.diet_type,
      re_maturity: persona.re_maturity,
      status: 'FAIL',
      constraint_violations: [],
      critical_fails: [],
      top3_cuisine_hit_rate: 0,
      seven_day_variety_score: 0,
      eligible_pool_size: 0,
      data_gaps: [],
      daily_plans: [],
      notes: `Unexpected error: ${errorMsg}`,
      duration_ms: Date.now() - startTime,
    };
  }
}

// ─── Report Generation ────────────────────────────────────────────────────────

function buildMarkdownReport(results: PersonaResult[], durationMs: number): string {
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const criticalFails = results.filter((r) => r.status === 'CRITICAL_FAIL').length;
  const dataGaps = results.filter((r) => r.status === 'DATA_GAP').length;

  const now = new Date().toISOString();
  const lines: string[] = [
    `# FooFoo RE Persona Validation — Master Summary`,
    ``,
    `> Generated: ${now}  `,
    `> Branch: \`claude/fervent-ride-YZ7XB\`  `,
    `> Duration: ${(durationMs / 1000).toFixed(1)}s`,
    ``,
    `## Summary`,
    ``,
    `| Status | Count | % |`,
    `|--------|-------|---|`,
    `| ✅ PASS | ${passed} | ${((passed / total) * 100).toFixed(1)}% |`,
    `| ❌ CRITICAL_FAIL | ${criticalFails} | ${((criticalFails / total) * 100).toFixed(1)}% |`,
    `| ⚠️ FAIL | ${failed} | ${((failed / total) * 100).toFixed(1)}% |`,
    `| 🔵 DATA_GAP | ${dataGaps} | ${((dataGaps / total) * 100).toFixed(1)}% |`,
    `| **Total** | **${total}** | **100%** |`,
    ``,
    `## Diet Type Breakdown`,
    ``,
    `| Diet | Total | Pass | CRITICAL_FAIL | FAIL | DATA_GAP |`,
    `|------|-------|------|---------------|------|----------|`,
  ];

  const diets: DietType[] = ['veg', 'non_veg', 'egg', 'vegan', 'jain'];
  for (const diet of diets) {
    const dietResults = results.filter((r) => r.diet_type === diet);
    if (dietResults.length === 0) continue;
    const dp = dietResults.filter((r) => r.status === 'PASS').length;
    const dc = dietResults.filter((r) => r.status === 'CRITICAL_FAIL').length;
    const df = dietResults.filter((r) => r.status === 'FAIL').length;
    const dd = dietResults.filter((r) => r.status === 'DATA_GAP').length;
    lines.push(`| ${diet} | ${dietResults.length} | ${dp} | ${dc} | ${df} | ${dd} |`);
  }

  lines.push(``, `## Persona Results`, ``);
  lines.push(`| ID | Name | Diet | Maturity | Status | Cuisine Match | Variety | Pool | Notes |`);
  lines.push(`|----|------|------|----------|--------|--------------|---------|------|-------|`);

  for (const r of results) {
    const statusIcon = r.status === 'PASS' ? '✅' : r.status === 'CRITICAL_FAIL' ? '❌' : r.status === 'DATA_GAP' ? '🔵' : '⚠️';
    const cuisineMatch = `${(r.top3_cuisine_hit_rate * 100).toFixed(0)}%`;
    const variety = `${(r.seven_day_variety_score * 100).toFixed(0)}%`;
    lines.push(
      `| ${r.persona_id} | ${r.persona_name} | ${r.diet_type} | ${r.re_maturity} | ${statusIcon} ${r.status} | ${cuisineMatch} | ${variety} | ${r.eligible_pool_size} | ${r.notes ?? ''} |`
    );
  }

  // Critical fails section
  const cfResults = results.filter((r) => r.status === 'CRITICAL_FAIL');
  if (cfResults.length > 0) {
    lines.push(``, `## ❌ Critical Fails (Requires Immediate Fix)`, ``);
    for (const r of cfResults) {
      lines.push(`### ${r.persona_id} — ${r.persona_name}`);
      for (const cf of r.critical_fails) {
        lines.push(`- \`${cf}\``);
      }
      lines.push(``);
    }
  }

  // Data gaps section
  const dgResults = results.filter((r) => r.data_gaps.length > 0);
  if (dgResults.length > 0) {
    lines.push(``, `## 🔵 Data Gaps (Not Failures)`, ``);
    for (const r of dgResults) {
      if (r.data_gaps.length === 0) continue;
      lines.push(`**${r.persona_id}**: ${r.data_gaps.join('; ')}`);
    }
    lines.push(``);
  }

  lines.push(
    `---`,
    `*Generated by FooFoo persona-runner.ts — Sprint 5 test infrastructure*`
  );

  return lines.join('\n');
}

function buildHtmlReport(results: PersonaResult[], durationMs: number): string {
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const criticalFails = results.filter((r) => r.status === 'CRITICAL_FAIL').length;
  const dataGaps = results.filter((r) => r.status === 'DATA_GAP').length;

  const now = new Date().toISOString();

  // Embed data as JSON in script tag
  const jsonData = JSON.stringify({ results, meta: { total, passed, failed, criticalFails, dataGaps, durationMs, generatedAt: now } });

  const rowsHtml = results.map((r) => {
    const statusColor = r.status === 'PASS' ? '#22c55e' : r.status === 'CRITICAL_FAIL' ? '#ef4444' : r.status === 'DATA_GAP' ? '#3b82f6' : '#f59e0b';
    const statusBg = r.status === 'PASS' ? '#f0fdf4' : r.status === 'CRITICAL_FAIL' ? '#fef2f2' : r.status === 'DATA_GAP' ? '#eff6ff' : '#fffbeb';
    const cuisineMatch = `${(r.top3_cuisine_hit_rate * 100).toFixed(0)}%`;
    const variety = `${(r.seven_day_variety_score * 100).toFixed(0)}%`;

    return `<tr style="background:${statusBg}">
      <td style="font-weight:600;color:#374151">${r.persona_id}</td>
      <td>${r.persona_name}</td>
      <td><span class="badge badge-diet">${r.diet_type}</span></td>
      <td><span class="badge badge-maturity">${r.re_maturity}</span></td>
      <td><span style="color:${statusColor};font-weight:700">${r.status}</span></td>
      <td>${cuisineMatch}</td>
      <td>${variety}</td>
      <td>${r.eligible_pool_size}</td>
      <td style="font-size:0.75rem;color:#6b7280;max-width:200px">${r.notes ?? ''}</td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FooFoo RE Persona Dashboard</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
  .header { background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 24px 32px; }
  .header h1 { font-size: 1.75rem; font-weight: 800; }
  .header p { opacity: 0.85; margin-top: 4px; font-size: 0.9rem; }
  .container { max-width: 1400px; margin: 0 auto; padding: 24px 32px; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .card .number { font-size: 2.5rem; font-weight: 800; }
  .card .label { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
  .card.pass .number { color: #22c55e; }
  .card.critical .number { color: #ef4444; }
  .card.fail .number { color: #f59e0b; }
  .card.gap .number { color: #3b82f6; }
  .section { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 20px; }
  .section h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; color: #374151; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { text-align: left; padding: 10px 12px; background: #f1f5f9; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; cursor: pointer; user-select: none; }
  th:hover { background: #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
  .badge-diet { background: #fef3c7; color: #92400e; }
  .badge-maturity { background: #ede9fe; color: #5b21b6; }
  .critical-section { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .critical-section h2 { color: #dc2626; }
  .critical-item { font-family: monospace; font-size: 0.82rem; background: #fff; border: 1px solid #fca5a5; border-radius: 6px; padding: 8px 12px; margin-top: 8px; color: #7f1d1d; }
  .export-btn { float: right; margin-top: -4px; background: #f97316; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 600; }
  .export-btn:hover { background: #ea6c0a; }
  .meta { font-size: 0.78rem; color: #94a3b8; margin-top: 4px; }
  @media(max-width:900px) { .cards { grid-template-columns: repeat(2,1fr); } }
</style>
</head>
<body>
<div class="header">
  <h1>🍱 FooFoo — RE Persona Validation Dashboard</h1>
  <p>Sprint 5 · ${total} personas · Generated ${now}</p>
</div>
<div class="container">
  <!-- Summary cards -->
  <div class="cards">
    <div class="card pass">
      <div class="number">${passed}</div>
      <div class="label">✅ Passed</div>
    </div>
    <div class="card critical">
      <div class="number">${criticalFails}</div>
      <div class="label">❌ Critical Fails</div>
    </div>
    <div class="card fail">
      <div class="number">${failed}</div>
      <div class="label">⚠️ Failures</div>
    </div>
    <div class="card gap">
      <div class="number">${dataGaps}</div>
      <div class="label">🔵 Data Gaps</div>
    </div>
  </div>

  ${criticalFails > 0 ? `
  <div class="critical-section">
    <h2>❌ Critical Fails — Requires Immediate Fix</h2>
    ${results.filter(r => r.status === 'CRITICAL_FAIL').map(r => `
      <div style="margin-top:12px">
        <strong>${r.persona_id} — ${r.persona_name}</strong>
        ${r.critical_fails.map(cf => `<div class="critical-item">${cf}</div>`).join('')}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Persona table -->
  <div class="section">
    <h2>
      All Personas
      <button class="export-btn" onclick="exportJson()">⬇ Export JSON</button>
    </h2>
    <table id="personaTable">
      <thead>
        <tr>
          <th onclick="sortTable(0)">ID ↕</th>
          <th onclick="sortTable(1)">Name ↕</th>
          <th onclick="sortTable(2)">Diet ↕</th>
          <th onclick="sortTable(3)">Maturity ↕</th>
          <th onclick="sortTable(4)">Status ↕</th>
          <th onclick="sortTable(5)">Cuisine Match ↕</th>
          <th onclick="sortTable(6)">Variety ↕</th>
          <th onclick="sortTable(7)">Pool Size ↕</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
</div>

<script>
const DATA = ${jsonData};

function sortTable(colIdx) {
  const table = document.getElementById('personaTable');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const dir = table.dataset.sortDir === 'asc' ? 'desc' : 'asc';
  table.dataset.sortDir = dir;
  rows.sort((a, b) => {
    const av = a.cells[colIdx].textContent.trim();
    const bv = b.cells[colIdx].textContent.trim();
    const an = parseFloat(av.replace('%',''));
    const bn = parseFloat(bv.replace('%',''));
    if (!isNaN(an) && !isNaN(bn)) return dir === 'asc' ? an - bn : bn - an;
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  rows.forEach(r => tbody.appendChild(r));
}

function exportJson() {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'foofoo-persona-results.json';
  a.click();
}
</script>
</body>
</html>`;
}

// ─── Main Runner ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log(`FooFoo Persona Runner — Starting`);
  log(`Supabase URL: ${SUPABASE_URL || '(not set)'}`);

  if (!SUPABASE_URL) {
    console.error('ERROR: SUPABASE_URL is not set. Check .env.test or environment variables.');
    process.exit(1);
  }

  const overallStart = Date.now();

  // Load lookup maps first
  log(`Loading DB lookup maps (cuisines, ingredients)...`);
  await loadLookupMaps();

  // Determine which personas to run
  let personasToRun = PERSONAS;
  if (filterPersona) {
    personasToRun = PERSONAS.filter((p) => p.id === filterPersona.toUpperCase());
    if (personasToRun.length === 0) {
      console.error(`No persona found with ID: ${filterPersona}`);
      process.exit(1);
    }
  }
  if (filterDiet) {
    personasToRun = personasToRun.filter((p) => p.diet_type === filterDiet);
    log(`Filtered to diet_type=${filterDiet}: ${personasToRun.length} personas`);
  }

  log(`Running ${personasToRun.length} persona(s)${dryRun ? ' [DRY RUN]' : ''}...`);
  log('─'.repeat(60));

  const results: PersonaResult[] = [];

  // Run personas sequentially (to avoid DB connection exhaustion)
  for (const persona of personasToRun) {
    const result = await runPersona(persona);
    results.push(result);
  }

  const totalDuration = Date.now() - overallStart;
  log('─'.repeat(60));
  log(`Completed ${results.length} personas in ${(totalDuration / 1000).toFixed(1)}s`);

  // Summary stats
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const criticalFails = results.filter((r) => r.status === 'CRITICAL_FAIL').length;
  const dataGaps = results.filter((r) => r.status === 'DATA_GAP').length;

  log(`Results: ✅ ${passed} PASS | ❌ ${criticalFails} CRITICAL_FAIL | ⚠️ ${failed} FAIL | 🔵 ${dataGaps} DATA_GAP`);

  // ─── Generate Reports ──────────────────────────────────────────────────────

  const reportsDir = path.resolve(__dirname, '../reports');
  const mdDir = path.join(reportsDir, 'md');
  const htmlDir = path.join(reportsDir, 'html');
  const perPersonaDir = path.join(htmlDir, 'per-persona');

  // Ensure directories exist
  for (const dir of [mdDir, htmlDir, perPersonaDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  // Markdown report
  const mdPath = path.join(mdDir, 'master-summary.md');
  const mdContent = buildMarkdownReport(results, totalDuration);
  fs.writeFileSync(mdPath, mdContent, 'utf8');
  log(`📄 Markdown report: ${mdPath}`);

  // HTML dashboard
  const htmlPath = path.join(htmlDir, 'dashboard.html');
  const htmlContent = buildHtmlReport(results, totalDuration);
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  log(`📊 HTML dashboard: ${htmlPath}`);

  // Per-persona JSON files
  for (const result of results) {
    const jsonPath = path.join(perPersonaDir, `${result.persona_id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  }
  log(`📁 Per-persona JSONs: ${perPersonaDir}/`);

  // Full results JSON
  const fullResultsPath = path.join(reportsDir, 'persona-results.json');
  fs.writeFileSync(
    fullResultsPath,
    JSON.stringify({ meta: { generatedAt: new Date().toISOString(), total: results.length, passed, failed, criticalFails, dataGaps, durationMs: totalDuration }, results }, null, 2),
    'utf8'
  );
  log(`📦 Full results: ${fullResultsPath}`);

  // Exit with non-zero if any CRITICAL_FAILs
  if (criticalFails > 0) {
    log(`\n❌ CRITICAL_FAIL: ${criticalFails} persona(s) have hard constraint violations. See reports above.`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('Fatal error in persona-runner:', err);
  process.exit(1);
});
