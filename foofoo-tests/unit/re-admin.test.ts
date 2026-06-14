import {
  detectClassesWithNoDishes,
  detectAddonOnlyAsPrimary,
  isDietTagConsistent,
} from '../../foofoo/src/repositories/re-admin.repository';

// ── detectClassesWithNoDishes ─────────────────────────────────────────────────

describe('detectClassesWithNoDishes', () => {
  it('returns empty array when all classes have dishes', () => {
    const classes = ['BF_GRAIN', 'LN_CURRY', 'DN_RICE'];
    const counts = { BF_GRAIN: 5, LN_CURRY: 3, DN_RICE: 8 };
    expect(detectClassesWithNoDishes(classes, counts)).toEqual([]);
  });

  it('flags classes with zero dish count', () => {
    const classes = ['BF_GRAIN', 'LN_CURRY', 'DN_RICE'];
    const counts = { BF_GRAIN: 5, LN_CURRY: 0, DN_RICE: 8 };
    expect(detectClassesWithNoDishes(classes, counts)).toEqual(['LN_CURRY']);
  });

  it('flags classes missing entirely from the count map', () => {
    const classes = ['BF_GRAIN', 'NEW_CLASS'];
    const counts = { BF_GRAIN: 5 };
    expect(detectClassesWithNoDishes(classes, counts)).toEqual(['NEW_CLASS']);
  });

  it('returns all classes when count map is empty', () => {
    const classes = ['BF_GRAIN', 'LN_CURRY'];
    expect(detectClassesWithNoDishes(classes, {})).toEqual(['BF_GRAIN', 'LN_CURRY']);
  });

  it('returns empty array when class list is empty', () => {
    expect(detectClassesWithNoDishes([], { BF_GRAIN: 5 })).toEqual([]);
  });
});

// ── detectAddonOnlyAsPrimary ──────────────────────────────────────────────────

describe('detectAddonOnlyAsPrimary', () => {
  const addonOnly = new Set(['ADDON_INFANT_SOFT', 'ADDON_DIABETIC_LIGHT', 'ADDON_PREGNANCY']);

  it('returns empty array when no primary class is add-on-only', () => {
    const primary = ['BF_GRAIN', 'LN_CURRY', 'DN_RICE'];
    expect(detectAddonOnlyAsPrimary(primary, addonOnly)).toEqual([]);
  });

  it('flags add-on-only classes used as primary', () => {
    const primary = ['BF_GRAIN', 'ADDON_INFANT_SOFT', 'DN_RICE'];
    expect(detectAddonOnlyAsPrimary(primary, addonOnly)).toEqual(['ADDON_INFANT_SOFT']);
  });

  it('flags multiple add-on-only classes used as primary', () => {
    const primary = ['ADDON_INFANT_SOFT', 'ADDON_DIABETIC_LIGHT'];
    const result = detectAddonOnlyAsPrimary(primary, addonOnly);
    expect(result).toContain('ADDON_INFANT_SOFT');
    expect(result).toContain('ADDON_DIABETIC_LIGHT');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when primary list is empty', () => {
    expect(detectAddonOnlyAsPrimary([], addonOnly)).toEqual([]);
  });

  it('returns empty array when addon-only set is empty', () => {
    const primary = ['BF_GRAIN', 'LN_CURRY'];
    expect(detectAddonOnlyAsPrimary(primary, new Set())).toEqual([]);
  });
});

// ── isDietTagConsistent ───────────────────────────────────────────────────────

describe('isDietTagConsistent', () => {
  it('any class allows all diet types', () => {
    expect(isDietTagConsistent('veg', 'any')).toBe(true);
    expect(isDietTagConsistent('nonveg', 'any')).toBe(true);
    expect(isDietTagConsistent('egg', 'any')).toBe(true);
  });

  it('veg class allows only veg dishes', () => {
    expect(isDietTagConsistent('veg', 'veg')).toBe(true);
    expect(isDietTagConsistent('nonveg', 'veg')).toBe(false);
    expect(isDietTagConsistent('egg', 'veg')).toBe(false);
  });

  it('unknown class restriction defaults to compatible', () => {
    expect(isDietTagConsistent('nonveg', 'unknown_class_diet')).toBe(true);
  });
});
