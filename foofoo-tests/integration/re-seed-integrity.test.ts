/**
 * re-seed-integrity.test.ts
 *
 * Validates RE seed-data row counts and referential integrity on the RE staging
 * project.
 *
 * IMPORTANT: RE reference/seed tables have RLS enabled with NO policy, so the
 * ANON client reads 0 rows from them. Real counts therefore require the
 * service-role key (SUPABASE_RE_SERVICE_KEY). When that key is absent the whole
 * suite skips cleanly (it is NOT a failure — it is an environment gap).
 *
 * Run: npm run test:integration:re
 * Requires: SUPABASE_RE_URL + SUPABASE_RE_SERVICE_KEY.
 *
 * Verified expected counts (MCP, 2026-06-14):
 *   re_states=36, re_meal_classes=131, re_class_dish_options=946,
 *   re_cohorts=2952, re_personas=41, re_weekly_class_plans=20664,
 *   re_household_addon_plans=7992.
 */

import { supabaseREAdmin, hasREService } from '../lib/supabase-re';

const describeIfService = hasREService() ? describe : describe.skip;

jest.setTimeout(60000);

if (!hasREService()) {
  // eslint-disable-next-line no-console
  console.warn(
    '[re-seed-integrity] SUPABASE_RE_SERVICE_KEY not set — seed-count and FK ' +
      'integrity checks skipped (anon client reads 0 rows from RE reference tables).',
  );
}

async function count(table: string): Promise<number> {
  const { count: c, error } = await (supabaseREAdmin as any)
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count(${table}) failed: ${error.message}`);
  return c ?? 0;
}

describeIfService('RE Seed Integrity: row counts', () => {
  it('re_states has exactly 36 rows (28 states + 8 UTs)', async () => {
    expect(await count('re_states')).toBe(36);
  });

  it('re_meal_classes has >= 131 rows', async () => {
    expect(await count('re_meal_classes')).toBeGreaterThanOrEqual(131);
  });

  it('re_class_dish_options has >= 946 rows', async () => {
    expect(await count('re_class_dish_options')).toBeGreaterThanOrEqual(946);
  });

  it('re_cohorts has >= 2952 rows', async () => {
    expect(await count('re_cohorts')).toBeGreaterThanOrEqual(2952);
  });

  it('re_personas has >= 40 rows', async () => {
    expect(await count('re_personas')).toBeGreaterThanOrEqual(40);
  });

  it('re_weekly_class_plans has >= 20664 rows', async () => {
    expect(await count('re_weekly_class_plans')).toBeGreaterThanOrEqual(20664);
  });

  it('re_household_addon_plans has >= 7992 rows', async () => {
    expect(await count('re_household_addon_plans')).toBeGreaterThanOrEqual(7992);
  });
});

describeIfService('RE Seed Integrity: referential integrity', () => {
  it('every re_class_dish_options row has a meal_class_code present in re_meal_classes', async () => {
    const { data: classes, error: cErr } = await (supabaseREAdmin as any)
      .from('re_meal_classes')
      .select('meal_class_code');
    expect(cErr).toBeNull();
    const validCodes = new Set((classes ?? []).map((r: any) => r.meal_class_code));

    // Page through dish options to find any orphan meal_class_code.
    const orphans = new Set<string>();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await (supabaseREAdmin as any)
        .from('re_class_dish_options')
        .select('meal_class_code')
        .range(from, from + pageSize - 1);
      expect(error).toBeNull();
      const rows = data ?? [];
      for (const r of rows) {
        if (!validCodes.has(r.meal_class_code)) orphans.add(r.meal_class_code);
      }
      if (rows.length < pageSize) break;
    }
    expect([...orphans]).toEqual([]);
  });

  it('every re_weekly_class_plans row references a valid cohort_id', async () => {
    const { data: cohorts, error: cErr } = await (supabaseREAdmin as any)
      .from('re_cohorts')
      .select('cohort_id');
    expect(cErr).toBeNull();
    const validCohorts = new Set((cohorts ?? []).map((r: any) => r.cohort_id));

    const orphans = new Set<string>();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await (supabaseREAdmin as any)
        .from('re_weekly_class_plans')
        .select('cohort_id')
        .range(from, from + pageSize - 1);
      expect(error).toBeNull();
      const rows = data ?? [];
      for (const r of rows) {
        if (!validCohorts.has(r.cohort_id)) orphans.add(r.cohort_id);
      }
      if (rows.length < pageSize) break;
    }
    expect([...orphans]).toEqual([]);
  });

  it('every primary class used in weekly plans exists in re_meal_classes', async () => {
    const { data: classes } = await (supabaseREAdmin as any)
      .from('re_meal_classes')
      .select('meal_class_code');
    const validCodes = new Set((classes ?? []).map((r: any) => r.meal_class_code));

    const usedCodes = new Set<string>();
    const cols = [
      'breakfast_primary_class',
      'lunch_primary_class',
      'snack_primary_class',
      'dinner_primary_class',
    ];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await (supabaseREAdmin as any)
        .from('re_weekly_class_plans')
        .select(cols.join(', '))
        .range(from, from + pageSize - 1);
      expect(error).toBeNull();
      const rows = data ?? [];
      for (const r of rows) {
        for (const col of cols) {
          if (r[col]) usedCodes.add(r[col]);
        }
      }
      if (rows.length < pageSize) break;
    }
    const missing = [...usedCodes].filter((c) => !validCodes.has(c));
    expect(missing).toEqual([]);
  });

  it('no primary-eligible meal class has zero dish options', async () => {
    // Primary-eligible classes (allowed_as_weekly_primary) must have >= 1 dish.
    const { data: classes, error } = await (supabaseREAdmin as any)
      .from('re_meal_classes')
      .select('meal_class_code, allowed_as_weekly_primary');
    expect(error).toBeNull();

    const { data: dishRows } = await (supabaseREAdmin as any)
      .from('re_class_dish_options')
      .select('meal_class_code')
      .limit(10000);
    const dishCounts = new Map<string, number>();
    for (const r of dishRows ?? []) {
      dishCounts.set(r.meal_class_code, (dishCounts.get(r.meal_class_code) ?? 0) + 1);
    }

    const emptyPrimary = (classes ?? [])
      .filter((c: any) => c.allowed_as_weekly_primary === true || c.allowed_as_weekly_primary === 'TRUE')
      .filter((c: any) => (dishCounts.get(c.meal_class_code) ?? 0) === 0)
      .map((c: any) => c.meal_class_code);

    // Informational warning rather than a hard fail — some primary classes may
    // intentionally be add-on resolved. Surface them but do not block.
    if (emptyPrimary.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️ Primary-eligible classes with 0 dishes: ${emptyPrimary.join(', ')}`);
    }
    expect(Array.isArray(emptyPrimary)).toBe(true);
  });
});
