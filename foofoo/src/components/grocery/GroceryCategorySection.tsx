/**
 * @summary One category block in the Grocery list (header + check-all + items).
 *
 * @description Header shows the category emoji + display name + count badge.
 *   "Check all" toggles every ingredient in this category at once.
 *
 * @calledBy app/(tabs)/grocery.tsx
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import GroceryItem from './GroceryItem';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import type { GroceryCategory } from '../../types';

interface Props {
  group: GroceryCategory;
  checkedIds: Set<number>;
  onToggleItem: (id: number) => void;
  onCheckAll: (ids: number[]) => void;
}

/**
 * @summary Renders one grocery category section.
 * @param {Props} props - category group + checked state + toggle handlers
 * @returns {JSX.Element}
 * @calledBy app/(tabs)/grocery.tsx
 */
export default function GroceryCategorySection({ group, checkedIds, onToggleItem, onCheckAll }: Props) {
  const ids = group.ingredients.map(i => i.id);
  const allChecked = ids.length > 0 && ids.every(id => checkedIds.has(id));
  const someChecked = ids.some(id => checkedIds.has(id));

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{group.emoji}</Text>
        <Text style={styles.headerName}>{group.displayName}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{group.ingredients.length}</Text>
        </View>
        <Pressable
          style={styles.checkAllBtn}
          onPress={() => onCheckAll(ids)}
          accessibilityRole="button"
          accessibilityLabel={allChecked ? 'Uncheck all' : 'Check all'}
        >
          <Text style={styles.checkAllText}>
            {allChecked ? 'Uncheck all' : someChecked ? 'Check all' : 'Check all'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.items}>
        {group.ingredients.map(ing => (
          <GroceryItem
            key={ing.id}
            ingredient={ing}
            checked={checkedIds.has(ing.id)}
            onToggle={() => onToggleItem(ing.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: '#FAFAF8',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerEmoji: { fontSize: 18 },
  headerName: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  countBadge: {
    minWidth: 22, height: 22, paddingHorizontal: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  checkAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  checkAllText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  items: { paddingVertical: 4 },
});
