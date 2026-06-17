/**
 * golden-households.test.ts — V3_EXCEL_FULL_PARITY golden profiles (pure-logic chain).
 *
 * Composes the exported pure assignment helpers into end-to-end household scenarios
 * (DOC-25 Synthetic_Test_Cases spirit). DB-backed cohort_id verification is the
 * integration suite's job; here we lock the deterministic assignment logic.
 */
import {
  resolveCityDestinationGroup,
  resolveCityTierCode,
  buildOverlayPersonaIds,
} from '../../foofoo/src/repositories/re-cohort-resolver.repository';
import { deriveNonvegMode } from '../../foofoo/src/repositories/re-onboarding.repository';

interface Golden {
  name: string; stateId: string; city: string;
  health: string | null; cook: string | null;
  foodPref: string; nvWeek: number | null;
  expectGroup: string; expectTier: 'T1' | 'T2';
  expectOverlayContains?: string[]; expectOverlayEmpty?: boolean;
  expectNonvegMode: string;
}

const GOLDEN: Golden[] = [
  { name: 'MP-origin veg family in Mumbai (toddler+diabetic elder)', stateId: 'S13', city: 'Mumbai',
    health: 'diabetic_management', cook: null, foodPref: 'veg', nvWeek: 0,
    expectGroup: 'MUMBAI_PUNE', expectTier: 'T1', expectOverlayContains: ['P28', 'P15'], expectNonvegMode: 'veg' },
  { name: 'Bengali non-veg family in Kolkata (home city)', stateId: 'S28', city: 'Kolkata',
    health: null, cook: null, foodPref: 'non-veg', nvWeek: 5,
    expectGroup: 'HOME_STATE_TIER1', expectTier: 'T1', expectOverlayEmpty: true, expectNonvegMode: 'regular_nonveg' },
  { name: 'Jain family in Ahmedabad (home city)', stateId: 'S07', city: 'Ahmedabad',
    health: null, cook: null, foodPref: 'jain', nvWeek: 0,
    expectGroup: 'HOME_STATE_TIER1', expectTier: 'T1', expectOverlayEmpty: true, expectNonvegMode: 'jain' },
  { name: 'Single fitness user from Rajasthan in Gurgaon', stateId: 'S21', city: 'Gurgaon',
    health: 'weight_loss', cook: 'self_cook', foodPref: 'egg', nvWeek: 0,
    expectGroup: 'DELHI_NCR', expectTier: 'T1', expectOverlayContains: ['P28', 'P17'], expectNonvegMode: 'egg_only' },
  { name: 'Working couple from Bihar with infant in Pune', stateId: 'S04', city: 'Mumbai',
    health: null, cook: 'maid_simple', foodPref: 'veg', nvWeek: 0,
    expectGroup: 'MUMBAI_PUNE', expectTier: 'T1', expectOverlayContains: ['P28', 'P25'], expectNonvegMode: 'veg' },
  { name: 'MP family in Bengaluru', stateId: 'S13', city: 'Bengaluru',
    health: null, cook: null, foodPref: 'non-veg', nvWeek: 2,
    expectGroup: 'BENGALURU_HYD_CHENNAI', expectTier: 'T1', expectOverlayContains: ['P28'], expectNonvegMode: 'occasional_nonveg' },
  { name: 'Karnataka family in Bengaluru (home city)', stateId: 'S11', city: 'Bengaluru',
    health: null, cook: null, foodPref: 'veg', nvWeek: 0,
    expectGroup: 'HOME_STATE_TIER1', expectTier: 'T1', expectOverlayEmpty: true, expectNonvegMode: 'veg' },
  { name: 'Cold-start: unknown city → PG/hostel fallback', stateId: 'S04', city: 'Some Unknown Village',
    health: null, cook: null, foodPref: 'veg', nvWeek: null,
    expectGroup: 'PAN_INDIA_PG_HOSTEL', expectTier: 'T2', expectOverlayContains: ['P28'], expectNonvegMode: 'veg' },
];

describe('Golden households — deterministic assignment chain', () => {
  test.each(GOLDEN)('%s', (g) => {
    const group = resolveCityDestinationGroup(g.stateId, g.city);
    expect(group).toBe(g.expectGroup);

    const tier = resolveCityTierCode(group);
    expect(tier).toBe(g.expectTier);

    const overlays = buildOverlayPersonaIds(group, g.health, g.cook);
    if (g.expectOverlayEmpty) expect(overlays).toHaveLength(0);
    for (const id of g.expectOverlayContains ?? []) expect(overlays).toContain(id);
    expect(new Set(overlays).size).toBe(overlays.length); // no dup overlays

    expect(deriveNonvegMode(g.foodPref as any, g.nvWeek)).toBe(g.expectNonvegMode);
  });

  it('home-state residents never get the migration overlay (P28)', () => {
    for (const g of GOLDEN.filter((x) => x.expectGroup.startsWith('HOME_STATE'))) {
      const overlays = buildOverlayPersonaIds(resolveCityDestinationGroup(g.stateId, g.city), g.health, g.cook);
      expect(overlays).not.toContain('P28');
    }
  });
});
