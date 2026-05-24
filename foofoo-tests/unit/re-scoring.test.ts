// unit/re-scoring.test.ts
// Tests the RE scoring pipeline against mock data
// Spec: Doc #10 v3 — Section 5, 6, 8

import {
  passesHardConstraints,
  checkDietType,
  scoreDish,
  isValidScore,
  WEIGHTS,
  SCORE_MIN,
  SCORE_MAX,
} from '../lib/re-engine';
import type {
  Dish,
  UserDietRules,
  UserCategoryPreference,
  SuggestionLog,
  REContext,
  NeverListEntry,
} from '../lib/types';

// ─── Mock data factories ──────────────────────────────────────────────────────

function mockDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 1,
    name: 'Test Dish',
    cuisine_id: 'south_indian',
    diet_type: 'veg',
    spice_level: 2,
    meal_types: ['breakfast'],
    ingredient_ids: [10, 20, 30],
    is_jain: false,
    allergens: [],
    regional_origin: 'KA',
    cook_time_mins: 20,
    is_active: true,
    ...overrides,
  };
}

function mockDietRules(overrides: Partial<UserDietRules> = {}): UserDietRules {
  return {
    user_id: 'user-001',
    diet_type: 'veg',
    excluded_ingredient_ids: [],
    allergen_ingredient_ids: [],
    ...overrides,
  };
}

function mockPreferences(
  cuisineSlug: string,
  bucket: 'frequently' | 'occasionally' | 'never'
): UserCategoryPreference[] {
  return [
    {
      user_id: 'user-001',
      category_type: 'cuisine',
      item_id: 1,
      item_slug: cuisineSlug,
      preference_bucket: bucket,
    },
  ];
}

function mockContext(overrides: Partial<REContext> = {}): REContext {
  return {
    user_id: 'user-001',
    meal_slot: 'breakfast',
    date: new Date('2026-05-19T08:00:00'), // Monday
    ...overrides,
  };
}

function mockLog(overrides: Partial<SuggestionLog> = {}): SuggestionLog {
  return {
    user_id: 'user-001',
    ref_type: 'dish',
    ref_id: 1,
    meal_slot: 'breakfast',
    carousel_position: 1,
    action: 'locked',
    action_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    ...overrides,
  };
}

// ─── Hard filter tests ────────────────────────────────────────────────────────

describe('RE Hard Filters', () => {
  describe('Diet type hard filter — Jain', () => {
    it('rejects non-Jain dish for Jain user', () => {
      const dish = mockDish({ is_jain: false });
      const rules = mockDietRules({ diet_type: 'jain' });
      const result = checkDietType(dish, 'jain');
      expect(result.pass).toBe(false);
    });

    it('allows Jain dish for Jain user', () => {
      const dish = mockDish({ is_jain: true, diet_type: 'veg' });
      const rules = mockDietRules({ diet_type: 'jain' });
      const result = checkDietType(dish, 'jain');
      expect(result.pass).toBe(true);
    });

    it('Jain user gets ZERO non-Jain dishes', () => {
      const dishes: Dish[] = [
        mockDish({ id: 1, is_jain: false }),
        mockDish({ id: 2, is_jain: true, diet_type: 'veg' }),
        mockDish({ id: 3, is_jain: false }),
        mockDish({ id: 4, is_jain: true, diet_type: 'veg' }),
      ];
      const rules = mockDietRules({ diet_type: 'jain', allergen_ingredient_ids: [], excluded_ingredient_ids: [] });

      const eligible = dishes.filter(
        d => passesHardConstraints(d, rules, []).eligible
      );
      expect(eligible.every(d => d.is_jain)).toBe(true);
      expect(eligible).toHaveLength(2);
    });
  });

  describe('Diet type hard filter — Veg', () => {
    it('rejects non_veg dish for veg user', () => {
      const result = checkDietType(mockDish({ diet_type: 'non_veg' }), 'veg');
      expect(result.pass).toBe(false);
    });

    it('allows veg, vegan, jain dishes for veg user', () => {
      expect(checkDietType(mockDish({ diet_type: 'veg' }), 'veg').pass).toBe(true);
      expect(checkDietType(mockDish({ diet_type: 'vegan' }), 'veg').pass).toBe(true);
      expect(checkDietType(mockDish({ diet_type: 'veg', is_jain: true }), 'veg').pass).toBe(true);
    });

    it('rejects egg dish for veg user', () => {
      const result = checkDietType(mockDish({ diet_type: 'egg' }), 'veg');
      expect(result.pass).toBe(false);
    });
  });

  describe('Diet type hard filter — Egg', () => {
    it('rejects non_veg (meat) dish for egg user', () => {
      const result = checkDietType(mockDish({ diet_type: 'non_veg' }), 'egg');
      expect(result.pass).toBe(false);
    });

    it('allows egg dish for egg user', () => {
      expect(checkDietType(mockDish({ diet_type: 'egg' }), 'egg').pass).toBe(true);
    });

    it('allows veg dish for egg user', () => {
      expect(checkDietType(mockDish({ diet_type: 'veg' }), 'egg').pass).toBe(true);
    });
  });

  describe('Diet type hard filter — Vegan', () => {
    it('rejects non-vegan dish for vegan user', () => {
      expect(checkDietType(mockDish({ diet_type: 'veg' }), 'vegan').pass).toBe(false);
      expect(checkDietType(mockDish({ diet_type: 'non_veg' }), 'vegan').pass).toBe(false);
      expect(checkDietType(mockDish({ diet_type: 'egg' }), 'vegan').pass).toBe(false);
    });

    it('allows vegan dish for vegan user', () => {
      expect(checkDietType(mockDish({ diet_type: 'vegan' }), 'vegan').pass).toBe(true);
    });
  });

  describe('Allergen hard filter', () => {
    it('rejects dish containing declared allergen', () => {
      const dish = mockDish({ ingredient_ids: [101, 200, 300] }); // 101 = peanut
      const rules = mockDietRules({ allergen_ingredient_ids: [101] }); // user allergic to ingredient 101
      const result = passesHardConstraints(dish, rules, []);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Allergen violation');
    });

    it('allows dish with no allergen ingredients', () => {
      const dish = mockDish({ ingredient_ids: [200, 300, 400] });
      const rules = mockDietRules({ allergen_ingredient_ids: [101] });
      const result = passesHardConstraints(dish, rules, []);
      expect(result.eligible).toBe(true);
    });

    it('user with zero allergens: all dishes pass allergen check', () => {
      const dish = mockDish({ ingredient_ids: [101, 102, 103] });
      const rules = mockDietRules({ allergen_ingredient_ids: [] });
      const result = passesHardConstraints(dish, rules, []);
      expect(result.eligible).toBe(true);
    });
  });

  describe('Never list hard filter', () => {
    it('rejects dish on active never list', () => {
      const dish = mockDish({ id: 42 });
      const rules = mockDietRules();
      const neverList: NeverListEntry[] = [
        { user_id: 'user-001', ref_type: 'dish', ref_id: 42, is_active: true }
      ];
      const result = passesHardConstraints(dish, rules, neverList);
      expect(result.eligible).toBe(false);
    });

    it('inactive never list entry does NOT block dish', () => {
      const dish = mockDish({ id: 42 });
      const rules = mockDietRules();
      const neverList: NeverListEntry[] = [
        { user_id: 'user-001', ref_type: 'dish', ref_id: 42, is_active: false }
      ];
      const result = passesHardConstraints(dish, rules, neverList);
      expect(result.eligible).toBe(true);
    });
  });
});

// ─── Soft score tests ─────────────────────────────────────────────────────────

describe('RE Soft Scores', () => {
  it('Frequently cuisine bucket adds +0.3 to score', () => {
    const dish = mockDish({ cuisine_id: 'south_indian' });
    const prefs = mockPreferences('south_indian', 'frequently');
    const scored = scoreDish(dish, mockContext(), prefs, [], undefined, 0);
    expect(scored.score_breakdown.cuisine_pref).toBe(WEIGHTS.cuisine_frequently);
    expect(scored.score_breakdown.cuisine_pref).toBe(0.3);
  });

  it('Occasionally cuisine bucket adds +0.1', () => {
    const dish = mockDish({ cuisine_id: 'north_indian' });
    const prefs = mockPreferences('north_indian', 'occasionally');
    const scored = scoreDish(dish, mockContext(), prefs, [], undefined, 0);
    expect(scored.score_breakdown.cuisine_pref).toBe(WEIGHTS.cuisine_occasionally);
    expect(scored.score_breakdown.cuisine_pref).toBe(0.1);
  });

  it('Frequently scores 0.3 higher than Occasionally (same seed)', () => {
    const dishA = mockDish({ id: 1, cuisine_id: 'south_indian' });
    const dishB = mockDish({ id: 2, cuisine_id: 'north_indian' });
    const prefsA = mockPreferences('south_indian', 'frequently');
    const prefsB = mockPreferences('north_indian', 'occasionally');
    const context = mockContext();

    const scoreA = scoreDish(dishA, context, prefsA, [], undefined, 0).score;
    const scoreB = scoreDish(dishB, context, prefsB, [], undefined, 0).score;

    expect(scoreA - scoreB).toBeCloseTo(0.2, 5); // 0.3 - 0.1 = 0.2
  });

  it('Weather match adds +0.2', () => {
    const dish = mockDish({ spice_level: 2, cook_time_mins: 20 }); // light, quick
    const context = mockContext({
      weather: { temperature_c: 38, humidity_percent: 60, condition: 'sunny' } // hot
    });
    const scored = scoreDish(dish, context, [], [], undefined, 0);
    expect(scored.score_breakdown.weather).toBe(WEIGHTS.weather_match);
    expect(scored.score_breakdown.weather).toBe(0.2);
  });

  it('Home state match adds +0.1', () => {
    const dish = mockDish({ regional_origin: 'KA' });
    const context = mockContext({ home_state: 'KA' });
    const scored = scoreDish(dish, context, [], [], undefined, 0);
    expect(scored.score_breakdown.home_state).toBe(WEIGHTS.home_state);
    expect(scored.score_breakdown.home_state).toBe(0.1);
  });

  it('No home state match: 0 bonus', () => {
    const dish = mockDish({ regional_origin: 'TN' });
    const context = mockContext({ home_state: 'KA' });
    const scored = scoreDish(dish, context, [], [], undefined, 0);
    expect(scored.score_breakdown.home_state).toBe(0);
  });
});

// ─── Score range tests ────────────────────────────────────────────────────────

describe('RE Score Range', () => {
  it('all scored dishes have scores between 0.3 and 2.5', () => {
    const dishes = Array.from({ length: 20 }, (_, i) =>
      mockDish({ id: i, spice_level: ((i % 4) + 1) as 1 | 2 | 3 | 4 })
    );
    const context = mockContext();

    for (const dish of dishes) {
      const scored = scoreDish(dish, context, [], []);
      expect(isValidScore(scored.score)).toBe(true);
      expect(scored.score).toBeGreaterThanOrEqual(SCORE_MIN);
      expect(scored.score).toBeLessThanOrEqual(SCORE_MAX);
    }
  });

  it('score formula: base(1.0) + boosts stays within range', () => {
    // Max possible: 1.0 + 0.3 + 0.25 + 0.2 + 0.15 + 0.1 + 0.3 + 0.15 = 2.45, capped at 2.5
    const dish = mockDish({
      cuisine_id: 'south_indian',
      regional_origin: 'KA',
      cook_time_mins: 45,
      spice_level: 2,
    });
    const prefs = mockPreferences('south_indian', 'frequently');
    const context = mockContext({
      home_state: 'KA',
      date: new Date('2026-05-23T08:00:00'), // Saturday
      weather: { temperature_c: 38, humidity_percent: 60, condition: 'sunny' },
    });
    const history = [
      mockLog({ action: 'locked' }),
      mockLog({ action: 'locked' }),
      mockLog({ action: 'locked' }),
    ];
    const scored = scoreDish(dish, context, prefs, history, undefined, 1.0); // seed=1.0 for max random
    expect(scored.score).toBeLessThanOrEqual(SCORE_MAX);
    expect(scored.score).toBeGreaterThanOrEqual(SCORE_MIN);
  });
});

// ─── Randomization tests ──────────────────────────────────────────────────────

describe('RE Randomization', () => {
  it('random factor is between 0 and 0.15', () => {
    const dish = mockDish();
    const context = mockContext();
    // Run 20 times with real random
    for (let i = 0; i < 20; i++) {
      const scored = scoreDish(dish, context, [], []);
      expect(scored.score_breakdown.random).toBeGreaterThanOrEqual(0);
      expect(scored.score_breakdown.random).toBeLessThanOrEqual(WEIGHTS.random_max);
    }
  });

  it('two identical dishes get different scores due to randomization', () => {
    const dish = mockDish();
    const context = mockContext();
    const scores = Array.from({ length: 10 }, () =>
      scoreDish(dish, context, [], []).score
    );
    const uniqueScores = new Set(scores);
    // With randomization, we expect at least some variation (very unlikely all same)
    expect(uniqueScores.size).toBeGreaterThan(1);
  });
});
