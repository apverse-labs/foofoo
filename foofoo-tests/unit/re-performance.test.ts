/**
 * re-performance.test.ts
 *
 * QA Layer 6 — Pure-function performance benchmarks for the RE scoring pipeline.
 * No DB, no network. All timings are wall-clock via Date.now().
 *
 * Thresholds are 3–5× the expected fast-path to avoid CI flakiness on shared
 * runners. Goal: catch O(n²) regressions, not micro-optimise.
 *
 * Run: npx jest --testPathPattern='unit/re-performance' --no-coverage
 */

import {
  passesHardConstraints,
  checkDietType,
  checkAllergens,
  scoreDish,
  SCORE_MIN,
  SCORE_MAX,
} from '../lib/re-engine';
import type {
  Dish,
  UserDietRules,
  UserCategoryPreference,
  REContext,
  NeverListEntry,
  SuggestionLog,
} from '../lib/types';

jest.setTimeout(10000);

// ─── Factories ────────────────────────────────────────────────────────────────

const CUISINES = [
  'north_indian', 'south_indian', 'east_indian', 'west_indian',
  'street_food', 'continental', 'chinese', 'desserts',
];

const FIXED_DATE = new Date('2026-06-14T12:00:00');

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

function makeVegDish(id: number): Dish {
  return { ...makeDish(id), diet_type: 'veg' };
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
    preference_bucket: (i % 3 === 0 ? 'frequently' : i % 3 === 1 ? 'occasionally' : 'never') as
      'frequently' | 'occasionally' | 'never',
  }));
}

function makeCtx(slot: 'breakfast' | 'lunch' | 'dinner' = 'lunch'): REContext {
  return { user_id: 'u-perf', meal_slot: slot, date: FIXED_DATE };
}

// ─── Scoring throughput ───────────────────────────────────────────────────────

describe('RE Performance: scoring throughput', () => {
  const prefs = makePrefs();
  const ctx = makeCtx();

  it('scores 100 veg dishes in < 50ms', () => {
    const dishes = Array.from({ length: 100 }, (_, i) => makeVegDish(i + 1));
    const t0 = Date.now();
    for (const d of dishes) scoreDish(d, ctx, prefs, [], undefined, 0);
    expect(Date.now() - t0).toBeLessThan(50);
  });

  it('scores 1000 veg dishes in < 500ms', () => {
    const dishes = Array.from({ length: 1000 }, (_, i) => makeVegDish(i + 1));
    const t0 = Date.now();
    for (const d of dishes) scoreDish(d, ctx, prefs, [], undefined, 0);
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it('produced scores stay within [SCORE_MIN, SCORE_MAX]', () => {
    const dishes = Array.from({ length: 200 }, (_, i) => makeVegDish(i + 1));
    for (const d of dishes) {
      const result = scoreDish(d, ctx, prefs, [], undefined, 0);
      const score = typeof result === 'number' ? result : result.score;
      expect(score).toBeGreaterThanOrEqual(SCORE_MIN);
      expect(score).toBeLessThanOrEqual(SCORE_MAX);
    }
  });
});

// ─── Hard constraint filtering ────────────────────────────────────────────────

describe('RE Performance: hard constraint filtering', () => {
  const rules = vegRules();

  it('filters 500 dishes via passesHardConstraints in < 30ms', () => {
    const dishes = Array.from({ length: 500 }, (_, i) => makeDish(i + 1));
    const t0 = Date.now();
    for (const d of dishes) passesHardConstraints(d, rules, []);
    expect(Date.now() - t0).toBeLessThan(30);
  });

  it('checkDietType on 1000 dishes in < 20ms', () => {
    const dishes = Array.from({ length: 1000 }, (_, i) => makeDish(i + 1));
    const t0 = Date.now();
    for (const d of dishes) checkDietType(d, 'veg');
    expect(Date.now() - t0).toBeLessThan(20);
  });

  it('checkAllergens on 500 dishes with 5-element allergen list in < 30ms', () => {
    const dishes = Array.from({ length: 500 }, (_, i) => makeDish(i + 1));
    const t0 = Date.now();
    for (const d of dishes) checkAllergens(d, [1, 2, 3, 4, 5]);
    expect(Date.now() - t0).toBeLessThan(30);
  });
});

// ─── Preference application ───────────────────────────────────────────────────

describe('RE Performance: preference application throughput', () => {
  const ctx = makeCtx();

  it('8 cuisine prefs applied to 500 veg dishes in < 100ms', () => {
    const prefs = makePrefs();
    const dishes = Array.from({ length: 500 }, (_, i) => makeVegDish(i + 1));
    const t0 = Date.now();
    for (const d of dishes) scoreDish(d, ctx, prefs, [], undefined, 0);
    expect(Date.now() - t0).toBeLessThan(100);
  });

  it('20 preferences applied to 500 veg dishes in < 200ms', () => {
    const bigPrefs: UserCategoryPreference[] = Array.from({ length: 20 }, (_, i) => ({
      user_id: 'u-perf',
      category_type: 'cuisine' as const,
      item_id: i + 1,
      item_slug: CUISINES[i % CUISINES.length],
      preference_bucket: (i % 2 === 0 ? 'frequently' : 'occasionally') as 'frequently' | 'occasionally',
    }));
    const dishes = Array.from({ length: 500 }, (_, i) => makeVegDish(i + 1));
    const t0 = Date.now();
    for (const d of dishes) scoreDish(d, ctx, bigPrefs, [], undefined, 0);
    expect(Date.now() - t0).toBeLessThan(200);
  });
});

// ─── Never-list throughput ────────────────────────────────────────────────────

describe('RE Performance: never-list throughput', () => {
  it('50-entry never-list checked against 500 dishes in < 100ms', () => {
    const neverList: NeverListEntry[] = Array.from({ length: 50 }, (_, i) => ({
      user_id: 'u-perf',
      ref_type: 'dish' as const,
      ref_id: i + 1,
      is_active: true,
    }));
    const rules = vegRules();
    const dishes = Array.from({ length: 500 }, (_, i) => makeDish(i + 1));
    const t0 = Date.now();
    for (const d of dishes) passesHardConstraints(d, rules, neverList);
    expect(Date.now() - t0).toBeLessThan(100);
  });
});

// ─── Determinism ─────────────────────────────────────────────────────────────

describe('RE Performance: determinism', () => {
  it('same inputs with seed=0 produce identical scores across 5 runs', () => {
    const dish = makeVegDish(42);
    const prefs = makePrefs();
    const ctx = makeCtx();
    const scores = Array.from({ length: 5 }, () => {
      const r = scoreDish(dish, ctx, prefs, [], undefined, 0);
      return typeof r === 'number' ? r : r.score;
    });
    expect(new Set(scores).size).toBe(1);
  });

  it('same dish + context but different user_id produces same score (no user-id branching)', () => {
    const dish = makeVegDish(99);
    const prefs1 = makePrefs('user-A');
    const prefs2 = makePrefs('user-B');
    const ctx1: REContext = { user_id: 'user-A', meal_slot: 'lunch', date: FIXED_DATE };
    const ctx2: REContext = { user_id: 'user-B', meal_slot: 'lunch', date: FIXED_DATE };
    const r1 = scoreDish(dish, ctx1, prefs1, [], undefined, 0);
    const r2 = scoreDish(dish, ctx2, prefs2, [], undefined, 0);
    const s1 = typeof r1 === 'number' ? r1 : r1.score;
    const s2 = typeof r2 === 'number' ? r2 : r2.score;
    expect(s1).toBe(s2);
  });
});

// ─── Large pool / memory ──────────────────────────────────────────────────────

describe('RE Performance: large pool', () => {
  it('filter + score 5000 dishes completes in < 2000ms', () => {
    const dishes = Array.from({ length: 5000 }, (_, i) => makeDish(i + 1));
    const rules = vegRules();
    const prefs = makePrefs();
    const ctx = makeCtx();
    const t0 = Date.now();
    let passed = 0;
    for (const d of dishes) {
      const { eligible } = passesHardConstraints(d, rules, []);
      if (eligible) {
        scoreDish(d, ctx, prefs, [], undefined, 0);
        passed++;
      }
    }
    expect(Date.now() - t0).toBeLessThan(2000);
    // At least 1/3 of veg dishes should pass (most dishes are veg in mock data)
    expect(passed).toBeGreaterThan(1000);
  });
});
