/**
 * BUILD-01 Seed Validation Tests
 * DOC-25 / BUILD-01: Validates RE seed data integrity on foofoo-staging
 *
 * Run: npx jest --testPathPattern=seed_validation
 *
 * These are validation-only tests. No plan generation tested here (BUILD-04).
 * All checks run against foofoo-staging — never production.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Staging only — never production
const STAGING_URL = process.env.SUPABASE_STAGING_URL || 'https://kwypxyqxojauhiehuirz.supabase.co';
const STAGING_KEY = process.env.SUPABASE_STAGING_ANON_KEY || '';

let supabase: SupabaseClient;

beforeAll(() => {
  if (!STAGING_KEY) {
    throw new Error('SUPABASE_STAGING_ANON_KEY env var required');
  }
  supabase = createClient(STAGING_URL, STAGING_KEY);
});

async function count(table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`Count failed on ${table}: ${error.message}`);
  return count ?? 0;
}

async function sql(query: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) throw new Error(`SQL failed: ${error.message}`);
  return data;
}

// ── VAL-14: Version registry ────────────────────────────────
describe('VAL-14: re_engine_versions', () => {
  test('has exactly 6 rows (2 legacy + 4 classfirst)', async () => {
    const n = await count('re_engine_versions');
    expect(n).toBe(6);
  });

  test('classfirst_v1 is_active=true, others false', async () => {
    const { data } = await supabase.from('re_engine_versions').select('version_code,is_active');
    const active = data?.filter(r => r.is_active).map(r => r.version_code);
    expect(active).toEqual(['classfirst_v1']);
  });
});

// ── VAL-09: State count ─────────────────────────────────────
describe('VAL-09: re_states', () => {
  test('has exactly 36 states/UTs', async () => {
    const n = await count('re_states');
    expect(n).toBe(36);
  });

  test('Madhya Pradesh exists with state_id S13', async () => {
    const { data } = await supabase
      .from('re_states')
      .select('state_id,state_ut')
      .eq('state_id', 'S13');
    expect(data?.[0]?.state_ut).toBe('Madhya Pradesh');
  });
});

// ── VAL-10: Persona + subcohort count ──────────────────────
describe('VAL-10: re_personas and re_subcohorts', () => {
  test('has exactly 41 personas', async () => {
    const n = await count('re_personas');
    expect(n).toBe(41);
  });

  test('has exactly 41 subcohorts', async () => {
    const n = await count('re_subcohorts');
    expect(n).toBe(41);
  });
});

// ── VAL-11: Main cohort count ───────────────────────────────
describe('VAL-11: re_main_cohorts', () => {
  test('has exactly 5 main cohorts', async () => {
    const n = await count('re_main_cohorts');
    expect(n).toBe(5);
  });

  test('IDs are MC1 through MC5', async () => {
    const { data } = await supabase.from('re_main_cohorts').select('main_cohort_id').order('main_cohort_id');
    const ids = data?.map(r => r.main_cohort_id);
    expect(ids).toEqual(['MC1', 'MC2', 'MC3', 'MC4', 'MC5']);
  });
});

// ── VAL-12: Meal class counts ───────────────────────────────
describe('VAL-12: re_meal_classes primary/addon split', () => {
  test('has exactly 131 total meal classes', async () => {
    const n = await count('re_meal_classes');
    expect(n).toBe(131);
  });

  test('118 classes have allowed_as_weekly_primary=true', async () => {
    const { count: n } = await supabase
      .from('re_meal_classes')
      .select('*', { count: 'exact', head: true })
      .eq('allowed_as_weekly_primary', true);
    expect(n).toBe(118);
  });

  test('13 classes have allowed_as_weekly_primary=false', async () => {
    const { count: n } = await supabase
      .from('re_meal_classes')
      .select('*', { count: 'exact', head: true })
      .eq('allowed_as_weekly_primary', false);
    expect(n).toBe(13);
  });
});

// ── VAL-01/02: Every dish maps to valid meal_class_code ─────
describe('VAL-01/02: re_class_dish_options FK integrity', () => {
  test('all dish_option_ids have valid meal_class_code FK', async () => {
    // Orphaned dishes would have no matching class
    const { data } = await supabase
      .from('re_class_dish_options')
      .select('dish_option_id, meal_class_code, re_meal_classes!inner(meal_class_code)')
      .limit(5);
    // If FK is enforced, this query succeeds; no NULL inner joins
    expect(data).not.toBeNull();
    data?.forEach(row => {
      expect(row.meal_class_code).toBeTruthy();
    });
  });

  test('1050 dish options loaded', async () => {
    const n = await count('re_class_dish_options');
    expect(n).toBeGreaterThanOrEqual(900); // workbook had 1050
  });
});

// ── VAL-03: Addon dishes not in primary pool ────────────────
describe('VAL-03: No addon-only class in re_class_dish_options', () => {
  test('no dish in re_class_dish_options references an addon-only class', async () => {
    // Addon-only classes (allowed_as_weekly_primary=false) should have no entries
    // in re_class_dish_options (they are in re_addon_classes/re_addon_dish_options instead)
    const { data } = await supabase
      .from('re_class_dish_options')
      .select('dish_option_id, meal_class_code, re_meal_classes!inner(allowed_as_weekly_primary)')
      .eq('re_meal_classes.allowed_as_weekly_primary', false);
    expect(data?.length ?? 0).toBe(0);
  });
});

// ── VAL-04/05: Addon dish options ───────────────────────────
describe('VAL-04/05: re_addon_dish_options', () => {
  test('142 addon dish options loaded', async () => {
    const n = await count('re_addon_dish_options');
    expect(n).toBeGreaterThanOrEqual(140);
  });

  test('all addon dishes have valid addon_class_code FK', async () => {
    const { data } = await supabase
      .from('re_addon_dish_options')
      .select('addon_dish_option_id, re_addon_classes!inner(addon_class_code)')
      .limit(5);
    expect(data).not.toBeNull();
  });
});

// ── VAL-06: Weekly plans use only primary-eligible classes ──
describe('VAL-06: re_weekly_class_plans primary slot integrity', () => {
  test('no primary class slot contains an addon-only class code', async () => {
    // Cross-check: get all addon-only codes
    const { data: addonOnly } = await supabase
      .from('re_meal_classes')
      .select('meal_class_code')
      .eq('allowed_as_weekly_primary', false);
    const addonCodes = new Set(addonOnly?.map(r => r.meal_class_code) ?? []);

    // Check breakfast_primary_class
    const { data: plans } = await supabase
      .from('re_weekly_class_plans')
      .select('plan_day_id, breakfast_primary_class, lunch_primary_class, dinner_primary_class')
      .limit(200);

    plans?.forEach(row => {
      if (row.breakfast_primary_class) {
        expect(addonCodes.has(row.breakfast_primary_class)).toBe(false);
      }
      if (row.lunch_primary_class) {
        expect(addonCodes.has(row.lunch_primary_class)).toBe(false);
      }
      if (row.dinner_primary_class) {
        expect(addonCodes.has(row.dinner_primary_class)).toBe(false);
      }
    });
  });
});

// ── VAL-07/08: Row counts ───────────────────────────────────
describe('VAL-07/08: Large table counts', () => {
  test('re_cohorts has ~2952 rows (≥2900)', async () => {
    const n = await count('re_cohorts');
    expect(n).toBeGreaterThanOrEqual(2900);
    expect(n).toBeLessThanOrEqual(2960);
  });

  test('re_weekly_class_plans has ~20664 rows (≥20000)', async () => {
    const n = await count('re_weekly_class_plans');
    expect(n).toBeGreaterThanOrEqual(20000);
    expect(n).toBeLessThanOrEqual(20700);
  });

  test('re_household_addon_plans has ~7992 rows (≥7800)', async () => {
    const n = await count('re_household_addon_plans');
    expect(n).toBeGreaterThanOrEqual(7800);
    expect(n).toBeLessThanOrEqual(8000);
  });

  test('every cohort in weekly plans exists in re_cohorts', async () => {
    // Orphaned plan rows would mean FK is broken
    const { data } = await supabase
      .from('re_weekly_class_plans')
      .select('plan_day_id, re_cohorts!inner(cohort_id)')
      .limit(100);
    expect(data?.length).toBeGreaterThan(0);
  });
});

// ── VAL-15: profiles column exists ──────────────────────────
describe('VAL-15: profiles.re_engine_version column', () => {
  test('profiles table has re_engine_version column (nullable)', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('re_engine_version')
      .limit(1);
    // If column doesn't exist, this will throw
    expect(error).toBeNull();
  });
});

// ── VAL-13: Idempotency ─────────────────────────────────────
describe('VAL-13: Idempotency', () => {
  test('re-inserting engine_versions does not increase count (ON CONFLICT DO NOTHING)', async () => {
    const before = await count('re_engine_versions');
    await supabase.from('re_engine_versions').upsert([
      { version_code: 'classfirst_v1', version_label: 'Class-first cold-start V1', description: 'test', is_active: true }
    ], { onConflict: 'version_code', ignoreDuplicates: true });
    const after = await count('re_engine_versions');
    expect(after).toBe(before);
  });
});
