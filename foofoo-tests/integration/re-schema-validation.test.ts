/**
 * re-schema-validation.test.ts
 *
 * Validates that every RE table (SCHEMA-RE-001 … SCHEMA-RE-005) exists on the
 * RE staging project with the expected key columns, and that RLS is enabled on
 * all user-facing RE tables.
 *
 * Technique: the anon client cannot read reference-table ROWS (RLS is enabled
 * with no policy), but PostgREST still surfaces SCHEMA errors. So we probe with
 *   .select('<col>').limit(0)
 * — no error means the table + column exist and are exposed; error code
 *   42P01 = table missing, 42703 = column missing.
 *
 * Run: npm run test:integration:re
 * Requires: SUPABASE_RE_URL + SUPABASE_RE_ANON_KEY (skips cleanly otherwise).
 */

import { supabaseRE, hasREConfig } from '../lib/supabase-re';
import { GATES } from '../config/success-gates';

const describeIfRE = hasREConfig() ? describe : describe.skip;

jest.setTimeout(60000);

// ─── Expected RE tables by schema version ─────────────────────────────────────

// SCHEMA-RE-001 — taxonomy + cohort reference tables + user profile/assignment.
const SCHEMA_RE_001 = [
  're_meal_classes',
  're_class_dish_options',
  're_cohorts',
  're_personas',
  're_states',
  're_main_cohorts',
  're_subcohorts',
  're_routing_rules',
  're_weekly_class_plans',
  're_nonveg_logic',
  're_city_migration_overlays',
  're_meal_class_overlap_rules',
  're_addon_classes',
  're_addon_dish_options',
  're_household_addon_plans',
  're_user_household_profiles',
  're_user_engine_assignments',
  're_engine_versions',
];
const SCHEMA_RE_002 = ['re_user_weekly_plans'];
const SCHEMA_RE_003 = ['re_user_addon_plans'];
const SCHEMA_RE_004 = ['re_user_feedback', 're_user_dish_affinity', 're_user_class_affinity'];
const SCHEMA_RE_005 = ['re_taxonomy_releases'];

const ALL_RE_TABLES = [
  ...SCHEMA_RE_001,
  ...SCHEMA_RE_002,
  ...SCHEMA_RE_003,
  ...SCHEMA_RE_004,
  ...SCHEMA_RE_005,
];

// Key columns to verify per table (subset — the load-bearing ones).
const KEY_COLUMNS: Record<string, string[]> = {
  re_states: ['state_id', 'state_ut', 'region_archetype'],
  re_meal_classes: ['meal_class_code', 'slot_group', 'class_name', 'diet_type'],
  re_class_dish_options: ['dish_option_id', 'meal_class_code', 'dish_name', 'diet_type', 'region_relevance'],
  re_cohorts: ['cohort_id', 'state_id', 'persona_id', 'main_cohort_id'],
  re_personas: ['persona_id'],
  re_weekly_class_plans: ['cohort_id', 'persona_id', 'day_of_week', 'breakfast_primary_class', 'dinner_primary_class'],
  re_household_addon_plans: ['persona_id', 'day_of_week', 'meal_slot', 'target_member_segment', 'addon_class_code'],
  re_user_household_profiles: ['profile_id', 'cohort_id'],
  re_user_weekly_plans: ['profile_id', 'cohort_id', 'plan_week_start', 'day_of_week', 'breakfast_class'],
  re_user_addon_plans: ['profile_id', 'plan_week_start', 'day_of_week', 'meal_slot', 'addon_class_code'],
  re_user_feedback: ['profile_id', 'dish_option_id', 'meal_class_code', 'signal_type', 'signal_weight'],
  re_user_dish_affinity: ['profile_id', 'dish_option_id', 'affinity_score', 'is_never'],
  re_user_class_affinity: ['profile_id', 'meal_class_code', 'affinity_score'],
  re_taxonomy_releases: ['id', 'taxonomy_version', 'qa_status', 'released_at'],
};

// User-facing RE tables that MUST have RLS enabled.
const RLS_REQUIRED_TABLES = [
  're_user_household_profiles',
  're_user_weekly_plans',
  're_user_addon_plans',
  're_user_feedback',
  're_user_dish_affinity',
  're_user_class_affinity',
];

// ─── Probes ───────────────────────────────────────────────────────────────────

/** Table exists + exposed via PostgREST if a LIMIT 0 select returns no schema error. */
async function tableExists(table: string): Promise<boolean> {
  const { error } = await (supabaseRE as any).from(table).select('*').limit(0);
  if (!error) return true;
  // 42P01 = undefined_table; PGRST205 = table not found in schema cache.
  return !(error.code === '42P01' || error.code === 'PGRST205' || /does not exist|not found/i.test(error.message ?? ''));
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const { error } = await (supabaseRE as any).from(table).select(column).limit(0);
  if (!error) return true;
  return !(error.code === '42703' || error.code === '42P01' || /column .* does not exist/i.test(error.message ?? ''));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describeIfRE('RE Schema: all tables exist (SCHEMA-RE-001..005)', () => {
  it('SCHEMA-RE-001 reference + taxonomy tables (18) all exist', async () => {
    const missing: string[] = [];
    for (const t of SCHEMA_RE_001) {
      if (!(await tableExists(t))) missing.push(t);
    }
    expect(missing).toEqual([]);
  });

  it('SCHEMA-RE-002 re_user_weekly_plans exists', async () => {
    for (const t of SCHEMA_RE_002) expect(await tableExists(t)).toBe(true);
  });

  it('SCHEMA-RE-003 re_user_addon_plans exists', async () => {
    for (const t of SCHEMA_RE_003) expect(await tableExists(t)).toBe(true);
  });

  it('SCHEMA-RE-004 feedback + affinity tables exist', async () => {
    for (const t of SCHEMA_RE_004) expect(await tableExists(t)).toBe(true);
  });

  it('SCHEMA-RE-005 re_taxonomy_releases exists', async () => {
    for (const t of SCHEMA_RE_005) expect(await tableExists(t)).toBe(true);
  });

  it(`no expected RE table is missing (gate: <= ${GATES.SCHEMA_MISSING_TABLES_MAX})`, async () => {
    const missing: string[] = [];
    for (const t of ALL_RE_TABLES) {
      if (!(await tableExists(t))) missing.push(t);
    }
    expect(missing.length).toBeLessThanOrEqual(GATES.SCHEMA_MISSING_TABLES_MAX);
  });
});

describeIfRE('RE Schema: key columns present', () => {
  for (const [table, cols] of Object.entries(KEY_COLUMNS)) {
    it(`${table} has key columns: ${cols.join(', ')}`, async () => {
      const missing: string[] = [];
      for (const c of cols) {
        if (!(await columnExists(table, c))) missing.push(c);
      }
      expect(missing).toEqual([]);
    });
  }
});

describeIfRE('RE Schema: RLS enabled on user-facing tables', () => {
  // The anon client (unauthenticated) must receive 0 rows from every user table.
  // With RLS enabled + `auth.uid() = profile_id`, anon's auth.uid() is NULL, so
  // the policy matches nothing → empty result, no error. If a table returned
  // rows here, RLS would be misconfigured (open read).
  for (const table of RLS_REQUIRED_TABLES) {
    it(`${table}: anon receives 0 rows (RLS active)`, async () => {
      const { data, error } = await (supabaseRE as any).from(table).select('*').limit(5);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });
  }
});
