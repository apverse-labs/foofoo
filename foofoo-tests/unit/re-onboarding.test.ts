/**
 * re-onboarding.test.ts — pure helpers for BUILD-02 capture layer.
 */
import {
  deriveNonvegMode,
  isValidClassAffinityVector,
  requiresMemberStep,
} from '../../foofoo/src/repositories/re-onboarding.repository';

describe('deriveNonvegMode', () => {
  it('maps hard veg modes', () => {
    expect(deriveNonvegMode('veg' as any, 0)).toBe('veg');
    expect(deriveNonvegMode('vegan' as any, 0)).toBe('vegan');
    expect(deriveNonvegMode('jain' as any, 0)).toBe('jain');
  });
  it('maps egg', () => {
    expect(deriveNonvegMode('egg' as any, 0)).toBe('egg_only');
  });
  it('splits non-veg by weekly cadence', () => {
    expect(deriveNonvegMode('non-veg' as any, 5)).toBe('regular_nonveg');
    expect(deriveNonvegMode('non-veg' as any, 2)).toBe('occasional_nonveg');
    expect(deriveNonvegMode('non-veg' as any, null)).toBe('occasional_nonveg');
  });
});

describe('isValidClassAffinityVector', () => {
  it('accepts meal-class keys with values in [-1,1]', () => {
    expect(isValidClassAffinityVector({ LD_DAL_ROTI_SABZI: 0.2, DN_KHICHDI_SOUP: -0.5 })).toBe(true);
  });
  it('rejects non-class keys', () => {
    expect(isValidClassAffinityVector({ random_key: 0.2 })).toBe(false);
  });
  it('rejects out-of-range / non-number values', () => {
    expect(isValidClassAffinityVector({ LD_X: 1.5 })).toBe(false);
    expect(isValidClassAffinityVector({ LD_X: 'hi' })).toBe(false);
  });
  it('rejects arrays / null / non-objects', () => {
    expect(isValidClassAffinityVector([])).toBe(false);
    expect(isValidClassAffinityVector(null)).toBe(false);
    expect(isValidClassAffinityVector('x')).toBe(false);
  });
});

describe('requiresMemberStep', () => {
  it('triggers for member-bearing sub-cohorts', () => {
    expect(requiresMemberStep('SC3A')).toBe(true);
    expect(requiresMemberStep('SC4F')).toBe(true);
  });
  it('does not trigger for adult-only sub-cohorts', () => {
    expect(requiresMemberStep('SC1A')).toBe(false);
    expect(requiresMemberStep('SC2A')).toBe(false);
  });
});
