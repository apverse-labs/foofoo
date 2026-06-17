/**
 * re-perf-db.test.ts
 *
 * QA Layer 6 — DB-backed performance benchmarks for the RE module.
 * Tests real latency of Supabase RE staging queries to catch regressions
 * in index coverage, pagination strategy, or data-volume scaling.
 *
 * Gates:
 *   - hasREService() — all tests skip cleanly when no service key is present.
 *     This is NOT a failure; it is an expected environment gap on local dev
 *     machines that do not carry the service-role key.
 *
 * All timings are wall-clock via Date.now().
 * Thresholds are 3–5× the expected fast-path to avoid CI flakiness on shared
 * runners. Goal: catch missing indexes / O(n) table-scans, not micro-optimise.
 *
 * Run: npx jest --testPathPattern='integration/re-perf-db' --no-coverage
 * Requires: SUPABASE_RE_URL + SUPABASE_RE_SERVICE_KEY (or staging equivalents).
 *
 * Verified RE staging counts (MCP, 2026-06-14):
 *   re_meal_classes=131, re_cohorts=2952, re_weekly_class_plans=20664,
 *   re_personas=41, re_household_addon_plans=7992.
 */

import { supabaseREAdmin, hasREService } from '../lib/supabase-re';

const describeIfService = hasREService() ? describe : describe.skip;

jest.setTimeout(30000); // 30s hard cap per test

if (!hasREService()) {
  // eslint-disable-next-line no-console
  console.warn(
    '[re-perf-db] No RE service-role key — all DB performance benchmarks skipped. ' +
      'Set SUPABASE_RE_SERVICE_KEY (or SUPABASE_STAGING_SERVICE_ROLE_KEY) to enable.',
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple row-count helper (service-role bypasses RLS). */
async function count(table: string): Promise<number> {
  const { count: c, error } = await (supabaseREAdmin as any)
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count(${table}) failed: ${error.message}`);
  return c ?? 0;
}

// ─── Meal class load ──────────────────────────────────────────────────────────

describeIfService('RE DB Perf: meal class catalogue load', () => {
  it('loads all re_meal_classes in < 3000ms', async () => {
    const t0 = Date.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_meal_classes')
      .select('meal_class_code, meal_class_name, meal_type, diet_category');
    expect(error).toBeNull();
    expect(Date.now() - t0).toBeLessThan(3000);
    // Confirm data volume matches seeded catalogue (>= 131 classes)
    expect((data ?? []).length).toBeGreaterThanOrEqual(131);
  });

  it('loads re_meal_classes with a diet_category filter in < 1000ms', async () => {
    const t0 = Date.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_meal_classes')
      .select('meal_class_code, meal_class_name')
      .eq('diet_category', 'veg');
    expect(error).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─── Weekly plan load (paginated) ─────────────────────────────────────────────

describeIfService('RE DB Perf: weekly plan load (paginated)', () => {
  /**
   * re_weekly_class_plans has 20664 rows. We measure the time to retrieve
   * the first two pages (page_size = 1000) and extrapolate — full scan is not
   * required; the goal is to confirm index-covered pagination latency.
   * Threshold: 2 x 1000-row pages in < 5000ms (budget: each page < 2.5s).
   */
  it('paginates re_weekly_class_plans (2 pages x 1000 rows) in < 5000ms', async () => {
    const PAGE = 1000;
    const t0 = Date.now();

    const [page1, page2] = await Promise.all([
      (supabaseREAdmin as any)
        .from('re_weekly_class_plans')
        .select('cohort_id, week_number, day_of_week, meal_slot, meal_class_code')
        .range(0, PAGE - 1),
      (supabaseREAdmin as any)
        .from('re_weekly_class_plans')
        .select('cohort_id, week_number, day_of_week, meal_slot, meal_class_code')
        .range(PAGE, PAGE * 2 - 1),
    ]);

    expect(page1.error).toBeNull();
    expect(page2.error).toBeNull();
    expect(Date.now() - t0).toBeLessThan(5000);
    expect((page1.data ?? []).length).toBe(PAGE);
    expect((page2.data ?? []).length).toBe(PAGE);
  });
});

// ─── Persona engine assignment lookup ────────────────────────────────────────

describeIfService('RE DB Perf: persona lookup', () => {
  it('fetches all re_personas in < 500ms', async () => {
    const t0 = Date.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_personas')
      .select('persona_id, persona_name, engine_version, cohort_key');
    expect(error).toBeNull();
    expect(Date.now() - t0).toBeLessThan(500);
    expect(Array.isArray(data)).toBe(true);
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('looks up a single persona by cohort_key in < 300ms', async () => {
    // Fetch any real cohort key first, then time the single-row lookup.
    const { data: sample } = await (supabaseREAdmin as any)
      .from('re_personas')
      .select('cohort_key')
      .limit(1);
    const key = (sample ?? [])[0]?.cohort_key;
    if (!key) return; // no seed data — skip gracefully

    const t0 = Date.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_personas')
      .select('persona_id, persona_name, engine_version')
      .eq('cohort_key', key)
      .limit(1);
    expect(error).toBeNull();
    expect(Date.now() - t0).toBeLessThan(300);
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Concurrent persona scoring fetches ──────────────────────────────────────

describeIfService('RE DB Perf: concurrent persona plan fetches', () => {
  /**
   * Simulates 10 concurrent users each loading their weekly plan slice.
   * Each query fetches 21 rows (3 slots x 7 days) for one cohort.
   * Threshold: all 10 concurrent fetches complete in < 5000ms.
   *
   * Implementation: we sample 10 real cohort_ids and fire them in parallel.
   * Pad to 10 if fewer distinct cohorts exist (e.g. sparse staging data).
   */
  it('10 concurrent cohort plan fetches complete in < 5000ms', async () => {
    const { data: cohorts, error: cohortErr } = await (supabaseREAdmin as any)
      .from('re_cohorts')
      .select('cohort_id')
      .limit(10);
    expect(cohortErr).toBeNull();
    const ids: string[] = ((cohorts ?? []) as Array<{ cohort_id: string }>)
      .map(c => c.cohort_id);
    if (ids.length === 0) return; // no seed data — skip gracefully

    // Pad to exactly 10 (repeat if fewer than 10 cohorts exist).
    const target = 10;
    const padded: string[] = Array.from({ length: target }, (_, i) => ids[i % ids.length]);

    const t0 = Date.now();
    const results = await Promise.all(
      padded.map(cohortId =>
        (supabaseREAdmin as any)
          .from('re_weekly_class_plans')
          .select('day_of_week, meal_slot, meal_class_code')
          .eq('cohort_id', cohortId)
          .eq('week_number', 1),
      ),
    );
    const elapsed = Date.now() - t0;

    for (const r of results) {
      expect(r.error).toBeNull();
    }
    // Threshold: 3x the expected fast-path on a shared CI runner.
    expect(elapsed).toBeLessThan(5000);
  });
});

// ─── Household addon resolution ───────────────────────────────────────────────

describeIfService('RE DB Perf: household addon plan load', () => {
  it('loads re_household_addon_plans for a cohort in < 2000ms', async () => {
    // Sample a real cohort_id that has addon plans.
    const { data: sample } = await (supabaseREAdmin as any)
      .from('re_household_addon_plans')
      .select('cohort_id')
      .limit(1);
    const cohortId = (sample ?? [])[0]?.cohort_id;
    if (!cohortId) return; // no seed data — skip gracefully

    const t0 = Date.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_household_addon_plans')
      .select('addon_type, meal_slot, addon_class_code, member_count_min, member_count_max')
      .eq('cohort_id', cohortId);
    expect(error).toBeNull();
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─── Reference data breadth check ─────────────────────────────────────────────

describeIfService('RE DB Perf: reference data breadth', () => {
  it('counts re_states (>= 28 expected) in < 500ms', async () => {
    const t0 = Date.now();
    const n = await count('re_states');
    expect(Date.now() - t0).toBeLessThan(500);
    expect(n).toBeGreaterThanOrEqual(28); // at least 28 states
  });

  it('counts re_class_dish_options (>= 946 expected) in < 1000ms', async () => {
    const t0 = Date.now();
    const n = await count('re_class_dish_options');
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(n).toBeGreaterThanOrEqual(946);
  });

  it('counts re_cohorts (>= 2952 expected) in < 1000ms', async () => {
    const t0 = Date.now();
    const n = await count('re_cohorts');
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(n).toBeGreaterThanOrEqual(2952);
  });

  it('counts re_weekly_class_plans (>= 20664 expected) in < 2000ms', async () => {
    const t0 = Date.now();
    const n = await count('re_weekly_class_plans');
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(n).toBeGreaterThanOrEqual(20664);
  });
});
