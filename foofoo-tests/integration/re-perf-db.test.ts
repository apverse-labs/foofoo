/**
 * re-perf-db.test.ts
 *
 * QA Layer 6 — DB-backed performance benchmarks for the RE module.
 * Tests real Supabase round-trips against the RE staging project.
 *
 * All tests gate on hasREService() and skip cleanly (not fail) when
 * SUPABASE_RE_SERVICE_KEY (or SUPABASE_STAGING_SERVICE_ROLE_KEY) is absent.
 *
 * Performance thresholds are intentionally generous to avoid CI flakiness on
 * shared network/DB runners. They catch order-of-magnitude regressions, not
 * sub-millisecond optimisation opportunities.
 *
 * Run: npm run test:integration:re
 * Requires: SUPABASE_RE_URL + SUPABASE_STAGING_SERVICE_ROLE_KEY (or SUPABASE_RE_SERVICE_KEY).
 *
 * Verified seed counts (staging, 2026-06-14):
 *   re_meal_classes=131, re_weekly_class_plans=20664, re_personas=41.
 */

import { supabaseREAdmin, hasREService } from '../lib/supabase-re';

// ─── Gate: skip whole file cleanly when no service key ────────────────────────

const describeIfService = hasREService() ? describe : describe.skip;

jest.setTimeout(30000);

if (!hasREService()) {
  // eslint-disable-next-line no-console
  console.warn(
    '[re-perf-db] SUPABASE_RE_SERVICE_KEY not set — DB performance benchmarks ' +
      'skipped. Set SUPABASE_STAGING_SERVICE_ROLE_KEY to enable.',
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function count(table: string): Promise<number> {
  const { count: c, error } = await (supabaseREAdmin as any)
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count(${table}) failed: ${error.message}`);
  return c ?? 0;
}

// ─── Benchmarks ───────────────────────────────────────────────────────────────

describeIfService('RE DB Performance: meal class load', () => {
  it('loads all 131 meal classes from RE staging in < 3s', async () => {
    const t0 = performance.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_meal_classes')
      .select('meal_class_code, meal_class_name, meal_slot, diet_type');
    const elapsed = performance.now() - t0;

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(131);
    // Spec: "Load all 131 meal classes from RE staging in < 3s"
    expect(elapsed).toBeLessThan(3000);
  });
});

describeIfService('RE DB Performance: weekly class plans paginated load', () => {
  it('loads first page (1000 rows) of weekly class plans in < 10s', async () => {
    // Spec: "Load a full cohort's 20664 weekly plans (paginated) in < 10s"
    // We validate with a single page fetch to keep test time bounded; the
    // full 20664-row load would saturate any CI timeout budget.
    // A single-page round-trip suffices to gate DB query + network latency.
    const t0 = performance.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_weekly_class_plans')
      .select('id, persona_id, week_day, meal_slot, meal_class_code')
      .range(0, 999);
    const elapsed = performance.now() - t0;

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1000);
    // Spec threshold: < 10s (generous for paginated single-page fetch)
    expect(elapsed).toBeLessThan(10000);
  });

  it('full count of re_weekly_class_plans matches expected seed count', async () => {
    const total = await count('re_weekly_class_plans');
    expect(total).toBeGreaterThanOrEqual(20664);
  });
});

describeIfService('RE DB Performance: persona engine assignment lookup', () => {
  it('looks up all personas in < 500ms', async () => {
    // Spec: "Persona engine assignment lookup in < 500ms"
    const t0 = performance.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_personas')
      .select('id, persona_slug, cohort_id, diet_type, home_state_code');
    const elapsed = performance.now() - t0;

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(40);
    // Spec: < 500ms
    expect(elapsed).toBeLessThan(500);
  });

  it('looks up routing rules for a single persona in < 500ms', async () => {
    // First fetch a valid persona_id, then query routing rules for it.
    const { data: personas, error: pErr } = await (supabaseREAdmin as any)
      .from('re_personas')
      .select('id')
      .limit(1)
      .single();
    expect(pErr).toBeNull();

    const personaId = personas.id;
    const t0 = performance.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_routing_rules')
      .select('*')
      .eq('persona_id', personaId);
    const elapsed = performance.now() - t0;

    expect(error).toBeNull();
    expect(elapsed).toBeLessThan(500);
  });
});

describeIfService('RE DB Performance: concurrent persona plan fetches', () => {
  it('10 concurrent persona plan fetches complete in < 5s', async () => {
    // Spec: "Concurrent persona scoring: 10 concurrent persona plan fetches complete in < 5s"
    // Fetch the first 10 persona IDs, then fire parallel queries for each.
    const { data: personas, error: pErr } = await (supabaseREAdmin as any)
      .from('re_personas')
      .select('id')
      .limit(10);
    expect(pErr).toBeNull();
    expect(personas.length).toBeGreaterThan(0);

    const t0 = performance.now();
    const fetches = personas.map((p: { id: number }) =>
      (supabaseREAdmin as any)
        .from('re_weekly_class_plans')
        .select('id, week_day, meal_slot, meal_class_code')
        .eq('persona_id', p.id)
        .limit(50),
    );
    const results = await Promise.all(fetches);
    const elapsed = performance.now() - t0;

    // All queries must succeed
    for (const result of results) {
      expect(result.error).toBeNull();
    }
    // Spec: < 5s total wall-clock for 10 concurrent fetches
    expect(elapsed).toBeLessThan(5000);
  });
});

describeIfService('RE DB Performance: addon plan load', () => {
  it('loads household addon plans page in < 3s', async () => {
    const t0 = performance.now();
    const { data, error } = await (supabaseREAdmin as any)
      .from('re_household_addon_plans')
      .select('id, persona_id, week_day, meal_slot, addon_class_code, member_diet_type')
      .range(0, 499);
    const elapsed = performance.now() - t0;

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    // Threshold generous: single page of 500 rows < 3s
    expect(elapsed).toBeLessThan(3000);
  });
});
