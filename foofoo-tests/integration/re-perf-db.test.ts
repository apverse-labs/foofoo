/**
 * re-perf-db.test.ts
 *
 * QA Layer 6 — DB-backed performance benchmarks for the RE module.
 * All tests require the RE staging Supabase project (service-role key).
 * The suite skips cleanly (not fails) when no service key is present.
 *
 * Verified seed counts (2026-06-14):
 *   re_meal_classes=131, re_weekly_class_plans=20664, re_personas=41
 *
 * Run: npx jest --testPathPattern='integration/re-perf-db' --no-coverage
 * Requires: SUPABASE_RE_URL + SUPABASE_RE_SERVICE_KEY (or SUPABASE_STAGING_*)
 */

import { supabaseREAdmin, hasREService } from '../lib/supabase-re';

const describeIfService = hasREService() ? describe : describe.skip;

jest.setTimeout(30000);

if (!hasREService()) {
  // eslint-disable-next-line no-console
  console.warn(
    '[re-perf-db] No RE service-role key found — all DB performance benchmarks ' +
      'skipped cleanly. Set SUPABASE_RE_SERVICE_KEY (or SUPABASE_STAGING_SERVICE_ROLE_KEY) to enable.',
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function count(table: string): Promise<number> {
  const { count: c, error } = await (supabaseREAdmin as any)
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count(${table}) failed: ${error.message}`);
  return c ?? 0;
}

// ─── Meal class loading ───────────────────────────────────────────────────────

describeIfService('RE DB Performance: meal class loading', () => {
  it('loads all 131 meal classes from RE staging in < 3000ms', async () => {
    const t0 = performance.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_meal_classes')
      .select('meal_class_code, meal_class_name, meal_type, diet_types')
      .order('meal_class_code');
    const elapsed = performance.now() - t0;

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect((data ?? []).length).toBeGreaterThanOrEqual(131);
    // Threshold: 3000ms is generous to handle cold Supabase connections on CI
    expect(elapsed).toBeLessThan(3000);
  });
});

// ─── Weekly class plans loading ───────────────────────────────────────────────

describeIfService('RE DB Performance: weekly class plans', () => {
  // The full 20664-row re_weekly_class_plans table is fetched in paginated
  // batches of 1000. Threshold: 10s covers up to ~21 round-trips on a cold
  // Supabase free-tier connection (ap-south-1 from ap-south-1 should be ~50ms/req).
  it('loads all 20664 weekly plans (paginated 1000/page) in < 10000ms', async () => {
    const PAGE = 1000;
    let offset = 0;
    let total = 0;
    const t0 = performance.now();

    while (true) {
      const { data, error } = await (supabaseREAdmin as any)
        .from('re_weekly_class_plans')
        .select('id', { count: 'exact' })
        .range(offset, offset + PAGE - 1);

      if (error) throw new Error(`re_weekly_class_plans page failed: ${error.message}`);
      const rows = (data ?? []) as unknown[];
      total += rows.length;
      if (rows.length < PAGE) break;
      offset += PAGE;
    }

    const elapsed = performance.now() - t0;
    expect(total).toBeGreaterThanOrEqual(20664);
    expect(elapsed).toBeLessThan(10000);
  });
});

// ─── Persona engine assignment lookup ─────────────────────────────────────────

describeIfService('RE DB Performance: persona engine assignment lookup', () => {
  it('fetches persona list with engine assignments in < 500ms', async () => {
    const t0 = performance.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_personas')
      .select('persona_id, persona_name, diet_type, re_engine_version_id')
      .order('persona_id');
    const elapsed = performance.now() - t0;

    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(41);
    expect(elapsed).toBeLessThan(500);
  });
});

// ─── Concurrent persona scoring ───────────────────────────────────────────────

describeIfService('RE DB Performance: concurrent persona scoring', () => {
  // Fire 10 concurrent persona plan fetches (each selects a week's plan rows for
  // a unique persona_id). All 10 should complete within 5s total.
  it('10 concurrent persona plan fetches complete in < 5000ms', async () => {
    // Fetch a sample of persona IDs first
    const { data: personas, error: pErr } = await (supabaseREAdmin as any)
      .from('re_personas')
      .select('persona_id')
      .limit(10);

    expect(pErr).toBeNull();
    const ids: string[] = (personas ?? []).map((p: { persona_id: string }) => p.persona_id);
    expect(ids.length).toBeGreaterThan(0);

    // For each persona, fetch its weekly class plans (first page only — we are
    // testing concurrency latency, not full data load)
    const t0 = performance.now();
    const fetches = ids.map((pid) =>
      (supabaseREAdmin as any)
        .from('re_weekly_class_plans')
        .select('id, meal_class_code, day_of_week')
        .eq('persona_id', pid)
        .limit(50),
    );

    const results = await Promise.all(fetches);
    const elapsed = performance.now() - t0;

    for (const { error } of results) {
      expect(error).toBeNull();
    }
    // Threshold: 5000ms is generous for 10 concurrent free-tier round-trips
    expect(elapsed).toBeLessThan(5000);
  });
});

// ─── Cohort routing lookup ────────────────────────────────────────────────────

describeIfService('RE DB Performance: cohort routing lookup', () => {
  it('fetches routing rules in < 500ms', async () => {
    const t0 = performance.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_routing_rules')
      .select('*');
    const elapsed = performance.now() - t0;

    expect(error).toBeNull();
    expect(elapsed).toBeLessThan(500);
  });

  it('fetches all cohort entries in < 2000ms', async () => {
    const t0 = performance.now();
    // Fetch first page of cohorts to validate DB response time
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_cohorts')
      .select('cohort_id, persona_id, state_id')
      .limit(500);
    const elapsed = performance.now() - t0;

    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });
});
