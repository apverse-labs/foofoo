import {
  clampHistoryModifier,
  computeVarietyPenalty,
  computeNotTodayExpiry,
  isOnCooldown,
  RE_SIGNAL_WEIGHTS,
  VARIETY_WINDOW_DAYS,
  VARIETY_PENALTY,
} from '../../foofoo/src/repositories/re-feedback.repository';

// ── RE_SIGNAL_WEIGHTS ─────────────────────────────────────────────────────────

describe('RE_SIGNAL_WEIGHTS', () => {
  it('LOCK is the strongest positive signal (+0.40)', () => {
    expect(RE_SIGNAL_WEIGHTS.LOCK).toBe(0.40);
  });

  it('NOT_TODAY is the strongest negative signal (-0.30)', () => {
    expect(RE_SIGNAL_WEIGHTS.NOT_TODAY).toBe(-0.30);
  });

  it('NEVER and NEVER_REMOVE have weight 0 (state change only)', () => {
    expect(RE_SIGNAL_WEIGHTS.NEVER).toBe(0);
    expect(RE_SIGNAL_WEIGHTS.NEVER_REMOVE).toBe(0);
  });

  it('positive signals are ordered LOCK > ADD_TO_GROCERY > ACCEPT > TAP_RECIPE > VIEW', () => {
    expect(RE_SIGNAL_WEIGHTS.LOCK).toBeGreaterThan(RE_SIGNAL_WEIGHTS.ADD_TO_GROCERY);
    expect(RE_SIGNAL_WEIGHTS.ADD_TO_GROCERY).toBeGreaterThan(RE_SIGNAL_WEIGHTS.ACCEPT);
    expect(RE_SIGNAL_WEIGHTS.ACCEPT).toBeGreaterThan(RE_SIGNAL_WEIGHTS.TAP_RECIPE);
    expect(RE_SIGNAL_WEIGHTS.TAP_RECIPE).toBeGreaterThan(RE_SIGNAL_WEIGHTS.VIEW);
    expect(RE_SIGNAL_WEIGHTS.VIEW).toBeGreaterThan(0);
  });

  it('SWIPE_PAST is negative', () => {
    expect(RE_SIGNAL_WEIGHTS.SWIPE_PAST).toBeLessThan(0);
  });
});

// ── clampHistoryModifier ──────────────────────────────────────────────────────

describe('clampHistoryModifier', () => {
  it('returns value unchanged when within range', () => {
    expect(clampHistoryModifier(0)).toBe(0);
    expect(clampHistoryModifier(0.20)).toBe(0.20);
    expect(clampHistoryModifier(-0.15)).toBe(-0.15);
  });

  it('clamps to +0.40 for values above the ceiling', () => {
    expect(clampHistoryModifier(0.50)).toBe(0.40);
    expect(clampHistoryModifier(1.00)).toBe(0.40);
    expect(clampHistoryModifier(0.40)).toBe(0.40);
  });

  it('clamps to -0.30 for values below the floor', () => {
    expect(clampHistoryModifier(-0.50)).toBe(-0.30);
    expect(clampHistoryModifier(-1.00)).toBe(-0.30);
    expect(clampHistoryModifier(-0.30)).toBe(-0.30);
  });
});

// ── computeVarietyPenalty ─────────────────────────────────────────────────────

describe('computeVarietyPenalty', () => {
  it('returns 0 when lastSeenDate is null', () => {
    expect(computeVarietyPenalty(null, '2026-06-14')).toBe(0);
  });

  it(`returns VARIETY_PENALTY (${VARIETY_PENALTY}) when dish seen same day`, () => {
    expect(computeVarietyPenalty('2026-06-14', '2026-06-14')).toBe(VARIETY_PENALTY);
  });

  it(`returns VARIETY_PENALTY when dish seen within ${VARIETY_WINDOW_DAYS} days`, () => {
    expect(computeVarietyPenalty('2026-06-12', '2026-06-14')).toBe(VARIETY_PENALTY); // 2 days ago
    expect(computeVarietyPenalty('2026-06-11', '2026-06-14')).toBe(VARIETY_PENALTY); // 3 days ago
  });

  it('returns 0 when dish seen more than VARIETY_WINDOW_DAYS ago', () => {
    expect(computeVarietyPenalty('2026-06-10', '2026-06-14')).toBe(0); // 4 days ago
    expect(computeVarietyPenalty('2026-06-01', '2026-06-14')).toBe(0); // 13 days ago
  });
});

// ── computeNotTodayExpiry ─────────────────────────────────────────────────────

describe('computeNotTodayExpiry', () => {
  it('adds 3 days to the signal date', () => {
    expect(computeNotTodayExpiry('2026-06-14')).toBe('2026-06-17');
  });

  it('handles month boundary', () => {
    expect(computeNotTodayExpiry('2026-06-29')).toBe('2026-07-02');
  });

  it('handles year boundary', () => {
    expect(computeNotTodayExpiry('2026-12-30')).toBe('2027-01-02');
  });
});

// ── isOnCooldown ──────────────────────────────────────────────────────────────

describe('isOnCooldown', () => {
  it('returns false when notTodayUntil is null', () => {
    expect(isOnCooldown(null, '2026-06-14')).toBe(false);
  });

  it('returns true when cooldown expires today (same date)', () => {
    expect(isOnCooldown('2026-06-14', '2026-06-14')).toBe(true);
  });

  it('returns true when cooldown expires in the future', () => {
    expect(isOnCooldown('2026-06-17', '2026-06-14')).toBe(true);
  });

  it('returns false when cooldown has already expired', () => {
    expect(isOnCooldown('2026-06-13', '2026-06-14')).toBe(false);
  });
});
