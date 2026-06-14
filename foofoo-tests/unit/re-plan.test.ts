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
  bucketOverlayClasses,
  pickOverlaySlots,
} from '../../foofoo/src/repositories/re-plan.repository';

// ── BUILD-04 city-overlay blend (DOC-09) ───────────────────────────────────────
describe('bucketOverlayClasses', () => {
  it('buckets pipe-delimited classes by slot prefix', () => {
    const b = bucketOverlayClasses('BF_STUFFED_FLATBREAD|LD_RAJMA_CHOLE_LEGUME|LD_PANEER_RICH_GRAVY|DN_LIGHT_ROTI_SABZI|SN_STREET_CHAAT');
    expect(b.BF).toEqual(['BF_STUFFED_FLATBREAD']);
    expect(b.LD).toEqual(['LD_RAJMA_CHOLE_LEGUME', 'LD_PANEER_RICH_GRAVY']);
    expect(b.DN).toEqual(['DN_LIGHT_ROTI_SABZI']);
    expect(b.SN).toEqual(['SN_STREET_CHAAT']);
  });
  it('returns empty buckets for null/empty', () => {
    expect(bucketOverlayClasses(null)).toEqual({ BF: [], LD: [], SN: [], DN: [] });
    expect(bucketOverlayClasses('')).toEqual({ BF: [], LD: [], SN: [], DN: [] });
  });
  it('ignores whitespace and unknown prefixes', () => {
    const b = bucketOverlayClasses(' LD_X | XX_Y | DN_Z ');
    expect(b.LD).toEqual(['LD_X']); expect(b.DN).toEqual(['DN_Z']);
  });
});

describe('pickOverlaySlots', () => {
  it('sizes selection by city weight (5 weekdays @ 0.30 -> 2)', () => {
    expect(pickOverlaySlots(5, 0.30)).toHaveLength(2);
  });
  it('home-dominant: minority of weekdays overlaid', () => {
    const picks = pickOverlaySlots(5, 0.30);
    expect(picks.length).toBeLessThan(5 - picks.length);
  });
  it('returns empty for zero weight or no weekdays', () => {
    expect(pickOverlaySlots(5, 0)).toEqual([]);
    expect(pickOverlaySlots(0, 0.30)).toEqual([]);
  });
  it('is deterministic, de-duplicated, in range', () => {
    const a = pickOverlaySlots(5, 0.55); const b = pickOverlaySlots(5, 0.55);
    expect(a).toEqual(b);
    expect(Math.max(...a)).toBeLessThanOrEqual(4);
    expect(new Set(a).size).toBe(a.length);
  });
});

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
