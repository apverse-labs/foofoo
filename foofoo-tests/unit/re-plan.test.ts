/**
 * re-plan.test.ts
 *
 * Unit tests for the pure helpers in re-plan.repository.ts (BUILD-04):
 *   - deriveMealClassDisplayName: prefix stripping + title-casing
 *   - getWeekStartMondayIST: IST week-start (Monday) resolution
 *
 * Run: npm run test:unit
 */

import {
  deriveMealClassDisplayName,
  getWeekStartMondayIST,
} from '../../foofoo/src/repositories/re-plan.repository';

describe('deriveMealClassDisplayName', () => {
  it('strips slot prefix and title-cases', () => {
    expect(deriveMealClassDisplayName('BF_STUFFED_FLATBREAD')).toBe('Stuffed Flatbread');
  });

  it('handles LD/SN/DN prefixes', () => {
    expect(deriveMealClassDisplayName('DN_LIGHT_DAL_RICE')).toBe('Light Dal Rice');
    expect(deriveMealClassDisplayName('SN_TEA_SNACK')).toBe('Tea Snack');
  });

  it('handles names without a known prefix', () => {
    expect(deriveMealClassDisplayName('SIMPLE_MEAL')).toBe('Simple Meal');
  });

  it('returns empty string for empty input', () => {
    expect(deriveMealClassDisplayName('')).toBe('');
  });
});

describe('getWeekStartMondayIST', () => {
  it('returns the same Monday for any day in that IST week', () => {
    // 2026-06-14 is a Sunday; its IST week started Monday 2026-06-08.
    const sunday = new Date('2026-06-14T10:00:00Z');
    expect(getWeekStartMondayIST(sunday)).toBe('2026-06-08');
  });

  it('returns the current day when it is Monday (IST)', () => {
    const monday = new Date('2026-06-08T08:00:00Z');
    expect(getWeekStartMondayIST(monday)).toBe('2026-06-08');
  });

  it('rolls into the correct week across the IST midnight boundary', () => {
    // 2026-06-07T19:00Z is 2026-06-08T00:30 IST (Monday) → week start 2026-06-08.
    const lateUtc = new Date('2026-06-07T19:00:00Z');
    expect(getWeekStartMondayIST(lateUtc)).toBe('2026-06-08');
  });

  it('produces an ISO date string', () => {
    expect(getWeekStartMondayIST(new Date('2026-06-10T00:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
