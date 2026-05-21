/**
 * @summary Renders the Level 2 ingredient list with category emoji + optional checkbox.
 *
 * @description
 * Used on the Meal Detail page. Ordered by meal_ingredients.display_order.
 * Checkbox state is local (not persisted) — for manual shopping use only.
 * If the dish has no linked ingredients: shows "Ingredients coming soon" message.
 *
 * @calledBy app/dish/[id].tsx
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import type { MealIngredientRow } from '../../types';
import { categoryEmoji } from '../../utils/ingredientCategory';

interface Props {
  ingredients: MealIngredientRow[];
}

/**
 * @summary Renders the ingredient list rows.
 * @param {Props} props - meal_ingredients array from getDishById
 * @returns {JSX.Element}
 * @calledBy app/dish/[id].tsx
 */
export default function IngredientList({ ingredients }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  if (!ingredients || ingredients.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Ingredients coming soon for this dish 🍳</Text>
      </View>
    );
  }

  // Sort by display_order; fall back to insertion order
  const sorted = [...ingredients]
    .filter(mi => mi.ingredients)
    .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));

  return (
    <View style={styles.list}>
      {sorted.map((mi, idx) => {
        const ing = mi.ingredients!;
        const isChecked = !!checked[ing.id];
        return (
          <Pressable
            key={`${ing.id}-${idx}`}
            onPress={() => setChecked(prev => ({ ...prev, [ing.id]: !prev[ing.id] }))}
            style={styles.row}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isChecked }}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.emoji}>{categoryEmoji(ing.category)}</Text>
            <Text style={[styles.name, isChecked && styles.nameChecked]} numberOfLines={1}>{ing.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACING.xs },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: SPACING.sm,
    gap: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 },
  emoji: { fontSize: 18, width: 22, textAlign: 'center' },
  name: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  nameChecked: { color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  emptyBox: {
    padding: SPACING.lg, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
