/**
 * re-constraint-validator.test.ts
 *
 * QA Layer 4 — Hard Constraint Validator unit tests.
 *
 * Tests the hard-constraint layer of the RE: diet-type NEVER violations
 * (persona-level: beef/pork exclusions), allergen conflict detection,
 * calorie boundary checks, and the 0-violations gate logic.
 * All tests are pure function tests — no DB, no network.
 *
 * Run: npm run test:unit:re
 * Depends on: lib/re-engine.ts, lib/types.ts
 * Doc refs: Doc 10 v3 §5 (Hard Filters), Doc 11A v4 (schema)
 */

import {
  passesHardConstraints,
  checkDietType,
  checkAllergens,
  checkExclusions,
  checkNeverList,
} from '../lib/re-engine';
import type {
  Dish,
  DietType,
  UserDietRules,
  NeverListEntry,
} from '../lib/types';

// ─── Mock factories ───────────────────────────────────────────────────────────

function mockDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 1,
    name: 'Test Dish',
    cuisine_id: 'north_indian',
    diet_type: 'veg',
    spice_level: 2,
    meal_types: ['lunch'],
    ingredient_ids: [],
    is_jain: false,
    allergens: [],
    regional_origin: 'DL',
    cook_time_mins: 25,
    is_active: true,
    ...overrides,
  };
}

function mockRules(overrides: Partial<UserDietRules> = {}): UserDietRules {
  return {
    user_id: 'user-cv-001',
    diet_type: 'veg',
    excluded_ingredient_ids: [],
    allergen_ingredient_ids: [],
    ...overrides,
  };
}

// Ingredient ID constants (mirroring common test fixtures)
const BEEF_ING_ID = 501;
const PORK_ING_ID = 502;
const CHICKEN_ING_ID = 503;
const PEANUT_ING_ID = 101;
const GLUTEN_ING_ID = 102;
const DAIRY_ING_ID = 103;
const SHELLFISH_ING_ID = 104;
const ONION_ING_ID = 201; // excluded by Jain
const GARLIC_ING_ID = 202; // excluded by Jain

// ─── Diet type NEVER rules (persona-level) ────────────────────────────────────

describe('Hard Constraint: Diet type NEVER violations', () => {
  describe('Hindu persona — beef never allowed', () => {
    it('veg user: beef ingredient triggers exclusion', () => {
      // Hindu veg user — beef should be excluded via excluded_ingredient_ids
      const dish = mockDish({ diet_type: 'non_veg', ingredient_ids: [BEEF_ING_ID, 300] });
      const rules = mockRules({
        diet_type: 'non_veg',
        excluded_ingredient_ids: [BEEF_ING_ID],
      });
      const result = passesHardConstraints(dish, rules, []);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Exclusion violation');
    });

    it('non_veg Hindu user: chicken is allowed (no beef exclusion for chicken)', () => {
      const dish = mockDish({ diet_type: 'non_veg', ingredient_ids: [CHICKEN_ING_ID, 300] });
      const rules = mockRules({
        diet_type: 'non_veg',
        excluded_ingredient_ids: [BEEF_ING_ID], // only beef excluded
      });
      const result = passesHardConstraints(dish, rules, []);
      expect(result.eligible).toBe(true);
    });

    it('beef exclusion is enforced regardless of dish diet_type label', () => {
      // A dish labeled 'non_veg' still gets blocked if it contains beef ingredient
      const dish = mockDish({
        diet_type: 'non_veg',
        ingredient_ids: [BEEF_ING_ID],
        name: 'Beef Curry',
      });
      const rules = mockRules({
        diet_type: 'non_veg',
        excluded_ingredient_ids: [BEEF_ING_ID],
      });
      expect(passesHardConstraints(dish, rules, []).eligible).toBe(false);
    });

    it('dish without beef ingredient passes even with beef in exclusion list', () => {
      const dish = mockDish({ ingredient_ids: [CHICKEN_ING_ID, 300, 400] });
      const rules = mockRules({
        diet_type: 'non_veg',
        excluded_ingredient_ids: [BEEF_ING_ID],
      });
      expect(passesHardConstraints(dish, rules, []).eligible).toBe(true);
    });
  });

  describe('Muslim persona — pork never allowed', () => {
    it('non_veg Muslim user: pork ingredient triggers exclusion', () => {
      const dish = mockDish({ diet_type: 'non_veg', ingredient_ids: [PORK_ING_ID, 300] });
      const rules = mockRules({
        diet_type: 'non_veg',
        excluded_ingredient_ids: [PORK_ING_ID],
      });
      const result = passesHardConstraints(dish, rules, []);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Exclusion violation');
    });

    it('non_veg Muslim user: beef is allowed (pork exclusion only)', () => {
      const dish = mockDish({ diet_type: 'non_veg', ingredient_ids: [BEEF_ING_ID, 300] });
      const rules = mockRules({
        diet_type: 'non_veg',
        excluded_ingredient_ids: [PORK_ING_ID],
      });
      expect(passesHardConstraints(dish, rules, []).eligible).toBe(true);
    });

    it('multiple exclusions: both beef and pork excluded', () => {
      const beefDish = mockDish({ ingredient_ids: [BEEF_ING_ID] });
      const porkDish = mockDish({ ingredient_ids: [PORK_ING_ID] });
      const rules = mockRules({
        diet_type: 'non_veg',
        excluded_ingredient_ids: [BEEF_ING_ID, PORK_ING_ID],
      });
      expect(passesHardConstraints(beefDish, rules, []).eligible).toBe(false);
      expect(passesHardConstraints(porkDish, rules, []).eligible).toBe(false);
    });
  });

  describe('Jain persona — onion/garlic never allowed', () => {
    it('jain user rejects dish with onion ingredient', () => {
      const dish = mockDish({
        diet_type: 'veg',
        is_jain: true,
        ingredient_ids: [ONION_ING_ID, 300],
      });
      const rules = mockRules({
        diet_type: 'jain',
        excluded_ingredient_ids: [ONION_ING_ID, GARLIC_ING_ID],
      });
      const result = passesHardConstraints(dish, rules, []);
      expect(result.eligible).toBe(false);
    });

    it('jain user rejects dish with garlic ingredient', () => {
      const dish = mockDish({ ingredient_ids: [GARLIC_ING_ID, 300] });
      const rules = mockRules({
        diet_type: 'jain',
        excluded_ingredient_ids: [ONION_ING_ID, GARLIC_ING_ID],
      });
      expect(passesHardConstraints(dish, rules, []).eligible).toBe(false);
    });

    it('jain user: non-jain-flagged dish fails checkDietType', () => {
      const dish = mockDish({ is_jain: false, diet_type: 'veg' });
      expect(checkDietType(dish, 'jain').pass).toBe(false);
    });
  });

  describe('Veg persona — all non-veg NEVER allowed', () => {
    const nonVegDiets: DietType[] = ['non_veg', 'egg'];
    it.each(nonVegDiets)(
      'veg user: %s dish type fails hard constraint',
      (dt) => {
        const dish = mockDish({ diet_type: dt });
        const rules = mockRules({ diet_type: 'veg' });
        expect(passesHardConstraints(dish, rules, []).eligible).toBe(false);
      }
    );
  });
});

// ─── Allergen conflict detection ──────────────────────────────────────────────

describe('Hard Constraint: Allergen conflict detection', () => {
  it('single allergen: dish containing the allergen ingredient is blocked', () => {
    const dish = mockDish({ ingredient_ids: [PEANUT_ING_ID, 200, 300] });
    const rules = mockRules({ allergen_ingredient_ids: [PEANUT_ING_ID] });
    const result = checkAllergens(dish, rules.allergen_ingredient_ids);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Allergen violation');
    expect(result.reason).toContain(String(PEANUT_ING_ID));
  });

  it('multiple allergens: any single hit blocks the dish', () => {
    const dish = mockDish({ ingredient_ids: [300, GLUTEN_ING_ID, 400] });
    const rules = mockRules({
      allergen_ingredient_ids: [PEANUT_ING_ID, GLUTEN_ING_ID, DAIRY_ING_ID],
    });
    const result = checkAllergens(dish, rules.allergen_ingredient_ids);
    expect(result.pass).toBe(false);
  });

  it('dish with no allergen ingredients passes for allergic user', () => {
    const dish = mockDish({ ingredient_ids: [300, 400, 500] });
    const rules = mockRules({ allergen_ingredient_ids: [PEANUT_ING_ID] });
    expect(checkAllergens(dish, rules.allergen_ingredient_ids).pass).toBe(true);
  });

  it('user with no allergens: all dishes pass allergen check', () => {
    const dishes = [
      mockDish({ ingredient_ids: [PEANUT_ING_ID, GLUTEN_ING_ID] }),
      mockDish({ ingredient_ids: [SHELLFISH_ING_ID] }),
    ];
    for (const dish of dishes) {
      expect(checkAllergens(dish, []).pass).toBe(true);
    }
  });

  it('allergen error message contains the dish name', () => {
    const dish = mockDish({ name: 'Peanut Chaat', ingredient_ids: [PEANUT_ING_ID] });
    const result = checkAllergens(dish, [PEANUT_ING_ID]);
    expect(result.reason).toContain('Peanut Chaat');
  });

  it('allergen with a large ingredient list checks every ingredient', () => {
    // allergen is the last element — must be caught
    const allergenId = 9999;
    const ingredientIds = Array.from({ length: 50 }, (_, i) => i + 1000);
    ingredientIds.push(allergenId);
    const dish = mockDish({ ingredient_ids: ingredientIds });
    expect(checkAllergens(dish, [allergenId]).pass).toBe(false);
  });

  it('full passesHardConstraints: allergen blocks before exclusion check', () => {
    const dish = mockDish({
      ingredient_ids: [PEANUT_ING_ID, ONION_ING_ID],
      diet_type: 'veg',
    });
    const rules = mockRules({
      allergen_ingredient_ids: [PEANUT_ING_ID],
      excluded_ingredient_ids: [ONION_ING_ID],
    });
    const result = passesHardConstraints(dish, rules, []);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Allergen violation');
  });
});

// ─── Calorie boundary checks ──────────────────────────────────────────────────

describe('Hard Constraint: Calorie boundary checks', () => {
  /**
   * The RE does not have a hard calorie constraint — calories are used in
   * soft scoring (weather boost) only. These tests validate boundary semantics
   * as described in Doc 10 §6.5 thresholds.
   *
   * CALORIES_HEAVY = 400, CALORIES_LIGHT = 350 (from re-engine.ts THRESHOLDS)
   */

  it('calorie=400 is exactly at HEAVY threshold — not light (<350)', () => {
    // calories=400 → NOT isLight (400 >= 350), NOT isHeavy condition in range >400 check
    // Actually CALORIES_HEAVY = 400, so calories > 400 → isHeavy
    const heavyDish = mockDish({ calories: 401, spice_level: 2 });
    const borderDish = mockDish({ calories: 400, spice_level: 2 });
    // With hot weather and non-spicy dish — light (calories < 350) needed for boost
    // Neither dish qualifies — both have high calories
    // Just assert the RE doesn't crash with boundary values
    const { scoreDish } = require('../lib/re-engine');
    const context = {
      user_id: 'u1',
      meal_slot: 'lunch' as const,
      date: new Date('2026-06-09'),
      weather: { temperature_c: 36, humidity_percent: 40, condition: 'sunny' as const },
    };
    const heavyScored = scoreDish(heavyDish, context, [], [], undefined, 0);
    const borderScored = scoreDish(borderDish, context, [], [], undefined, 0);
    expect(heavyScored.score_breakdown.weather).toBe(0); // heavy non-spicy in hot = 0
    expect(borderScored.score_breakdown.weather).toBe(0);
  });

  it('calorie=349 is light — hot weather + non-spicy dish gets +0.15', () => {
    const { scoreDish: sd } = require('../lib/re-engine');
    const lightDish = mockDish({ calories: 349, spice_level: 2, cook_time_mins: 20 });
    const context = {
      user_id: 'u1',
      meal_slot: 'lunch' as const,
      date: new Date('2026-06-09'),
      weather: { temperature_c: 35, humidity_percent: 40, condition: 'sunny' as const },
    };
    const scored = sd(lightDish, context, [], [], undefined, 0);
    expect(scored.score_breakdown.weather).toBe(0.15);
  });

  it('calorie=undefined: no weather boost applies (graceful null handling)', () => {
    const { scoreDish: sd } = require('../lib/re-engine');
    const dish = mockDish({ calories: undefined, spice_level: 2 });
    const context = {
      user_id: 'u1',
      meal_slot: 'lunch' as const,
      date: new Date('2026-06-09'),
      weather: { temperature_c: 35, humidity_percent: 40, condition: 'sunny' as const },
    };
    const scored = sd(dish, context, [], [], undefined, 0);
    // Without calories, isLight = false → no hot weather boost for non-spicy dish
    expect(scored.score_breakdown.weather).toBe(0);
  });

  it('calorie=501 + spice_level=3 + cold weather earns +0.15 (cold+spicy)', () => {
    const { scoreDish: sd } = require('../lib/re-engine');
    const dish = mockDish({ calories: 501, spice_level: 3, cook_time_mins: 30 });
    const context = {
      user_id: 'u1',
      meal_slot: 'dinner' as const,
      date: new Date('2026-06-09'),
      weather: { temperature_c: 12, humidity_percent: 50, condition: 'cold' as const },
    };
    const scored = sd(dish, context, [], [], undefined, 0);
    expect(scored.score_breakdown.weather).toBe(0.15);
  });
});

// ─── 0-violations gate logic ──────────────────────────────────────────────────

describe('Hard Constraint: 0-violations gate logic', () => {
  /**
   * The gate rule: a dish may only be served if it passes ALL hard constraints.
   * One violation anywhere = ineligible. These tests verify the AND-gate property.
   */

  it('dish that fails diet type is ineligible even if no allergens or exclusions', () => {
    const dish = mockDish({ diet_type: 'non_veg', ingredient_ids: [] });
    const rules = mockRules({ diet_type: 'veg' });
    expect(passesHardConstraints(dish, rules, []).eligible).toBe(false);
  });

  it('dish that fails allergen is ineligible even if diet_type is compatible', () => {
    const dish = mockDish({ diet_type: 'veg', ingredient_ids: [PEANUT_ING_ID] });
    const rules = mockRules({ diet_type: 'veg', allergen_ingredient_ids: [PEANUT_ING_ID] });
    expect(passesHardConstraints(dish, rules, []).eligible).toBe(false);
  });

  it('dish that fails exclusion is ineligible even if diet_type and allergens pass', () => {
    const dish = mockDish({ diet_type: 'veg', ingredient_ids: [ONION_ING_ID] });
    const rules = mockRules({
      diet_type: 'veg',
      allergen_ingredient_ids: [],
      excluded_ingredient_ids: [ONION_ING_ID],
    });
    expect(passesHardConstraints(dish, rules, []).eligible).toBe(false);
  });

  it('dish on never list is ineligible even if all other constraints pass', () => {
    const dish = mockDish({ id: 77, diet_type: 'veg', ingredient_ids: [] });
    const rules = mockRules({ diet_type: 'veg' });
    const neverList: NeverListEntry[] = [
      { user_id: 'user-cv-001', ref_type: 'dish', ref_id: 77, is_active: true },
    ];
    expect(passesHardConstraints(dish, rules, neverList).eligible).toBe(false);
  });

  it('dish passing all constraints returns eligible=true with no reason', () => {
    const dish = mockDish({ diet_type: 'veg', ingredient_ids: [300, 400, 500], is_jain: false });
    const rules = mockRules({ diet_type: 'veg' });
    const result = passesHardConstraints(dish, rules, []);
    expect(result.eligible).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('gate is strict: all 4 constraints must pass simultaneously', () => {
    // dish that satisfies diet & allergen & exclusion & never list → eligible
    const dish = mockDish({ id: 99, diet_type: 'veg', ingredient_ids: [300] });
    const rules = mockRules({
      diet_type: 'veg',
      allergen_ingredient_ids: [PEANUT_ING_ID], // peanut not in dish
      excluded_ingredient_ids: [ONION_ING_ID],  // onion not in dish
    });
    const neverList: NeverListEntry[] = [
      { user_id: 'user-cv-001', ref_type: 'dish', ref_id: 100, is_active: true }, // different id
    ];
    expect(passesHardConstraints(dish, rules, neverList).eligible).toBe(true);
  });

  it('zero-violation pool: 10 safe dishes all pass, 3 blocked dishes all fail', () => {
    const safeDishes = Array.from({ length: 10 }, (_, i) =>
      mockDish({ id: i + 100, diet_type: 'veg', ingredient_ids: [300 + i] })
    );
    const blockedDishes: Dish[] = [
      mockDish({ id: 200, diet_type: 'non_veg' }),
      mockDish({ id: 201, diet_type: 'veg', ingredient_ids: [PEANUT_ING_ID] }),
      mockDish({ id: 202, diet_type: 'veg', ingredient_ids: [ONION_ING_ID] }),
    ];
    const rules = mockRules({
      diet_type: 'veg',
      allergen_ingredient_ids: [PEANUT_ING_ID],
      excluded_ingredient_ids: [ONION_ING_ID],
    });
    const neverList: NeverListEntry[] = [];

    const safeResults = safeDishes.map(d => passesHardConstraints(d, rules, neverList));
    const blockedResults = blockedDishes.map(d => passesHardConstraints(d, rules, neverList));

    expect(safeResults.every(r => r.eligible)).toBe(true);
    expect(blockedResults.every(r => !r.eligible)).toBe(true);
    expect(blockedResults.filter(r => !r.eligible)).toHaveLength(3);
  });

  it('inactive never list entry does not contribute to violations', () => {
    const dish = mockDish({ id: 55 });
    const rules = mockRules();
    const neverList: NeverListEntry[] = [
      { user_id: 'user-cv-001', ref_type: 'dish', ref_id: 55, is_active: false },
    ];
    expect(passesHardConstraints(dish, rules, neverList).eligible).toBe(true);
  });

  it('never list entry for combo type does not block a dish with the same id', () => {
    const dish = mockDish({ id: 55 });
    const rules = mockRules();
    const neverList: NeverListEntry[] = [
      { user_id: 'user-cv-001', ref_type: 'combo', ref_id: 55, is_active: true },
    ];
    expect(passesHardConstraints(dish, rules, neverList).eligible).toBe(true);
  });

  it('reason string is present on every type of constraint failure', () => {
    const cases: Array<{ dish: Dish; rules: UserDietRules; never: NeverListEntry[] }> = [
      {
        dish: mockDish({ diet_type: 'non_veg' }),
        rules: mockRules({ diet_type: 'veg' }),
        never: [],
      },
      {
        dish: mockDish({ ingredient_ids: [PEANUT_ING_ID] }),
        rules: mockRules({ allergen_ingredient_ids: [PEANUT_ING_ID] }),
        never: [],
      },
      {
        dish: mockDish({ ingredient_ids: [ONION_ING_ID] }),
        rules: mockRules({ excluded_ingredient_ids: [ONION_ING_ID] }),
        never: [],
      },
      {
        dish: mockDish({ id: 33 }),
        rules: mockRules(),
        never: [{ user_id: 'user-cv-001', ref_type: 'dish', ref_id: 33, is_active: true }],
      },
    ];

    for (const c of cases) {
      const result = passesHardConstraints(c.dish, c.rules, c.never);
      expect(result.eligible).toBe(false);
      expect(typeof result.reason).toBe('string');
      expect((result.reason as string).length).toBeGreaterThan(0);
    }
  });
});
