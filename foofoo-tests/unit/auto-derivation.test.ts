/**
 * auto-derivation.test.ts
 *
 * Verifies the ingredient flag → dish attribute auto-derivation pipeline that
 * the derive-dish-attributes Edge Function implements. Ensures allergen, diet,
 * and Jain flag derivation is correct and safe to run on every dish insert.
 *
 * Run: npm run test:unit
 * Depends on: lib/re-engine.ts, lib/types.ts
 * Doc refs: Doc 11A Section 4 (Auto-Derivation Pipeline)
 *
 * SAFETY-CRITICAL: A failure here = DO NOT SHIP until resolved.
 */

// unit/auto-derivation.test.ts
// Tests the ingredient flag → dish attribute auto-derivation pipeline
// Spec: Doc #11A v4 — Section 4 (Auto-Derivation Pipeline)

import { deriveAttributes } from '../lib/re-engine';
import type { Ingredient } from '../lib/types';

// ─── Ingredient factories ─────────────────────────────────────────────────────

function makeIngredient(overrides: Partial<Ingredient>): Ingredient {
  return {
    id: Math.floor(Math.random() * 10000),
    name: 'test-ingredient',
    is_veg: true,
    is_vegan: true,
    is_jain_compatible: true,
    allergen_flags: [],
    category: 'vegetable',
    ...overrides,
  };
}

// ─── Diet type derivation ─────────────────────────────────────────────────────

describe('Auto-Derivation: diet_type', () => {
  it('dish with meat ingredient → diet_type = non_veg', () => {
    const ingredients = [
      makeIngredient({ name: 'Chicken', is_veg: false, is_vegan: false, is_jain_compatible: false, category: 'meat' }),
      makeIngredient({ name: 'Onion', is_veg: true, category: 'vegetable' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.diet_type).toBe('non_veg');
  });

  it('dish with seafood ingredient → diet_type = non_veg', () => {
    const ingredients = [
      makeIngredient({ name: 'Prawns', is_veg: false, is_vegan: false, is_jain_compatible: false, category: 'seafood' }),
      makeIngredient({ name: 'Coconut', is_veg: true, category: 'fruit' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.diet_type).toBe('non_veg');
  });

  it('dish with egg (no meat) → diet_type = egg', () => {
    const ingredients = [
      makeIngredient({ name: 'Egg', is_veg: false, is_vegan: false, is_jain_compatible: false, category: 'egg' }),
      makeIngredient({ name: 'Onion', is_veg: true, category: 'vegetable' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.diet_type).toBe('egg');
  });

  it('dish with dairy (no meat/egg) → diet_type = veg (not vegan)', () => {
    const ingredients = [
      makeIngredient({ name: 'Paneer', is_veg: true, is_vegan: false, is_jain_compatible: true, category: 'dairy' }),
      makeIngredient({ name: 'Tomato', is_veg: true, is_vegan: true, category: 'vegetable' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.diet_type).toBe('veg');
  });

  it('dish with ALL vegan ingredients → diet_type = vegan', () => {
    const ingredients = [
      makeIngredient({ name: 'Tomato', is_veg: true, is_vegan: true, is_jain_compatible: true, category: 'vegetable' }),
      makeIngredient({ name: 'Rice', is_veg: true, is_vegan: true, is_jain_compatible: true, category: 'grain_flour' }),
      makeIngredient({ name: 'Coconut Oil', is_veg: true, is_vegan: true, is_jain_compatible: true, category: 'oil_fat' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.diet_type).toBe('vegan');
  });
});

// ─── Jain derivation ──────────────────────────────────────────────────────────

describe('Auto-Derivation: is_jain', () => {
  it('dish with onion → is_jain must be false', () => {
    const ingredients = [
      makeIngredient({ name: 'Onion', is_veg: true, is_jain_compatible: false, category: 'vegetable' }),
      makeIngredient({ name: 'Tomato', is_veg: true, is_jain_compatible: true, category: 'vegetable' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.is_jain).toBe(false);
  });

  it('dish with garlic → is_jain must be false', () => {
    const ingredients = [
      makeIngredient({ name: 'Garlic', is_veg: true, is_jain_compatible: false, category: 'herb_aromatic' }),
      makeIngredient({ name: 'Dal', is_veg: true, is_jain_compatible: true, category: 'lentil_legume' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.is_jain).toBe(false);
  });

  it('dish with ALL jain_compatible ingredients → is_jain must be true', () => {
    const ingredients = [
      makeIngredient({ name: 'Rice', is_veg: true, is_vegan: true, is_jain_compatible: true, category: 'grain_flour' }),
      makeIngredient({ name: 'Moong Dal', is_veg: true, is_vegan: true, is_jain_compatible: true, category: 'lentil_legume' }),
      makeIngredient({ name: 'Rock Salt', is_veg: true, is_vegan: true, is_jain_compatible: true, category: 'condiment' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.is_jain).toBe(true);
  });

  it('dish with meat → is_jain must be false (meat overrides)', () => {
    const ingredients = [
      makeIngredient({ name: 'Mutton', is_veg: false, is_jain_compatible: false, category: 'meat' }),
      makeIngredient({ name: 'Ginger', is_veg: true, is_jain_compatible: false, category: 'herb_aromatic' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.is_jain).toBe(false);
  });

  it('dish with potato (root veg) → is_jain false', () => {
    const ingredients = [
      makeIngredient({ name: 'Potato', is_veg: true, is_jain_compatible: false, category: 'vegetable' }),
      makeIngredient({ name: 'Cumin', is_veg: true, is_jain_compatible: true, category: 'spice' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.is_jain).toBe(false);
  });
});

// ─── Allergen derivation ──────────────────────────────────────────────────────

describe('Auto-Derivation: allergens[]', () => {
  it('dish with peanut ingredient → allergens[] contains "nuts"', () => {
    const ingredients = [
      makeIngredient({ name: 'Peanut', allergen_flags: ['nuts'], category: 'nut_seed' }),
      makeIngredient({ name: 'Jaggery', allergen_flags: [], category: 'sweetener' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.allergens).toContain('nuts');
  });

  it('dish with dairy ingredient → allergens[] contains "dairy"', () => {
    const ingredients = [
      makeIngredient({ name: 'Milk', allergen_flags: ['dairy'], category: 'dairy' }),
      makeIngredient({ name: 'Rice', allergen_flags: [], category: 'grain_flour' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.allergens).toContain('dairy');
  });

  it('dish with wheat flour → allergens[] contains "gluten"', () => {
    const ingredients = [
      makeIngredient({ name: 'Wheat Flour', allergen_flags: ['gluten'], category: 'grain_flour' }),
      makeIngredient({ name: 'Salt', allergen_flags: [], category: 'condiment' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.allergens).toContain('gluten');
  });

  it('dish with no allergen ingredients → allergens[] is empty', () => {
    const ingredients = [
      makeIngredient({ name: 'Rice', allergen_flags: [], category: 'grain_flour' }),
      makeIngredient({ name: 'Cumin', allergen_flags: [], category: 'spice' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.allergens).toHaveLength(0);
  });

  it('allergens is a union — multiple ingredients add multiple allergens', () => {
    const ingredients = [
      makeIngredient({ name: 'Peanut', allergen_flags: ['nuts'], category: 'nut_seed' }),
      makeIngredient({ name: 'Milk', allergen_flags: ['dairy'], category: 'dairy' }),
      makeIngredient({ name: 'Wheat', allergen_flags: ['gluten'], category: 'grain_flour' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.allergens).toContain('nuts');
    expect(derived.allergens).toContain('dairy');
    expect(derived.allergens).toContain('gluten');
    expect(derived.allergens).toHaveLength(3);
  });

  it('no duplicate allergens even if multiple ingredients have same flag', () => {
    const ingredients = [
      makeIngredient({ name: 'Cashew', allergen_flags: ['nuts'], category: 'nut_seed' }),
      makeIngredient({ name: 'Almond', allergen_flags: ['nuts'], category: 'nut_seed' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.allergens.filter(a => a === 'nuts')).toHaveLength(1);
  });
});

// ─── Vegan implication ────────────────────────────────────────────────────────

describe('Auto-Derivation: vegan implications', () => {
  it('dish with dairy → diet_type cannot be vegan', () => {
    const ingredients = [
      makeIngredient({ name: 'Ghee', is_veg: true, is_vegan: false, category: 'dairy', allergen_flags: ['dairy'] }),
      makeIngredient({ name: 'Dal', is_veg: true, is_vegan: true, category: 'lentil_legume' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.diet_type).not.toBe('vegan');
  });

  it('dish with no meat/dairy/egg → diet_type = veg or vegan', () => {
    const ingredients = [
      makeIngredient({ name: 'Spinach', is_veg: true, is_vegan: true, category: 'leafy_green' }),
      makeIngredient({ name: 'Chickpea', is_veg: true, is_vegan: true, category: 'lentil_legume' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(['veg', 'vegan']).toContain(derived.diet_type);
  });
});

// ─── ingredient_ids derivation ────────────────────────────────────────────────

describe('Auto-Derivation: ingredient_ids[]', () => {
  it('ingredient_ids contains all input ingredient IDs', () => {
    const ingredients = [
      makeIngredient({ id: 101, name: 'A' }),
      makeIngredient({ id: 202, name: 'B' }),
      makeIngredient({ id: 303, name: 'C' }),
    ];
    const derived = deriveAttributes(ingredients);
    expect(derived.ingredient_ids).toEqual(expect.arrayContaining([101, 202, 303]));
    expect(derived.ingredient_ids).toHaveLength(3);
  });
});
