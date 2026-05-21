/**
 * @summary Horizontal scrollable chip row showing Tier 1 + Tier 2 Food DNA tags.
 *
 * @description Groups tags by category and shows each as a chip with display_name.
 *   Filters to user-facing tier 1/2 tags from dish_tags.
 *
 * @calledBy app/dish/[id].tsx
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import type { DishTagRow } from '../../types';

interface Props {
  tags: DishTagRow[];
}

/**
 * @summary Renders the Food DNA chip row.
 * @param {Props} props - dish_tags rows from getDishById
 * @returns {JSX.Element | null} null if no eligible tags
 * @calledBy app/dish/[id].tsx
 */
export default function FoodDNAChips({ tags }: Props) {
  const visible = tags
    .filter(t => t.tags && (t.tags.tier == null || t.tags.tier <= 2))
    .map(t => t.tags!);

  if (visible.length === 0) return null;

  // Group by category if >3 tags
  const byCategory: Record<string, typeof visible> = {};
  for (const tag of visible) {
    const cat = tag.category || 'other';
    (byCategory[cat] ||= []).push(tag);
  }
  const groupBreakdown = visible.length > 3 && Object.keys(byCategory).length > 1;

  if (!groupBreakdown) {
    return (
      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {visible.map(t => (
            <View key={t.id} style={styles.chip}>
              <Text style={styles.chipText}>{t.display_name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Object.entries(byCategory).map(([cat, list]) => (
        <View key={cat} style={styles.group}>
          <Text style={styles.groupLabel}>{prettyCategory(cat)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {list.map(t => (
              <View key={t.id} style={styles.chip}>
                <Text style={styles.chipText}>{t.display_name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

function prettyCategory(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: { gap: SPACING.sm },
  group: { gap: SPACING.xs },
  groupLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1,
    color: COLORS.textSecondary, textTransform: 'uppercase',
  },
  row: { gap: SPACING.sm, paddingRight: SPACING.md },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#EEF2EF',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: '#D8E5DD',
  },
  chipText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
});
