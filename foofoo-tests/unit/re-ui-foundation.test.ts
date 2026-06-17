/**
 * re-ui-foundation.test.ts — pure helpers + theme tokens for UI-BUILD-01.
 * (Component render tests need a RN testing library, not currently installed — see UI_BUILD_01_LOG.)
 */
import { getREPalette, RE_PALETTE, MIN_TOUCH, RE_TYPE } from '../../foofoo/src/config/re-theme';
import {
  emptyStateContent, errorContent, buildA11yLabel, reducedMotionDuration,
} from '../../foofoo/src/utils/re-ui-helpers';

describe('re-theme', () => {
  it('returns light palette by default and dark when asked', () => {
    expect(getREPalette()).toBe(RE_PALETTE.light);
    expect(getREPalette('dark')).toBe(RE_PALETTE.dark);
  });
  it('light + dark expose the same token keys (dark is a switch, not a rewrite)', () => {
    expect(Object.keys(RE_PALETTE.light).sort()).toEqual(Object.keys(RE_PALETTE.dark).sort());
  });
  it('enforces a 48dp touch floor and a type scale', () => {
    expect(MIN_TOUCH).toBe(48);
    expect(RE_TYPE.title.fontSize).toBeGreaterThan(RE_TYPE.caption.fontSize);
  });
});

describe('emptyStateContent', () => {
  it('gives a CTA for no-plan and skipped', () => {
    expect(emptyStateContent('no-plan').ctaLabel).toBeTruthy();
    expect(emptyStateContent('skipped').ctaLabel).toBeTruthy();
  });
  it('no-candidate / no-addon are informational (no CTA)', () => {
    expect(emptyStateContent('no-candidate').ctaLabel).toBeUndefined();
    expect(emptyStateContent('no-addon').ctaLabel).toBeUndefined();
  });
});

describe('errorContent (DOC-23 codes)', () => {
  it('marks transient codes retryable, constraint codes not', () => {
    expect(errorContent('GENERATION_FAILED').retryable).toBe(true);
    expect(errorContent('OFFLINE').retryable).toBe(true);
    expect(errorContent('HARD_CONSTRAINT_BLOCK').retryable).toBe(false);
    expect(errorContent('MISSING_DIET_MODE').retryable).toBe(false);
  });
  it('never implies unsafe food for constraint blocks', () => {
    const c = errorContent('HARD_CONSTRAINT_BLOCK');
    expect(`${c.title} ${c.body}`.toLowerCase()).toContain('safe');
  });
});

describe('buildA11yLabel', () => {
  it('appends state so meaning is not color-only', () => {
    expect(buildA11yLabel('Lock lunch', { state: 'locked' })).toBe('Lock lunch, locked');
    expect(buildA11yLabel('Keep dish')).toBe('Keep dish');
    expect(buildA11yLabel('Diet veg', { state: 'selected', hint: 'tap to change' })).toBe('Diet veg, selected, tap to change');
  });
});

describe('reducedMotionDuration', () => {
  it('zeroes duration under reduced motion, else passes through', () => {
    expect(reducedMotionDuration(true, 350)).toBe(0);
    expect(reducedMotionDuration(false, 350)).toBe(350);
    expect(reducedMotionDuration(false, -5)).toBe(0);
  });
});
