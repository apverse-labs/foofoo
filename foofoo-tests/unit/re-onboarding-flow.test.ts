/** re-onboarding-flow.test.ts — pure branching + confidence (UI-BUILD-02). */
import {
  buildScreenFlow, computeOnboardingConfidence, shouldAutoCollapseOptional, REACTION_AFFINITY,
} from '../../foofoo/src/utils/re-onboarding-flow';

describe('buildScreenFlow (dynamic branching)', () => {
  it('simple single user: no members, no health screen', () => {
    const f = buildScreenFlow({ mainCohortId: 'MC1', subCohortId: 'SC1B' });
    expect(f).not.toContain('members');
    expect(f).not.toContain('health');
    expect(f[0]).toBe('welcome');
    expect(f).toContain('home_state');
    expect(f).toContain('current_city');
  });
  it('family with toddler: shows members + health', () => {
    const f = buildScreenFlow({ mainCohortId: 'MC3', subCohortId: 'SC3A' });
    expect(f).toContain('members');
    expect(f).toContain('health');
  });
  it('composite MC4 child+elder (SC4F): members + health present', () => {
    const f = buildScreenFlow({ mainCohortId: 'MC4', subCohortId: 'SC4F' });
    expect(f).toContain('members');
    expect(f).toContain('health');
  });
  it('always separates home_state and current_city as two screens', () => {
    const f = buildScreenFlow({ subCohortId: 'SC1A' });
    expect(f.indexOf('home_state')).toBeGreaterThanOrEqual(0);
    expect(f.indexOf('current_city')).toBeGreaterThan(f.indexOf('home_state'));
  });
});

describe('computeOnboardingConfidence', () => {
  it('rises with answered screens, clamped to 1', () => {
    const full = computeOnboardingConfidence({ subCohortId: 'SC1A' });
    expect(full).toBeGreaterThan(0.7);
    expect(full).toBeLessThanOrEqual(1);
  });
  it('skips lower confidence but never below 0', () => {
    const skipAll = computeOnboardingConfidence({ subCohortId: 'SC1A', skipped: { cohort: true, home_state: true, current_city: true, diet: true, cook: true, weekday: true, weekend: true, swipe: true } });
    expect(skipAll).toBeGreaterThanOrEqual(0);
    expect(skipAll).toBeLessThan(0.2);
  });
});

describe('shouldAutoCollapseOptional', () => {
  it('collapses optional screens when core confidence is high', () => {
    expect(shouldAutoCollapseOptional({ subCohortId: 'SC1A' })).toBe(true);
  });
  it('does not collapse when core answers are skipped', () => {
    expect(shouldAutoCollapseOptional({ subCohortId: 'SC1A', skipped: { diet: true, home_state: true, current_city: true, cook: true } })).toBe(false);
  });
});

describe('class swipe affinity map', () => {
  it('orders reactions love>like>sometimes>not>never within [-1,1]', () => {
    expect(REACTION_AFFINITY.more).toBe(1.0);
    expect(REACTION_AFFINITY.never).toBe(-1.0);
    expect(REACTION_AFFINITY.like).toBeGreaterThan(REACTION_AFFINITY.sometimes);
    Object.values(REACTION_AFFINITY).forEach((v) => { expect(v).toBeGreaterThanOrEqual(-1); expect(v).toBeLessThanOrEqual(1); });
  });
});
