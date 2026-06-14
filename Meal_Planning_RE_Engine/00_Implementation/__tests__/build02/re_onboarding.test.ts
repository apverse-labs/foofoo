/**
 * BUILD-02 RE Onboarding Validation Tests
 *
 * Validates that all reference tables used by the RE onboarding screens
 * exist on foofoo-staging, contain the expected row counts, and have the
 * required columns populated.
 *
 * Run: SUPABASE_STAGING_ANON_KEY=<key> npx jest --testPathPattern=re_onboarding
 *
 * All checks run against foofoo-staging only — never production.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STAGING_URL = process.env.SUPABASE_STAGING_URL || 'https://kwypxyqxojauhiehuirz.supabase.co';
const STAGING_KEY = process.env.SUPABASE_STAGING_ANON_KEY || '';

let db: SupabaseClient;

beforeAll(() => {
  if (!STAGING_KEY) throw new Error('SUPABASE_STAGING_ANON_KEY env var required');
  db = createClient(STAGING_URL, STAGING_KEY);
});

async function count(table: string): Promise<number> {
  const { count: n, error } = await db.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count(${table}) failed: ${error.message}`);
  return n ?? 0;
}

// ── VAL-02-01: re_states ────────────────────────────────────────────────────
describe('VAL-02-01: re_states', () => {
  test('has exactly 36 rows', async () => {
    expect(await count('re_states')).toBe(36);
  });

  test('all rows have non-empty state_ut', async () => {
    const { data, error } = await db
      .from('re_states')
      .select('state_id, state_ut')
      .or('state_ut.is.null,state_ut.eq.');
    if (error) throw error;
    expect(data).toHaveLength(0);
  });

  test('state_ut values are ordered and unique (no duplicates)', async () => {
    const { data, error } = await db
      .from('re_states')
      .select('state_ut')
      .order('state_ut', { ascending: true });
    if (error) throw error;
    const names = (data ?? []).map((r) => r.state_ut as string);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

// ── VAL-02-02: re_main_cohorts ──────────────────────────────────────────────
describe('VAL-02-02: re_main_cohorts', () => {
  test('has exactly 5 rows (MC1–MC5)', async () => {
    expect(await count('re_main_cohorts')).toBe(5);
  });

  test('all rows have main_cohort_label and user_understands_as', async () => {
    const { data, error } = await db
      .from('re_main_cohorts')
      .select('main_cohort_id, main_cohort_label, user_understands_as, subcohort_screen_copy');
    if (error) throw error;
    for (const row of data ?? []) {
      expect(row.main_cohort_label).toBeTruthy();
      expect(row.user_understands_as).toBeTruthy();
      expect(row.subcohort_screen_copy).toBeTruthy();
    }
  });
});

// ── VAL-02-03: re_subcohorts ────────────────────────────────────────────────
describe('VAL-02-03: re_subcohorts', () => {
  test('has exactly 41 rows', async () => {
    expect(await count('re_subcohorts')).toBe(41);
  });

  test('all rows have show_as_chip_text and maps_to_persona_id', async () => {
    const { data, error } = await db
      .from('re_subcohorts')
      .select('sub_cohort_id, show_as_chip_text, maps_to_persona_id');
    if (error) throw error;
    for (const row of data ?? []) {
      expect(row.show_as_chip_text).toBeTruthy();
      expect(row.maps_to_persona_id).toBeTruthy();
    }
  });

  const EXPECTED_CHIP_COUNTS: Record<string, number> = {
    MC1: 6, MC2: 7, MC3: 6, MC4: 6, MC5: 16,
  };

  test.each(Object.entries(EXPECTED_CHIP_COUNTS))(
    '%s has %d sub-cohort chips',
    async (mcId, expected) => {
      const { data, error } = await db
        .from('re_subcohorts')
        .select('sub_cohort_id')
        .eq('main_cohort_id', mcId);
      if (error) throw error;
      expect(data).toHaveLength(expected);
    }
  );

  test('maps_to_persona_id FK references re_personas', async () => {
    const { data: subcohorts, error: scErr } = await db
      .from('re_subcohorts')
      .select('maps_to_persona_id');
    if (scErr) throw scErr;

    const { data: personas, error: pErr } = await db
      .from('re_personas')
      .select('persona_id');
    if (pErr) throw pErr;

    const personaSet = new Set((personas ?? []).map((p) => p.persona_id as string));
    for (const sc of subcohorts ?? []) {
      expect(personaSet.has(sc.maps_to_persona_id as string)).toBe(true);
    }
  });
});

// ── VAL-02-04: re_user_household_profiles ──────────────────────────────────
describe('VAL-02-04: re_user_household_profiles', () => {
  test('table exists and is queryable', async () => {
    const { error } = await db
      .from('re_user_household_profiles')
      .select('*', { count: 'exact', head: true });
    expect(error).toBeNull();
  });
});

// ── VAL-02-05: household_members ───────────────────────────────────────────
describe('VAL-02-05: household_members', () => {
  test('table exists and is queryable', async () => {
    const { error } = await db
      .from('household_members')
      .select('*', { count: 'exact', head: true });
    expect(error).toBeNull();
  });
});

// ── VAL-02-06: requiresMemberStep logic (unit test) ────────────────────────
describe('VAL-02-06: requiresMemberStep helper', () => {
  // Import directly — no Supabase needed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requiresMemberStep } = require('../../../../foofoo/src/repositories/re-onboarding.repository');

  test('MC2 sub-cohorts SC2D/E/F require member step', () => {
    expect(requiresMemberStep('SC2D')).toBe(true);
    expect(requiresMemberStep('SC2E')).toBe(true);
    expect(requiresMemberStep('SC2F')).toBe(true);
  });

  test('MC3 sub-cohorts SC3A-D require member step', () => {
    ['SC3A', 'SC3B', 'SC3C', 'SC3D'].forEach((id) => {
      expect(requiresMemberStep(id)).toBe(true);
    });
  });

  test('MC4 sub-cohorts SC4A-F require member step', () => {
    ['SC4A', 'SC4B', 'SC4C', 'SC4D', 'SC4E', 'SC4F'].forEach((id) => {
      expect(requiresMemberStep(id)).toBe(true);
    });
  });

  test('MC1 sub-cohorts do NOT require member step', () => {
    ['SC1A', 'SC1B', 'SC1C', 'SC1D', 'SC1E', 'SC1F'].forEach((id) => {
      expect(requiresMemberStep(id)).toBe(false);
    });
  });

  test('MC5 sub-cohorts do NOT require member step', () => {
    ['SC5A', 'SC5B', 'SC5C', 'SC5P'].forEach((id) => {
      expect(requiresMemberStep(id)).toBe(false);
    });
  });
});
