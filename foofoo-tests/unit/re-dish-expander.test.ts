import {
  parseStateIdFromCohort,
  regionAffinityScore,
  isDietCompatible,
  computeDishScore,
} from '../../foofoo/src/repositories/re-dish-expander.repository';

// ── parseStateIdFromCohort ────────────────────────────────────────────────────

describe('parseStateIdFromCohort', () => {
  it('extracts state_id from standard cohort_id format', () => {
    expect(parseStateIdFromCohort('S14_T1_P01')).toBe('S14');
    expect(parseStateIdFromCohort('S01_T2_P15')).toBe('S01');
    expect(parseStateIdFromCohort('S32_T1_P03')).toBe('S32');
  });

  it('returns the whole string if no underscore separator', () => {
    expect(parseStateIdFromCohort('S14')).toBe('S14');
  });

  it('returns empty string for empty input', () => {
    expect(parseStateIdFromCohort('')).toBe('');
  });
});

// ── isDietCompatible ──────────────────────────────────────────────────────────

describe('isDietCompatible', () => {
  describe('veg user', () => {
    it('allows veg dishes', () => expect(isDietCompatible('veg', 'veg')).toBe(true));
    it('blocks nonveg dishes', () => expect(isDietCompatible('nonveg', 'veg')).toBe(false));
    it('blocks egg dishes', () => expect(isDietCompatible('egg', 'veg')).toBe(false));
    it('blocks mixed dishes', () => expect(isDietCompatible('mixed', 'veg')).toBe(false));
  });

  describe('vegan user', () => {
    it('allows veg dishes only', () => expect(isDietCompatible('veg', 'vegan')).toBe(true));
    it('blocks nonveg', () => expect(isDietCompatible('nonveg', 'vegan')).toBe(false));
  });

  describe('jain user', () => {
    it('allows veg dishes only', () => expect(isDietCompatible('veg', 'jain')).toBe(true));
    it('blocks nonveg', () => expect(isDietCompatible('nonveg', 'jain')).toBe(false));
  });

  describe('egg user', () => {
    it('allows veg', () => expect(isDietCompatible('veg', 'egg')).toBe(true));
    it('allows egg dishes', () => expect(isDietCompatible('egg', 'egg')).toBe(true));
    it('allows mixed', () => expect(isDietCompatible('mixed', 'egg')).toBe(true));
    it('blocks nonveg', () => expect(isDietCompatible('nonveg', 'egg')).toBe(false));
  });

  describe('non_veg user', () => {
    it('allows all diet types', () => {
      expect(isDietCompatible('veg', 'non_veg')).toBe(true);
      expect(isDietCompatible('nonveg', 'non_veg')).toBe(true);
      expect(isDietCompatible('egg', 'non_veg')).toBe(true);
      expect(isDietCompatible('mixed', 'non_veg')).toBe(true);
    });
  });

  it('normalises hyphenated food_pref (non-veg → non_veg)', () => {
    expect(isDietCompatible('nonveg', 'non-veg')).toBe(true);
  });
});

// ── regionAffinityScore ───────────────────────────────────────────────────────

describe('regionAffinityScore', () => {
  it('returns 0.20 for a strong region match', () => {
    expect(regionAffinityScore('South, Urban India', 'SOUTH_RICE')).toBe(0.20);
    expect(regionAffinityScore('North, Central, West', 'NORTH_WHEAT')).toBe(0.20);
    expect(regionAffinityScore('Bihar, Jharkhand, East UP', 'EAST')).toBe(0.20);
    expect(regionAffinityScore('Gujarat', 'WEST_VEG')).toBe(0.20);
  });

  it('returns 0.05 for pan-India / Urban India dishes', () => {
    expect(regionAffinityScore('All regions', 'SOUTH_RICE')).toBe(0.05);
    expect(regionAffinityScore('Pan India weekend', 'NORTH_WHEAT')).toBe(0.05);
    expect(regionAffinityScore('Urban India', 'EAST')).toBe(0.05);
    expect(regionAffinityScore('Tier 1, students, working', 'WEST_VEG')).toBe(0.05);
  });

  it('returns 0 for a non-matching region', () => {
    expect(regionAffinityScore('Kerala', 'NORTH_WHEAT')).toBe(0);
    expect(regionAffinityScore('Punjab, Haryana, Delhi', 'SOUTH_RICE')).toBe(0);
  });

  it('region-specific match takes priority over pan-India keywords', () => {
    // "South, Urban India" has both a region keyword (south) and a pan-India keyword (urban india)
    // Region-specific should win → 0.20
    expect(regionAffinityScore('South, Urban India', 'SOUTH_RICE')).toBe(0.20);
    // Pure pan-India with no region keyword → 0.05
    expect(regionAffinityScore('All regions', 'SOUTH_RICE')).toBe(0.05);
  });
});

// ── computeDishScore ──────────────────────────────────────────────────────────

describe('computeDishScore', () => {
  it('returns breakdown with total = base 1.0 + region boost + deterministic seed', () => {
    const bd = computeDishScore('South, Urban India', 'SOUTH_RICE', false, 0, 0, 0, 0.05);
    // 1.0 + 0.20 (region match) + 0.05 (seed) = 1.25
    expect(bd.total).toBeCloseTo(1.25, 5);
    expect(bd.base).toBe(1.0);
    expect(bd.region).toBe(0.20);
  });

  it('applies weekend boost for weekend dishes when isWeekend = true', () => {
    const weekday = computeDishScore('Pan India weekend', 'NORTH_WHEAT', false, 0, 0, 0, 0);
    const weekend = computeDishScore('Pan India weekend', 'NORTH_WHEAT', true, 0, 0, 0, 0);
    // weekend: 1.0 + 0.05 (pan-india) + 0.05 (weekend boost) = 1.10
    // weekday: 1.0 + 0.05 (pan-india) = 1.05
    expect(weekend.total).toBeGreaterThan(weekday.total);
    expect(weekday.total).toBeCloseTo(1.05, 5);
    expect(weekend.total).toBeCloseTo(1.10, 5);
  });

  it('does not apply weekend boost on weekday', () => {
    const bd = computeDishScore('Weekend', 'NORTH_WHEAT', false, 0, 0, 0, 0);
    expect(bd.total).toBeCloseTo(1.0, 5);
  });

  it('minimum possible score with seed=0 and no region match', () => {
    const bd = computeDishScore('Egg households', 'SOUTH_RICE', false, 0, 0, 0, 0);
    expect(bd.total).toBe(1.0);
  });

  it('maximum possible score with full region match + weekend + max seed', () => {
    const bd = computeDishScore('South, Weekend', 'SOUTH_RICE', true, 0, 0, 0, 0.10);
    // 1.0 + 0.20 (region) + 0.05 (weekend boost) + 0.10 (seed) = 1.35
    expect(bd.total).toBeCloseTo(1.35, 5);
  });

  it('applies history modifier to final score', () => {
    const bd = computeDishScore('Egg households', 'SOUTH_RICE', false, 0.25, 0, 0, 0);
    expect(bd.total).toBeCloseTo(1.25, 5);
    expect(bd.history).toBeCloseTo(0.25, 5);
  });

  it('applies variety penalty to final score', () => {
    const bd = computeDishScore('Egg households', 'SOUTH_RICE', false, 0, -0.30, 0, 0);
    expect(bd.total).toBeCloseTo(0.70, 5);
    expect(bd.variety).toBeCloseTo(-0.30, 5);
  });

  it('applies behavioral class affinity to final score', () => {
    const bd = computeDishScore('Egg households', 'SOUTH_RICE', false, 0, 0, 0.20, 0);
    expect(bd.total).toBeCloseTo(1.20, 5);
    expect(bd.classAffinity).toBeCloseTo(0.20, 5);
  });

  it('clamps class affinity to the +0.35 ceiling', () => {
    const bd = computeDishScore('Egg households', 'SOUTH_RICE', false, 0, 0, 0.99, 0);
    expect(bd.total).toBeCloseTo(1.35, 5);
    expect(bd.classAffinity).toBeCloseTo(0.35, 5);
  });

  it('B3: breakdown components sum to total', () => {
    const bd = computeDishScore('South, Urban India', 'SOUTH_RICE', false, 0.10, -0.30, 0.15, 0.08);
    const sum = bd.base + bd.region + bd.daySlot + bd.classAffinity + bd.history + bd.variety + bd.random;
    expect(sum).toBeCloseTo(bd.total, 10);
  });
});
