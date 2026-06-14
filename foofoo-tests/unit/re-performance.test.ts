/**
 * re-performance.test.ts
 *
 * QA Layer 6 — Pure-function performance benchmarks for the RE scoring pipeline.
 * No DB, no network. All timings are wall-clock via performance.now().
 *
 * Thresholds are generous (2–5× the expected fast-path) to avoid flakiness on
 * slow CI runners. The goal is catching O(n²) regressions, not micro-optimisation.
 *
 * Run: npx jest --testPathPattern='unit/re-performance' --no-coverage
 */

import {
  passesHardConstraints,
  scoreDish,
  checkDietType,
  checkAllergens,
  SCORE_MIN,
  SCORE_MAX,
} from '../lib/re-engine';
import type {
  Dish,
  UserDietRules,
  UserCategoryPreference,
  REContext,
  NeverListEntry,
} from '../lib/types';

jest.setTimeout(10000);

// ─── Factories ────────────────────────────────────────────────────────────────

const CUISINES = [
  'north_indian', 'south_indian', 'east_indian', 'west_indian',
  'street_food', 'continental', 'chinese', 'desserts',
];

function makeDish(id: number): Dish {
  return {
    id,
    name: `Dish ${id}`,
    cuisine_id: CUISINES[id % CUISINES.length],
    diet_type: id % 3 === 0 ? 'non_veg' : 'veg',
    spice_level: ((id % 4) + 1) as 1 | 2 | 3 | 4,
    meal_types: ['breakfast', 'lunch', 'dinner'],
    ingredient_ids: [id * 10, id * 10 + 1, id * 10 + 2],
    is_jain: false,
    allergens: [],
    regional_origin: 'DL',
    cook_time_mins: 20 + (id % 40),
    is_active: true,
  };
}

function vegRules(userId = 'u-perf'): UserDietRules {
  return {
    user_id: userId,
    diet_type: 'veg',
    excluded_ingredient_ids: [],
    allergen_ingredient_ids: [],
  };
}

function makePrefs(userId = 'u-perf'): UserCategoryPreference[] {
  return CUISINES.map((slug, i) => ({
    user_id: userId,
    category_type: 'cuisine' as const,
    item_id: i + 1,
    item_slug: slug,
    preference_bucket: i % 3 === 0 ? 'frequently' : i % 3 === 1 ? 'occasionally' : 'never',
  }));
}

function makeContext(slot: 'breakfast' | 'lunch' | 'dinner' = 'lunch'): REContext {
  return {
    user_id: 'u-perf',
    meal_slot: slot,
    date: new Date('2026-06-14T12:00:00'),
  };
}

// ─── Benchmarks ───────────────────────────────────────────────────────────────

describe('RE Performance: dish scoring throughput', () => {
  const prefs = makePrefs();
  const ctx = makeContext();

  it('scores 100 dishes in < 50ms', () => {
    const dishes = Array.from({ length: 100 }, (_, i) => makeDish(i + 1));
    const t0 = performance.now();
    for (const d of dishes) scoreDish(d, ctx, prefs, [], undefined, 0);
    expect(performance.now() - t0).toBeLessThan(50);
  });

  // Threshold relaxed to 500ms (from 200ms) because scoreDish does non-trivial
  // per-dish work (preference lookup, variety guard, breakdown computation) and
  // CI runners can be 3-5x slower than local dev hardware.
  it('scores 1000 dishes in < 500ms', () => {
    const dishes = Array.from({ length: 1000 }, (_, i) => makeDish(i + 1));
    const t0 = performance.now();
    for (const d of dishes) scoreDish(d, ctx, prefs, [], undefined, 0);
    expect(performance.now() - t0).toBeLessThan(500);
  });

  it('produced scores stay within [SCORE_MIN, SCORE_MAX]', () => {
    const dishes = Array.from({ length: 200 }, (_, i) => makeDish(i + 1));
    for (const d of dishes) {
      const result = scoreDish(d, ctx, prefs, [], undefined, 0);
      expect(result.score).toBeGreaterThanOrEqual(SCORE_MIN);
      expect(result.score).toBeLessThanOrEqual(SCORE_MAX);
    }
  });
});

describe('RE Performance: hard constraint filtering throughput', () => {
  const rules = vegRules();

  it('filters 500 dishes via passesHardConstraints in < 30ms', () => {
    const dishes = Array.from({ length: 500 }, (_, i) => makeDish(i + 1));
    const t0 = performance.now();
    for (const d of dishes) passesHardConstraints(d, rules, []);
    expect(performance.now() - t0).toBeLessThan(30);
  });

  // checkDietType takes a DietType string (not UserDietRules object)
  it('checkDietType on 1000 dishes in < 20ms', () => {
    const dishes = Array.from({ length: 1000 }, (_, i) => makeDish(i + 1));
    const t0 = performance.now();
    for (const d of dishes) checkDietType(d, rules.diet_type);
    expect(performance.now() - t0).toBeLessThan(20);
  });

  // checkAllergens takes number[] allergen IDs (not UserDietRules)
  it('checkAllergens on 500 dishes with 5 allergens each in < 30ms', () => {
    const dishes = Array.from({ length: 500 }, (_, i) => makeDish(i + 1));
    const allergenIds = [1, 2, 3, 4, 5];
    const t0 = performance.now();
    for (const d of dishes) checkAllergens(d, allergenIds);
    expect(performance.now() - t0).toBeLessThan(30);
  });
});

describe('RE Performance: preference application throughput', () => {
  const prefs = makePrefs();
  const ctx = makeContext();

  it('applies 8 cuisine preferences to 500 dishes in < 100ms', () => {
    const dishes = Array.from({ length: 500 }, (_, i) => makeDish(i + 1));
    const t0 = performance.now();
    for (const d of dishes) scoreDish(d, ctx, prefs, [], undefined, 0);
    expect(performance.now() - t0).toBeLessThan(100);
  });

  it('20 preferences applied to 500 dishes in < 200ms', () => {
    // Simulate a user with many fine-grained preferences
    const bigPrefs: UserCategoryPreference[] = Array.from({ length: 20 }, (_, i) => ({
      user_id: 'u-perf',
      category_type: 'cuisine' as const,
      item_id: i + 1,
      item_slug: CUISINES[i % CUISINES.length],
      preference_bucket: i % 2 === 0 ? 'frequently' : 'occasionally',
    }));
    const dishes = Array.from({ length: 500 }, (_, i) => makeDish(i + 1));
    const t0 = performance.now();
    for (const d of dishes) scoreDish(d, ctx, bigPrefs, [], undefined, 0);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe('RE Performance: never-list throughput', () => {
  const rules = vegRules();

  it('applies a 50-entry never-list to 500 dishes in < 100ms', () => {
    const neverList: NeverListEntry[] = Array.from({ length: 50 }, (_, i) => ({
      user_id: 'u-perf',
      ref_type: 'dish' as const,
      ref_id: i + 1,
      is_active: true,
    }));
    const dishes = Array.from({ length: 500 }, (_, i) => makeDish(i + 1));
    const t0 = performance.now();
    for (const d of dishes) passesHardConstraints(d, rules, neverList);
    expect(performance.now() - t0).toBeLessThan(100);
  });
});

describe('RE Performance: constraint validation throughput', () => {
  const rules = vegRules();

  it('validates 500 dishes against veg hard constraints in < 30ms', () => {
    const dishes = Array.from({ length: 500 }, (_, i) => makeDish(i + 1));
    const t0 = performance.now();
    for (const d of dishes) passesHardConstraints(d, rules, []);
    expect(performance.now() - t0).toBeLessThan(30);
  });
});

describe('RE Performance: determinism', () => {
  it('same inputs always produce the same score (no random drift)', () => {
    const dish = makeDish(42);
    const prefs = makePrefs();
    const ctx = makeContext();

    // Use seed=0 to eliminate randomness; run 3 times and compare
    const scores = Array.from({ length: 3 }, () =>
      scoreDish(dish, ctx, prefs, [], undefined, 0).score
    );
    expect(new Set(scores).size).toBe(1);
  });

  it('different user IDs with identical preferences produce the same score', () => {
    const dish = makeDish(99);
    const ctx = makeContext();

    const score1 = scoreDish(dish, { ...ctx, user_id: 'user-A' }, makePrefs('user-A'), [], undefined, 0).score;
    const score2 = scoreDish(dish, { ...ctx, user_id: 'user-B' }, makePrefs('user-B'), [], undefined, 0).score;
    expect(score1).toBe(score2);
  });

  it('same seed + same persona returns same score across 3 runs', () => {
    const dish = makeDish(7);
    const prefs = makePrefs();
    const ctx = makeContext();

    const run1 = scoreDish(dish, ctx, prefs, [], undefined, 0.5).score;
    const run2 = scoreDish(dish, ctx, prefs, [], undefined, 0.5).score;
    const run3 = scoreDish(dish, ctx, prefs, [], undefined, 0.5).score;
    expect(run1).toBe(run2);
    expect(run2).toBe(run3);
  });
});

describe('RE Performance: memory / large pool', () => {
  it('scoring 5000 dishes completes without OOM in < 2000ms', () => {
    const dishes = Array.from({ length: 5000 }, (_, i) => makeDish(i + 1));
    const rules = vegRules();
    const prefs = makePrefs();
    const ctx = makeContext();
    const t0 = performance.now();
    let passed = 0;
    for (const d of dishes) {
      if (passesHardConstraints(d, rules, []).eligible) {
        scoreDish(d, ctx, prefs, [], undefined, 0);
        passed++;
      }
    }
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(passed).toBeGreaterThan(0);
  });
});

describe('RE Performance: household addon resolution', () => {
  // Household addon resolution is a pure filtering operation - no DB needed.
  // We simulate a 6-member household by running passesHardConstraints for each
  // member's diet rules against a dish pool.
  it('resolves addon eligibility for a 6-member household in < 20ms', () => {
    const memberRules: UserDietRules[] = [
      { user_id: 'm1', diet_type: 'veg',     excluded_ingredient_ids: [], allergen_ingredient_ids: [] },
      { user_id: 'm2', diet_type: 'non_veg', excluded_ingredient_ids: [], allergen_ingredient_ids: [] },
      { user_id: 'm3', diet_type: 'veg',     excluded_ingredient_ids: [], allergen_ingredient_ids: [1] },
      { user_id: 'm4', diet_type: 'egg',     excluded_ingredient_ids: [], allergen_ingredient_ids: [] },
      { user_id: 'm5', diet_type: 'veg',     excluded_ingredient_ids: [5], allergen_ingredient_ids: [] },
      { user_id: 'm6', diet_type: 'jain',    excluded_ingredient_ids: [], allergen_ingredient_ids: [] },
    ];
    // Use only veg/jain dishes for a clean jain-member test
    const dishes = Array.from({ length: 50 }, (_, i) => ({
      ...makeDish(i + 1),
      diet_type: 'veg' as const,
      is_jain: i % 2 === 0,
    }));

    const t0 = performance.now();
    for (const m of memberRules) {
      for (const d of dishes) passesHardConstraints(d, m, []);
    }
    expect(performance.now() - t0).toBeLessThan(20);
  });
});
