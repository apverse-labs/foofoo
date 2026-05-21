/**
 * @summary Category → emoji and display name maps for ingredients.
 *
 * @description Centralised so both Meal Detail (IngredientList) and Grocery
 *   (GroceryCategorySection) render the same icon/label per category.
 *
 * @calledBy src/components/dish/IngredientList.tsx, src/components/grocery/*
 */

const EMOJI: Record<string, string> = {
  spice: '🌶',
  vegetable: '🥬',
  leafy_green: '🥗',
  lentil_legume: '🫘',
  grain_flour: '🌾',
  dairy: '🥛',
  meat: '🍗',
  seafood: '🐟',
  egg: '🥚',
  oil_fat: '🫙',
  nut_seed: '🥜',
  fruit: '🍎',
  sweetener: '🍯',
  herb_aromatic: '🌿',
  condiment: '🧂',
};

const DISPLAY: Record<string, string> = {
  spice: 'Spices',
  vegetable: 'Vegetables',
  leafy_green: 'Leafy Greens',
  lentil_legume: 'Lentils & Legumes',
  grain_flour: 'Grains & Flours',
  dairy: 'Dairy',
  meat: 'Meat',
  seafood: 'Seafood',
  egg: 'Eggs',
  oil_fat: 'Oils & Fats',
  nut_seed: 'Nuts & Seeds',
  fruit: 'Fruits',
  sweetener: 'Sweeteners',
  herb_aromatic: 'Herbs & Aromatics',
  condiment: 'Condiments',
};

/**
 * @summary Returns the emoji for an ingredient category (e.g. 'vegetable' → '🥬').
 * @param {string} category - Category code from ingredients.category
 * @returns {string} Emoji or '🥄' fallback
 */
export function categoryEmoji(category: string): string {
  return EMOJI[category] ?? '🥄';
}

/**
 * @summary Returns the display name for an ingredient category (e.g. 'leafy_green' → 'Leafy Greens').
 * @param {string} category - Category code from ingredients.category
 * @returns {string} Human-readable name
 */
export function categoryDisplayName(category: string): string {
  return DISPLAY[category] ?? prettyCase(category);
}

function prettyCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * @summary Canonical order to render ingredient categories in grocery list.
 */
export const CATEGORY_ORDER: string[] = [
  'vegetable', 'leafy_green', 'lentil_legume', 'grain_flour',
  'dairy', 'meat', 'seafood', 'egg', 'spice', 'herb_aromatic',
  'oil_fat', 'nut_seed', 'fruit', 'sweetener', 'condiment',
];
