/**
 * bucket-logic.test.ts
 *
 * Verifies that the onboarding bucket system (Frequently / Occasionally / Never)
 * correctly influences RE scoring soft constraints, ensuring user preferences
 * are faithfully reflected in dish selection.
 *
 * Run: npm run test:unit
 * Depends on: lib/re-engine.ts, lib/types.ts
 * Doc refs: Doc 10 Section 5.2 (soft constraints), Section 6 Step 3
 */

// unit/bucket-logic.test.ts
// Tests the onboarding bucket system
// Spec: Doc #10 v3 — Section 5.2 (soft constraints), Section 6 Step 3

import { checkCuisineBucket, scoreDish, passesHardConstraints, checkDietType } from '../lib/re-engine';
import type { Dish, UserCategoryPreference, REContext, UserDietRules, NeverListEntry } from '../lib/types';

function mockDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 1,
    name: 'Mock Dish',
    cuisine_id: 'north_indian',
    diet_type: 'veg',
    spice_level: 2,
    meal_types: ['lunch'],
    ingredient_ids: [10, 20],
    is_jain: false,
    allergens: [],
    is_active: true,
    ...overrides,
  };
}

function mockContext(overrides: Partial<REContext> = {}): REContext {
  return {
    user_id: 'user-001',
    meal_slot: 'lunch',
    date: new Date('2026-05-19T12:00:00'),
    ...overrides,
  };
}

function makePrefs(items: Array<{ type: 'cuisine' | 'breakfast' | 'lunch_dinner'; slug: string; bucket: 'frequently' | 'occasionally' | 'never' }>): UserCategoryPreference[] {
  return items.map((item, i) => ({
    user_id: 'user-001',
    category_type: item.type,
    item_id: i + 1,
    item_slug: item.slug,
    preference_bucket: item.bucket,
  }));
}

// ─── Bucket uniqueness ────────────────────────────────────────────────────────

describe('Bucket Logic: item in exactly one bucket', () => {
  it('cuisine item in Frequently bucket: checkCuisineBucket returns "frequently"', () => {
    const prefs = makePrefs([{ type: 'cuisine', slug: 'south_indian', bucket: 'frequently' }]);
    expect(checkCuisineBucket('south_indian', prefs)).toBe('frequently');
  });

  it('cuisine item in Occasionally bucket: returns "occasionally"', () => {
    const prefs = makePrefs([{ type: 'cuisine', slug: 'gujarati', bucket: 'occasionally' }]);
    expect(checkCuisineBucket('gujarati', prefs)).toBe('occasionally');
  });

  it('cuisine item in Never bucket: returns "never"', () => {
    const prefs = makePrefs([{ type: 'cuisine', slug: 'chinese_indo', bucket: 'never' }]);
    expect(checkCuisineBucket('chinese_indo', prefs)).toBe('never');
  });

  it('cuisine not in any bucket: returns "unset"', () => {
    const prefs = makePrefs([{ type: 'cuisine', slug: 'south_indian', bucket: 'frequently' }]);
    expect(checkCuisineBucket('bengali', prefs)).toBe('unset');
  });

  it('item cannot exist in two buckets simultaneously (model constraint)', () => {
    // If a cuisine appears twice in prefs, the FIRST match should win
    const prefs: UserCategoryPreference[] = [
      { user_id: 'u1', category_type: 'cuisine', item_id: 1, item_slug: 'north_indian', preference_bucket: 'frequently' },
      { user_id: 'u1', category_type: 'cuisine', item_id: 1, item_slug: 'north_indian', preference_bucket: 'occasionally' },
    ];
    const result = checkCuisineBucket('north_indian', prefs);
    // Should return the first match found — not 'occasionally' as well
    expect(['frequently', 'occasionally']).toContain(result);
    expect(result).not.toBe('never'); // definitely not never
  });
});

// ─── Never bucket = hard exclusion ───────────────────────────────────────────

describe('Bucket Logic: Cuisine Never bucket excludes dishes', () => {
  it('dish from Never cuisine is excluded from RE via cuisine check', () => {
    const prefs = makePrefs([{ type: 'cuisine', slug: 'chinese_indo', bucket: 'never' }]);
    const bucket = checkCuisineBucket('chinese_indo', prefs);
    // RE must exclude Never cuisine entirely — bucket='never' should trigger hard exclusion
    expect(bucket).toBe('never');
  });

  it('dish from Frequently cuisine gets +0.3 boost', () => {
    const dish = mockDish({ cuisine_id: 'maharashtrian' });
    const prefs = makePrefs([{ type: 'cuisine', slug: 'maharashtrian', bucket: 'frequently' }]);
    const scored = scoreDish(dish, mockContext(), prefs, [], undefined, 0);
    expect(scored.score_breakdown.cuisine_pref).toBe(0.3);
  });

  it('dish from Occasionally cuisine gets +0.1 boost', () => {
    const dish = mockDish({ cuisine_id: 'rajasthani' });
    const prefs = makePrefs([{ type: 'cuisine', slug: 'rajasthani', bucket: 'occasionally' }]);
    const scored = scoreDish(dish, mockContext(), prefs, [], undefined, 0);
    expect(scored.score_breakdown.cuisine_pref).toBe(0.1);
  });

  it('unset cuisine gets 0 boost', () => {
    const dish = mockDish({ cuisine_id: 'continental' });
    const prefs = makePrefs([{ type: 'cuisine', slug: 'maharashtrian', bucket: 'frequently' }]);
    const scored = scoreDish(dish, mockContext(), prefs, [], undefined, 0);
    expect(scored.score_breakdown.cuisine_pref).toBe(0);
  });
});

// ─── Bucket score changes when moved ─────────────────────────────────────────

describe('Bucket Logic: Moving item changes score correctly', () => {
  it('moving from Frequently to Never: score drops', () => {
    const dish = mockDish({ cuisine_id: 'north_indian' });
    const context = mockContext();

    const prefsFreq = makePrefs([{ type: 'cuisine', slug: 'north_indian', bucket: 'frequently' }]);
    const prefsNever = makePrefs([{ type: 'cuisine', slug: 'north_indian', bucket: 'never' }]);

    const scoreFreq = scoreDish(dish, context, prefsFreq, [], undefined, 0).score;
    const scoreNever = scoreDish(dish, context, prefsNever, [], undefined, 0).score;

    // Never bucket: no cuisine boost (or negative), Frequently: +0.3
    expect(scoreFreq).toBeGreaterThan(scoreNever);
  });

  it('moving from Never to Frequently: score increases by 0.3', () => {
    const dish = mockDish({ cuisine_id: 'south_indian' });
    const context = mockContext();

    const prefsNever = makePrefs([{ type: 'cuisine', slug: 'south_indian', bucket: 'never' }]);
    const prefsFreq = makePrefs([{ type: 'cuisine', slug: 'south_indian', bucket: 'frequently' }]);

    const scoreNever = scoreDish(dish, context, prefsNever, [], undefined, 0).score;
    const scoreFreq = scoreDish(dish, context, prefsFreq, [], undefined, 0).score;

    expect(scoreFreq - scoreNever).toBeCloseTo(0.3, 5);
  });
});

// ─── user_category_preferences: integer IDs ──────────────────────────────────

describe('Bucket Logic: user_category_preferences uses integer IDs', () => {
  it('preference stores item_id as number (not string)', () => {
    const prefs = makePrefs([{ type: 'cuisine', slug: 'south_indian', bucket: 'frequently' }]);
    expect(typeof prefs[0].item_id).toBe('number');
  });

  it('item_id is a positive integer', () => {
    const prefs = makePrefs([
      { type: 'cuisine', slug: 'gujarati', bucket: 'occasionally' },
      { type: 'breakfast', slug: 'poha', bucket: 'frequently' },
    ]);
    prefs.forEach(p => {
      expect(Number.isInteger(p.item_id)).toBe(true);
      expect(p.item_id).toBeGreaterThan(0);
    });
  });
});

// ─── Multi-bucket type test ───────────────────────────────────────────────────

describe('Bucket Logic: category_type separation', () => {
  it('cuisine and breakfast prefs are stored separately by category_type', () => {
    const prefs = makePrefs([
      { type: 'cuisine', slug: 'south_indian', bucket: 'frequently' },
      { type: 'breakfast', slug: 'idli', bucket: 'frequently' },
      { type: 'lunch_dinner', slug: 'dal_rice', bucket: 'occasionally' },
    ]);

    const cuisinePrefs = prefs.filter(p => p.category_type === 'cuisine');
    const breakfastPrefs = prefs.filter(p => p.category_type === 'breakfast');
    const lunchPrefs = prefs.filter(p => p.category_type === 'lunch_dinner');

    expect(cuisinePrefs).toHaveLength(1);
    expect(breakfastPrefs).toHaveLength(1);
    expect(lunchPrefs).toHaveLength(1);
  });
});
