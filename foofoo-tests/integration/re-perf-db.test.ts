/**
 * re-perf-db.test.ts
 *
 * QA Layer 6 — DB-backed performance benchmarks against the RE staging project.
 * Skips cleanly when no service key is present (same gate as other RE integration tests).
 *
 * Run: npx jest --testPathPattern='integration/re-perf-db' --no-coverage
 * Requires: SUPABASE_STAGING_URL + SUPABASE_STAGING_SERVICE_ROLE_KEY
 */

import { supabaseREAdmin, hasREService } from '../lib/supabase-re';

jest.setTimeout(30000);

const describeIfService = hasREService() ? describe : describe.skip;

if (!hasREService()) {
  // eslint-disable-next-line no-console
  console.warn('[re-perf-db] Service key not set — DB performance benchmarks skipped.');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function timeQuery<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t0 = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - t0 };
}

async function countRows(table: string): Promise<number> {
  const { count, error } = await (supabaseREAdmin as any)
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count(${table}): ${error.message}`);
  return count ?? 0;
}

// ─── Benchmarks ───────────────────────────────────────────────────────────────

describeIfService('RE DB Performance: reference table reads', () => {
  it('loads all meal classes (re_meal_classes) in < 3000ms', async () => {
    const { result, ms } = await timeQuery(() =>
      (supabaseREAdmin as any).from('re_meal_classes').select('meal_class_code, diet_types, allowed_as_weekly_primary'),
    );
    expect(result.error).toBeNull();
    expect((result.data ?? []).length).toBeGreaterThanOrEqual(131);
    expect(ms).toBeLessThan(3000);
  });

  it('loads all RE states (re_states) in < 1000ms', async () => {
    const { result, ms } = await timeQuery(() =>
      (supabaseREAdmin as any).from('re_states').select('state_code, state_name'),
    );
    expect(result.error).toBeNull();
    expect((result.data ?? []).length).toBe(36);
    expect(ms).toBeLessThan(1000);
  });
});

describeIfService('RE DB Performance: cohort and plan reads', () => {
  it('persona engine assignment lookup completes in < 1000ms', async () => {
    // Fetch a sample cohort_id to use as a proxy for assignment lookup
    const { result: cohortRes, ms } = await timeQuery(() =>
      (supabaseREAdmin as any)
        .from('re_cohorts')
        .select('cohort_id, state_code')
        .limit(1),
    );
    expect(cohortRes.error).toBeNull();
    expect(ms).toBeLessThan(1000);
  });

  it('fetches first page (1000 rows) of re_weekly_class_plans in < 3000ms', async () => {
    const { result, ms } = await timeQuery(() =>
      (supabaseREAdmin as any)
        .from('re_weekly_class_plans')
        .select('cohort_id, day_name, breakfast_primary_class, lunch_primary_class, dinner_primary_class')
        .range(0, 999),
    );
    expect(result.error).toBeNull();
    expect((result.data ?? []).length).toBe(1000);
    expect(ms).toBeLessThan(3000);
  });

  it('fetches 5 concurrent single-cohort plan reads all complete in < 5000ms', async () => {
    // Fetch a sample cohort_id first
    const { data: cohorts } = await (supabaseREAdmin as any)
      .from('re_cohorts')
      .select('cohort_id')
      .limit(5);
    expect(cohorts).not.toBeNull();

    const t0 = Date.now();
    const fetches = (cohorts ?? []).map((c: { cohort_id: string }) =>
      (supabaseREAdmin as any)
        .from('re_weekly_class_plans')
        .select('day_name, breakfast_primary_class, lunch_primary_class, dinner_primary_class')
        .eq('cohort_id', c.cohort_id),
    );
    const results = await Promise.all(fetches);
    const elapsed = Date.now() - t0;

    for (const r of results) {
      expect(r.error).toBeNull();
    }
    expect(elapsed).toBeLessThan(5000);
  });
});

describeIfService('RE DB Performance: dish options read', () => {
  it('loads all class dish options (re_class_dish_options) in < 5000ms', async () => {
    const total = await countRows('re_class_dish_options');
    expect(total).toBeGreaterThanOrEqual(946);

    // Paginated full load
    const pageSize = 1000;
    let loaded = 0;
    const t0 = Date.now();
    for (let from = 0; from < total; from += pageSize) {
      const { data, error } = await (supabaseREAdmin as any)
        .from('re_class_dish_options')
        .select('meal_class_code, dish_name, diet_type')
        .range(from, from + pageSize - 1);
      expect(error).toBeNull();
      loaded += (data ?? []).length;
    }
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(loaded).toBe(total);
  });
});
