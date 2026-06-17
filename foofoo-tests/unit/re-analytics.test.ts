import {
  computeAcceptanceMetrics,
  computeClassAcceptance,
} from '../../foofoo/src/repositories/re-analytics.repository';

// ── computeAcceptanceMetrics ──────────────────────────────────────────────────

describe('computeAcceptanceMetrics', () => {
  it('returns zero rates when no signals', () => {
    const m = computeAcceptanceMetrics('u1', {});
    expect(m.totalSignals).toBe(0);
    expect(m.acceptanceRate).toBe(0);
    expect(m.neverRate).toBe(0);
    expect(m.notTodayRate).toBe(0);
  });

  it('computes acceptance rate from LOCK and ACCEPT signals', () => {
    const m = computeAcceptanceMetrics('u1', { LOCK: 3, ACCEPT: 2, SWIPE_PAST: 5 });
    expect(m.totalSignals).toBe(10);
    expect(m.positiveCount).toBe(5);
    expect(m.acceptanceRate).toBeCloseTo(0.5, 5);
  });

  it('includes ADD_TO_GROCERY and TAP_RECIPE in positive count', () => {
    const m = computeAcceptanceMetrics('u1', { ADD_TO_GROCERY: 2, TAP_RECIPE: 3 });
    expect(m.positiveCount).toBe(5);
    expect(m.acceptanceRate).toBe(1.0);
  });

  it('computes never rate correctly', () => {
    const m = computeAcceptanceMetrics('u1', { LOCK: 8, NEVER: 2 });
    expect(m.neverRate).toBeCloseTo(0.2, 5);
  });

  it('computes not-today rate correctly', () => {
    const m = computeAcceptanceMetrics('u1', { ACCEPT: 6, NOT_TODAY: 4 });
    expect(m.notTodayRate).toBeCloseTo(0.4, 5);
  });

  it('counts NEVER and NOT_TODAY in negative count', () => {
    const m = computeAcceptanceMetrics('u1', { NEVER: 1, NOT_TODAY: 2, SWIPE_PAST: 3 });
    expect(m.negativeCount).toBe(6);
  });

  it('acceptance rate is 1.0 when all signals are positive', () => {
    const m = computeAcceptanceMetrics('u1', { LOCK: 5 });
    expect(m.acceptanceRate).toBe(1.0);
  });

  it('acceptance rate is 0 when all signals are negative', () => {
    const m = computeAcceptanceMetrics('u1', { SWIPE_PAST: 3, NEVER: 2 });
    expect(m.acceptanceRate).toBe(0);
  });
});

// ── computeClassAcceptance ────────────────────────────────────────────────────

describe('computeClassAcceptance', () => {
  it('returns empty array for no rows', () => {
    expect(computeClassAcceptance([])).toEqual([]);
  });

  it('groups signals by mealClassCode', () => {
    const rows = [
      { mealClassCode: 'BF_GRAIN', signal: 'LOCK' as const },
      { mealClassCode: 'BF_GRAIN', signal: 'ACCEPT' as const },
      { mealClassCode: 'LN_CURRY', signal: 'SWIPE_PAST' as const },
    ];
    const result = computeClassAcceptance(rows);
    const bf = result.find((r) => r.mealClassCode === 'BF_GRAIN')!;
    const ln = result.find((r) => r.mealClassCode === 'LN_CURRY')!;
    expect(bf.totalSignals).toBe(2);
    expect(bf.positiveCount).toBe(2);
    expect(bf.acceptanceRate).toBe(1.0);
    expect(ln.totalSignals).toBe(1);
    expect(ln.positiveCount).toBe(0);
    expect(ln.acceptanceRate).toBe(0);
  });

  it('computes acceptance rate as positive / total per class', () => {
    const rows = [
      { mealClassCode: 'DN_RICE', signal: 'LOCK' as const },
      { mealClassCode: 'DN_RICE', signal: 'SWIPE_PAST' as const },
      { mealClassCode: 'DN_RICE', signal: 'SWIPE_PAST' as const },
      { mealClassCode: 'DN_RICE', signal: 'SWIPE_PAST' as const },
    ];
    const result = computeClassAcceptance(rows);
    const dn = result.find((r) => r.mealClassCode === 'DN_RICE')!;
    expect(dn.acceptanceRate).toBeCloseTo(0.25, 5);
  });
});
