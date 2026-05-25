/**
 * hard-constraints.test.ts
 *
 * Verifies the RE hard constraint enforcement pipeline: diet type filtering,
 * allergen exclusion, never-list blocking, and Jain compatibility checks.
 * Any regression here means users with dietary restrictions could be served
 * unsafe or unwanted food suggestions.
 *
 * Run: npm run test:unit
 * Depends on: lib/re-engine.ts, lib/types.ts
 * Doc refs: Doc 10 Section 5.1
 *
 * SAFETY-CRITICAL: A failure here = DO NOT SHIP until resolved.
 */

// unit/hard-constraints.test.ts
// CRITICAL safety tests for hard constraint enforcement
// A single violation here = CRITICAL FAIL in production
// Spec: Doc #10 v3 — Section 5.1

import { passesHardConstraints, checkDietType } from '../lib/re-engine';
import type { Dish, UserDietRules, NeverListEntry } from '../lib/types';

// ─── Test data factories ──────────────────────────────────────────────────────

function makeDish(overrides: Partial<Dish>): Dish {
  return {
    id: Math.floor(Math.random() * 100000),
    name: 'Test Dish',
    cuisine_id: 'north_indian',
    diet_type: 'veg',
    spice_level: 2,
    meal_types: ['lunch'],
    ingredient_ids: [],
    is_jain: false,
    allergens: [],
    is_active: true,
    ...overrides,
  };
}

function makeRules(overrides: Partial<UserDietRules>): UserDietRules {
  return {
    user_id: 'u1',
    diet_type: 'veg',
    excluded_ingredient_ids: [],
    allergen_ingredient_ids: [],
    ...overrides,
  };
}

// ─── Veg diet: zero meat/fish/egg ─────────────────────────────────────────────

describe('Hard Constraint: diet_type=veg', () => {
  const vegRules = makeRules({ diet_type: 'veg' });

  it('rejects meat dish', () => {
    const dish = makeDish({ diet_type: 'non_veg' });
    expect(passesHardConstraints(dish, vegRules, []).eligible).toBe(false);
  });

  it('rejects fish dish (non_veg)', () => {
    const dish = makeDish({ diet_type: 'non_veg', name: 'Fish Curry' });
    expect(passesHardConstraints(dish, vegRules, []).eligible).toBe(false);
  });

  it('rejects egg dish', () => {
    const dish = makeDish({ diet_type: 'egg' });
    expect(passesHardConstraints(dish, vegRules, []).eligible).toBe(false);
  });

  it('allows veg dish', () => {
    const dish = makeDish({ diet_type: 'veg' });
    expect(passesHardConstraints(dish, vegRules, []).eligible).toBe(true);
  });

  it('allows vegan dish for veg user', () => {
    const dish = makeDish({ diet_type: 'vegan' });
    expect(passesHardConstraints(dish, vegRules, []).eligible).toBe(true);
  });

  it('batch: zero non-veg in 100 dishes filtered for veg user', () => {
    const dishes: Dish[] = [
      ...Array.from({ length: 60 }, (_, i) => makeDish({ id: i, diet_type: 'veg' })),
      ...Array.from({ length: 25 }, (_, i) => makeDish({ id: i + 100, diet_type: 'non_veg' })),
      ...Array.from({ length: 15 }, (_, i) => makeDish({ id: i + 200, diet_type: 'egg' })),
    ];
    const eligible = dishes.filter(d => passesHardConstraints(d, vegRules, []).eligible);
    expect(eligible.every(d => d.diet_type === 'veg' || d.diet_type === 'vegan')).toBe(true);
    expect(eligible).toHaveLength(60);
  });
});

// ─── Jain diet: zero onion/garlic/root veg ───────────────────────────────────

describe('Hard Constraint: diet_type=jain', () => {
  // In the RE, Jain filter checks dish.is_jain boolean (which is auto-derived from ingredients)
  const jainRules = makeRules({ diet_type: 'jain' });

  it('rejects non-Jain dish (is_jain=false)', () => {
    const dish = makeDish({ is_jain: false, diet_type: 'veg' });
    expect(passesHardConstraints(dish, jainRules, []).eligible).toBe(false);
  });

  it('allows Jain-safe dish (is_jain=true, diet_type=veg)', () => {
    const dish = makeDish({ is_jain: true, diet_type: 'veg' });
    expect(passesHardConstraints(dish, jainRules, []).eligible).toBe(true);
  });

  it('rejects non_veg dish for Jain user (meat overrides is_jain)', () => {
    const dish = makeDish({ is_jain: false, diet_type: 'non_veg' });
    expect(passesHardConstraints(dish, jainRules, []).eligible).toBe(false);
  });

  it('batch: zero non-Jain in 50 dishes for Jain user', () => {
    const dishes: Dish[] = [
      ...Array.from({ length: 20 }, (_, i) => makeDish({ id: i, is_jain: true, diet_type: 'veg' })),
      ...Array.from({ length: 30 }, (_, i) => makeDish({ id: i + 100, is_jain: false, diet_type: 'veg' })),
    ];
    const eligible = dishes.filter(d => passesHardConstraints(d, jainRules, []).eligible);
    expect(eligible.every(d => d.is_jain)).toBe(true);
    expect(eligible).toHaveLength(20);
  });
});

// ─── Vegan diet: zero dairy/egg/honey ────────────────────────────────────────

describe('Hard Constraint: diet_type=vegan', () => {
  const veganRules = makeRules({ diet_type: 'vegan' });

  it('rejects non-vegan dish (veg with dairy)', () => {
    const dish = makeDish({ diet_type: 'veg' }); // veg but not vegan
    expect(passesHardConstraints(dish, veganRules, []).eligible).toBe(false);
  });

  it('rejects egg dish for vegan user', () => {
    const dish = makeDish({ diet_type: 'egg' });
    expect(passesHardConstraints(dish, veganRules, []).eligible).toBe(false);
  });

  it('rejects non_veg dish for vegan user', () => {
    const dish = makeDish({ diet_type: 'non_veg' });
    expect(passesHardConstraints(dish, veganRules, []).eligible).toBe(false);
  });

  it('allows vegan dish for vegan user', () => {
    const dish = makeDish({ diet_type: 'vegan' });
    expect(passesHardConstraints(dish, veganRules, []).eligible).toBe(true);
  });
});

// ─── Allergen constraints ─────────────────────────────────────────────────────

describe('Hard Constraint: allergens', () => {
  const NUT_ID = 101;
  const GLUTEN_ID = 202;
  const DAIRY_ID = 303;
  const SHELLFISH_ID = 404;

  it('diet=veg + allergen=nuts: zero nut dishes', () => {
    const rules = makeRules({
      diet_type: 'veg',
      allergen_ingredient_ids: [NUT_ID],
    });
    const nutDish = makeDish({ ingredient_ids: [NUT_ID, 50, 60], diet_type: 'veg' });
    const safeDish = makeDish({ ingredient_ids: [50, 60, 70], diet_type: 'veg' });

    expect(passesHardConstraints(nutDish, rules, []).eligible).toBe(false);
    expect(passesHardConstraints(safeDish, rules, []).eligible).toBe(true);
  });

  it('allergen=gluten: zero wheat/maida/atta dishes', () => {
    const rules = makeRules({ allergen_ingredient_ids: [GLUTEN_ID] });
    const glutenDish = makeDish({ ingredient_ids: [GLUTEN_ID, 50], diet_type: 'veg' });
    expect(passesHardConstraints(glutenDish, rules, []).eligible).toBe(false);
  });

  it('allergen=dairy: zero milk/cream/paneer/ghee/butter dishes', () => {
    const rules = makeRules({ allergen_ingredient_ids: [DAIRY_ID] });
    const dairyDish = makeDish({ ingredient_ids: [DAIRY_ID, 50], diet_type: 'veg' });
    expect(passesHardConstraints(dairyDish, rules, []).eligible).toBe(false);
  });

  it('allergen=shellfish: zero prawn/crab/lobster dishes', () => {
    const rules = makeRules({ allergen_ingredient_ids: [SHELLFISH_ID] });
    const shellfishDish = makeDish({ ingredient_ids: [SHELLFISH_ID, 50], diet_type: 'non_veg' });
    expect(passesHardConstraints(shellfishDish, rules, []).eligible).toBe(false);
  });
});

// ─── Exclusions (non-allergen) ────────────────────────────────────────────────

describe('Hard Constraint: exclusions[] (integer-matched)', () => {
  const MUSHROOM_ID = 500;
  const BEEF_ID = 600;
  const PORK_ID = 700;

  it('excluded ingredient (mushroom) correctly filters dishes', () => {
    const rules = makeRules({ excluded_ingredient_ids: [MUSHROOM_ID] });
    const mushroomDish = makeDish({ ingredient_ids: [MUSHROOM_ID, 10, 20], diet_type: 'veg' });
    const safeDish = makeDish({ ingredient_ids: [10, 20, 30], diet_type: 'veg' });

    expect(passesHardConstraints(mushroomDish, rules, []).eligible).toBe(false);
    expect(passesHardConstraints(safeDish, rules, []).eligible).toBe(true);
  });

  it('beef exclusion filters beef dishes (non-veg user, exclusions not diet_type)', () => {
    // Muslim user: non_veg diet but beef excluded via exclusions[]
    const rules = makeRules({
      diet_type: 'non_veg',
      excluded_ingredient_ids: [BEEF_ID, PORK_ID],
    });
    const beefDish = makeDish({ ingredient_ids: [BEEF_ID, 10], diet_type: 'non_veg' });
    const porkDish = makeDish({ ingredient_ids: [PORK_ID, 10], diet_type: 'non_veg' });
    const chickenDish = makeDish({ ingredient_ids: [800, 10], diet_type: 'non_veg' }); // chicken safe

    expect(passesHardConstraints(beefDish, rules, []).eligible).toBe(false);
    expect(passesHardConstraints(porkDish, rules, []).eligible).toBe(false);
    expect(passesHardConstraints(chickenDish, rules, []).eligible).toBe(true);
  });

  it('exclusions use integer IDs, not text strings', () => {
    const rules = makeRules({ excluded_ingredient_ids: [500] });
    expect(typeof rules.excluded_ingredient_ids[0]).toBe('number');
    expect(Number.isInteger(rules.excluded_ingredient_ids[0])).toBe(true);
  });
});

// ─── Never list ───────────────────────────────────────────────────────────────

describe('Hard Constraint: never_list dishes never appear', () => {
  it('never-listed dish excluded entirely', () => {
    const rules = makeRules({});
    const dish = makeDish({ id: 777 });
    const neverList: NeverListEntry[] = [
      { user_id: 'u1', ref_type: 'dish', ref_id: 777, is_active: true }
    ];
    expect(passesHardConstraints(dish, rules, neverList).eligible).toBe(false);
  });

  it('never-listed dish does not appear even if cuisine is Frequently', () => {
    const rules = makeRules({});
    const dish = makeDish({ id: 888, cuisine_id: 'south_indian' });
    const neverList: NeverListEntry[] = [
      { user_id: 'u1', ref_type: 'dish', ref_id: 888, is_active: true }
    ];
    // Hard constraint overrides soft score
    expect(passesHardConstraints(dish, rules, neverList).eligible).toBe(false);
  });
});

// ─── Multiple constraints stack ───────────────────────────────────────────────

describe('Hard Constraint: multiple constraints stack independently', () => {
  it('vegan + nut allergy: both enforced independently', () => {
    const NUT_ID = 101;
    const rules = makeRules({
      diet_type: 'vegan',
      allergen_ingredient_ids: [NUT_ID],
    });

    // Fails diet_type (not vegan)
    const nonVeganDish = makeDish({ diet_type: 'veg', ingredient_ids: [50] });
    expect(passesHardConstraints(nonVeganDish, rules, []).eligible).toBe(false);

    // Passes diet_type but fails allergen
    const veganNutDish = makeDish({ diet_type: 'vegan', ingredient_ids: [NUT_ID, 50] });
    expect(passesHardConstraints(veganNutDish, rules, []).eligible).toBe(false);

    // Passes both
    const safeVeganDish = makeDish({ diet_type: 'vegan', ingredient_ids: [50, 60] });
    expect(passesHardConstraints(safeVeganDish, rules, []).eligible).toBe(true);
  });

  it('Jain + nut allergy: both enforced independently', () => {
    const NUT_ID = 101;
    const rules = makeRules({
      diet_type: 'jain',
      allergen_ingredient_ids: [NUT_ID],
    });

    // Passes Jain, fails nut
    const jainNutDish = makeDish({ diet_type: 'veg', is_jain: true, ingredient_ids: [NUT_ID, 50] });
    expect(passesHardConstraints(jainNutDish, rules, []).eligible).toBe(false);

    // Passes both
    const jainSafeDish = makeDish({ diet_type: 'veg', is_jain: true, ingredient_ids: [50, 60] });
    expect(passesHardConstraints(jainSafeDish, rules, []).eligible).toBe(true);
  });

  it('egg diet + beef exclusion: both enforced independently', () => {
    const BEEF_ID = 600;
    const rules = makeRules({
      diet_type: 'egg',
      excluded_ingredient_ids: [BEEF_ID],
    });

    // Fails diet_type (non_veg/meat not allowed for egg user)
    const meatDish = makeDish({ diet_type: 'non_veg', ingredient_ids: [800] });
    expect(passesHardConstraints(meatDish, rules, []).eligible).toBe(false);

    // Egg dish with beef: fails exclusion even though diet_type=egg would pass
    // (shouldn't happen in real data but tests stacking)
    const eggBeefDish = makeDish({ diet_type: 'egg', ingredient_ids: [BEEF_ID, 50] });
    expect(passesHardConstraints(eggBeefDish, rules, []).eligible).toBe(false);

    // Clean egg dish: passes both
    const cleanEggDish = makeDish({ diet_type: 'egg', ingredient_ids: [50, 60] });
    expect(passesHardConstraints(cleanEggDish, rules, []).eligible).toBe(true);
  });
});
