import { expandDayCode, normaliseMealSlot } from '../../foofoo/src/repositories/re-addon.repository';

// ── expandDayCode ─────────────────────────────────────────────────────────────

describe('expandDayCode', () => {
  const cases: [string, string][] = [
    ['Mon', 'Monday'],
    ['Tue', 'Tuesday'],
    ['Wed', 'Wednesday'],
    ['Thu', 'Thursday'],
    ['Fri', 'Friday'],
    ['Sat', 'Saturday'],
    ['Sun', 'Sunday'],
  ];

  test.each(cases)('expands %s → %s', (input, expected) => {
    expect(expandDayCode(input)).toBe(expected);
  });

  it('returns the input unchanged for an unrecognised code', () => {
    expect(expandDayCode('Xyz')).toBe('Xyz');
  });
});

// ── normaliseMealSlot ─────────────────────────────────────────────────────────

describe('normaliseMealSlot', () => {
  it('accepts title-case values from seed data', () => {
    expect(normaliseMealSlot('Breakfast')).toBe('Breakfast');
    expect(normaliseMealSlot('Lunch')).toBe('Lunch');
    expect(normaliseMealSlot('Snack')).toBe('Snack');
    expect(normaliseMealSlot('Dinner')).toBe('Dinner');
  });

  it('accepts lower-case variants', () => {
    expect(normaliseMealSlot('breakfast')).toBe('Breakfast');
    expect(normaliseMealSlot('lunch')).toBe('Lunch');
    expect(normaliseMealSlot('snack')).toBe('Snack');
    expect(normaliseMealSlot('dinner')).toBe('Dinner');
  });

  it('returns null for unknown slot values', () => {
    expect(normaliseMealSlot('Brunch')).toBeNull();
    expect(normaliseMealSlot('')).toBeNull();
    expect(normaliseMealSlot('tea')).toBeNull();
  });
});

// ── Addon plan grouping (pure logic test) ─────────────────────────────────────

describe('addon slot grouping invariants', () => {
  it('each of the 4 slots has an independent array', () => {
    const slots = { breakfast: [], lunch: [], snack: [], dinner: [] };
    slots.breakfast.push('x' as never);
    expect(slots.lunch).toHaveLength(0);
    expect(slots.snack).toHaveLength(0);
    expect(slots.dinner).toHaveLength(0);
  });

  it('normaliseMealSlot covers all 4 check-constraint values', () => {
    const allowed = ['Breakfast', 'Lunch', 'Snack', 'Dinner'] as const;
    for (const v of allowed) {
      expect(normaliseMealSlot(v)).toBe(v);
    }
  });

  it('expandDayCode covers all 7 short codes', () => {
    const shorts = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fulls = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    shorts.forEach((s, i) => {
      expect(expandDayCode(s)).toBe(fulls[i]);
    });
  });
});
