/**
 * BUILD-03 Cohort / Persona Assignment Engine Tests
 *
 * Unit tests cover:
 *   VAL-03-01  resolveCityDestinationGroup — home state T1 / T2 / cross-state / fallback
 *   VAL-03-02  resolveCityTierCode — destination group → T1 / T2
 *   VAL-03-03  buildOverlayPersonaIds — migration / health / cook overlays
 *
 * Integration tests (require SUPABASE_STAGING_ANON_KEY env var) cover:
 *   VAL-03-04  re_cohorts row count and cohort_id format
 *   VAL-03-05  re_city_migration_overlays row count
 *   VAL-03-06  overlay persona IDs resolve to real rows in re_personas
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  resolveCityDestinationGroup,
  resolveCityTierCode,
  buildOverlayPersonaIds,
} from '../../../../foofoo/src/repositories/re-cohort-resolver.repository';

// ── VAL-03-01: resolveCityDestinationGroup ──────────────────────────────────
describe('VAL-03-01: resolveCityDestinationGroup', () => {
  test('Maharashtra native in Mumbai → HOME_STATE_TIER1', () => {
    expect(resolveCityDestinationGroup('S14', 'Mumbai')).toBe('HOME_STATE_TIER1');
  });

  test('Maharashtra native in Pune → HOME_STATE_TIER1', () => {
    expect(resolveCityDestinationGroup('S14', 'Pune')).toBe('HOME_STATE_TIER1');
  });

  test('Maharashtra native in Nagpur → HOME_STATE_TIER2', () => {
    expect(resolveCityDestinationGroup('S14', 'Nagpur')).toBe('HOME_STATE_TIER2');
  });

  test('Bihar native in Mumbai → MUMBAI_PUNE', () => {
    expect(resolveCityDestinationGroup('S04', 'Mumbai')).toBe('MUMBAI_PUNE');
  });

  test('UP native in Noida → HOME_STATE_TIER1 (Noida is in UP T1)', () => {
    expect(resolveCityDestinationGroup('S26', 'Noida')).toBe('HOME_STATE_TIER1');
  });

  test('Bihar native in Noida → DELHI_NCR', () => {
    expect(resolveCityDestinationGroup('S04', 'Noida')).toBe('DELHI_NCR');
  });

  test('Karnataka native in Bengaluru → HOME_STATE_TIER1', () => {
    expect(resolveCityDestinationGroup('S11', 'Bengaluru')).toBe('HOME_STATE_TIER1');
  });

  test('MP native in Bengaluru → BENGALURU_HYD_CHENNAI', () => {
    expect(resolveCityDestinationGroup('S13', 'Bengaluru')).toBe('BENGALURU_HYD_CHENNAI');
  });

  test('Gujarat native in Ahmedabad → HOME_STATE_TIER1', () => {
    expect(resolveCityDestinationGroup('S07', 'Ahmedabad')).toBe('HOME_STATE_TIER1');
  });

  test('MP native in Ahmedabad → AHMEDABAD_SURAT', () => {
    expect(resolveCityDestinationGroup('S13', 'Ahmedabad')).toBe('AHMEDABAD_SURAT');
  });

  test('Odisha native in Kolkata → KOLKATA_EAST (not Odisha home state city)', () => {
    // Kolkata is not in Odisha's T1/T2 → falls through to cross-state → KOLKATA_EAST
    expect(resolveCityDestinationGroup('S19', 'Kolkata')).toBe('KOLKATA_EAST');
  });

  test('West Bengal native in Kolkata → HOME_STATE_TIER1', () => {
    expect(resolveCityDestinationGroup('S28', 'Kolkata')).toBe('HOME_STATE_TIER1');
  });

  test('case-insensitive: lowercase input works', () => {
    expect(resolveCityDestinationGroup('S04', 'mumbai')).toBe('MUMBAI_PUNE');
  });

  test('unknown city → PAN_INDIA_PG_HOSTEL', () => {
    expect(resolveCityDestinationGroup('S04', 'Some Unknown Village')).toBe('PAN_INDIA_PG_HOSTEL');
  });

  test('Goa native in Panaji → HOME_STATE_TIER1', () => {
    expect(resolveCityDestinationGroup('S06', 'Panaji')).toBe('HOME_STATE_TIER1');
  });

  test('Haryana native in Gurgaon → HOME_STATE_TIER1', () => {
    expect(resolveCityDestinationGroup('S08', 'Gurgaon')).toBe('HOME_STATE_TIER1');
  });

  test('Rajasthan native in Gurgaon → DELHI_NCR', () => {
    expect(resolveCityDestinationGroup('S21', 'Gurgaon')).toBe('DELHI_NCR');
  });
});

// ── VAL-03-02: resolveCityTierCode ──────────────────────────────────────────
describe('VAL-03-02: resolveCityTierCode', () => {
  const T1Groups = ['HOME_STATE_TIER1', 'MUMBAI_PUNE', 'DELHI_NCR', 'BENGALURU_HYD_CHENNAI', 'AHMEDABAD_SURAT', 'KOLKATA_EAST'];
  const T2Groups = ['HOME_STATE_TIER2', 'GOA_COASTAL', 'PAN_INDIA_PG_HOSTEL'];

  test.each(T1Groups)('%s resolves to T1', (group) => {
    expect(resolveCityTierCode(group)).toBe('T1');
  });

  test.each(T2Groups)('%s resolves to T2', (group) => {
    expect(resolveCityTierCode(group)).toBe('T2');
  });

  test('unknown group defaults to T2', () => {
    expect(resolveCityTierCode('UNKNOWN_GROUP')).toBe('T2');
  });
});

// ── VAL-03-03: buildOverlayPersonaIds ──────────────────────────────────────
describe('VAL-03-03: buildOverlayPersonaIds', () => {
  test('home state + no health/cook → empty array', () => {
    expect(buildOverlayPersonaIds('HOME_STATE_TIER1', null, null)).toEqual([]);
  });

  test('cross-state migration → [P28]', () => {
    const ids = buildOverlayPersonaIds('MUMBAI_PUNE', null, null);
    expect(ids).toContain('P28');
  });

  test('weight_loss overlay → P17', () => {
    const ids = buildOverlayPersonaIds('HOME_STATE_TIER1', 'weight_loss', null);
    expect(ids).toContain('P17');
    expect(ids).not.toContain('P28'); // home state, no migration overlay
  });

  test('diabetic_management overlay → P15', () => {
    const ids = buildOverlayPersonaIds('HOME_STATE_TIER2', 'diabetic_management', null);
    expect(ids).toContain('P15');
  });

  test('skilled_cook overlay → P22', () => {
    const ids = buildOverlayPersonaIds('HOME_STATE_TIER1', null, 'skilled_cook');
    expect(ids).toContain('P22');
  });

  test('migrant + health + cook → all three overlays', () => {
    const ids = buildOverlayPersonaIds('DELHI_NCR', 'hypertension_heart', 'maid_simple');
    expect(ids).toContain('P28'); // migration
    expect(ids).toContain('P16'); // hypertension
    expect(ids).toContain('P25'); // maid
  });

  test('self_cook → no cook overlay persona', () => {
    const ids = buildOverlayPersonaIds('HOME_STATE_TIER1', null, 'self_cook');
    expect(ids).toHaveLength(0);
  });

  test('no duplicates even with identical derived IDs', () => {
    // postpartum and pregnancy both map to P07
    const ids = buildOverlayPersonaIds('MUMBAI_PUNE', 'postpartum_lactation', null);
    const p07Count = ids.filter((id) => id === 'P07').length;
    expect(p07Count).toBe(1);
  });

  test('result array has no duplicates', () => {
    const ids = buildOverlayPersonaIds('DELHI_NCR', 'weight_loss', 'skilled_cook');
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Integration tests (require staging Supabase key) ───────────────────────

const STAGING_URL = process.env.SUPABASE_STAGING_URL || 'https://kwypxyqxojauhiehuirz.supabase.co';
const STAGING_KEY = process.env.SUPABASE_STAGING_ANON_KEY || '';

const describeIntegration = STAGING_KEY ? describe : describe.skip;

let db: SupabaseClient;
beforeAll(() => {
  if (STAGING_KEY) db = createClient(STAGING_URL, STAGING_KEY);
});

// ── VAL-03-04: re_cohorts ───────────────────────────────────────────────────
describeIntegration('VAL-03-04: re_cohorts', () => {
  test('has exactly 2952 rows', async () => {
    const { count, error } = await db.from('re_cohorts').select('*', { count: 'exact', head: true });
    expect(error).toBeNull();
    expect(count).toBe(2952);
  });

  test('cohort_id format is stateId_tierCode_personaId', async () => {
    const { data, error } = await db.from('re_cohorts').select('cohort_id').limit(10);
    expect(error).toBeNull();
    for (const row of data ?? []) {
      expect(row.cohort_id).toMatch(/^S\d{2}_T[12]_P\d{2}$/);
    }
  });

  test('S14_T1_P01 exists (Maharashtra Tier1 Solo student)', async () => {
    const { data, error } = await db
      .from('re_cohorts')
      .select('cohort_id')
      .eq('cohort_id', 'S14_T1_P01')
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });
});

// ── VAL-03-05: re_city_migration_overlays ──────────────────────────────────
describeIntegration('VAL-03-05: re_city_migration_overlays', () => {
  test('has exactly 324 rows (36 states × 9 destination groups)', async () => {
    const { count, error } = await db
      .from('re_city_migration_overlays')
      .select('*', { count: 'exact', head: true });
    expect(error).toBeNull();
    expect(count).toBe(324);
  });

  test('each origin_state_ut has all 9 destination groups', async () => {
    const { data, error } = await db
      .from('re_city_migration_overlays')
      .select('origin_state_ut, destination_group_code');
    expect(error).toBeNull();

    const byState: Record<string, Set<string>> = {};
    for (const row of data ?? []) {
      const st = row.origin_state_ut as string;
      if (!byState[st]) byState[st] = new Set();
      byState[st].add(row.destination_group_code as string);
    }
    for (const [state, groups] of Object.entries(byState)) {
      expect(groups.size).toBe(9);
    }
  });
});

// ── VAL-03-06: overlay persona IDs exist in re_personas ────────────────────
describeIntegration('VAL-03-06: overlay persona IDs in re_personas', () => {
  const OVERLAY_PERSONA_IDS = ['P07', 'P15', 'P16', 'P17', 'P18', 'P19', 'P22', 'P23', 'P25', 'P28', 'P36'];

  test('all overlay persona IDs resolve to re_personas rows', async () => {
    const { data, error } = await db
      .from('re_personas')
      .select('persona_id, can_be_overlay')
      .in('persona_id', OVERLAY_PERSONA_IDS);
    expect(error).toBeNull();
    const found = (data ?? []).map((r: { persona_id: string }) => r.persona_id);
    for (const id of OVERLAY_PERSONA_IDS) {
      expect(found).toContain(id);
    }
  });

  test('P28 is marked can_be_overlay = true', async () => {
    const { data, error } = await db
      .from('re_personas')
      .select('can_be_overlay')
      .eq('persona_id', 'P28')
      .maybeSingle();
    expect(error).toBeNull();
    expect((data as { can_be_overlay: boolean } | null)?.can_be_overlay).toBe(true);
  });
});
