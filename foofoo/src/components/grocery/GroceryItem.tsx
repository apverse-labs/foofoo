/**
 * @summary One row in the Grocery list: checkbox + name + small category tag.
 *
 * @description Checkbox state is purely local — not persisted across sessions
 *   (decision noted in the screen comment). The category tag mirrors the
 *   section header so users can sanity-check after using the global "Clear
 *   checked" action.
 *
 * @calledBy src/components/grocery/GroceryCategorySection.tsx
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import { categoryDisplayName } from '../../utils/ingredientCategory';
import type { GroceryIngredient } from '../../types';

interface Props {
  ingredient: GroceryIngredient;
  checked: boolean;
  onToggle: () => void;
}

/**
 * @summary Renders one grocery row.
 * @param {Props} props - ingredient, checked state, toggle handler
 * @returns {JSX.Element}
 * @calledBy GroceryCategorySection
 */
export default function GroceryItem({ ingredient, checked, onToggle }: Props) {
  return (
    <Pressable
      style={styles.row}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.name, checked && styles.nameChecked]} numberOfLines={1}>
        {ingredient.name}
      </Text>
      <Text style={styles.tag}>{categoryDisplayName(ingredient.category)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: 10, paddingHorizontal: SPACING.sm,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 },
  name: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  nameChecked: { color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  tag: {
    fontSize: 10, color: COLORS.textSecondary,
    backgroundColor: '#F1F3F2',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5,
  },
});
