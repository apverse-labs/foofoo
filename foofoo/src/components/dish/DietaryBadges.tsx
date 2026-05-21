/**
 * @summary Renders dietary badges (Jain / Vegan / Gluten-Free / Dairy-Free / Nut-Free).
 *
 * @description Each badge is shown only when applicable, derived from dish flags and
 *   ingredient flags. Examples:
 *     - Vegan: diet_type === 'vegan'
 *     - Jain: is_jain === true
 *     - Gluten-Free: no ingredient with is_gluten=true
 *     - Dairy-Free / Nut-Free: same pattern
 *
 * @calledBy app/dish/[id].tsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../config/constants';
import type { FullDish } from '../../types';

interface Props {
  dish: FullDish;
}

interface Badge { label: string; emoji: string; bg: string; fg: string; }

/**
 * @summary Derives and renders the visible dietary badges.
 * @param {Props} props - full dish (needs meal_ingredients + flags)
 * @returns {JSX.Element | null} null if no badges apply
 * @calledBy app/dish/[id].tsx
 */
export default function DietaryBadges({ dish }: Props) {
  const ingredients = (dish.meal_ingredients ?? [])
    .map(mi => mi.ingredients)
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  const badges: Badge[] = [];

  if (dish.is_jain === true) {
    badges.push({ label: 'Jain', emoji: '🟢', bg: '#E8F5E9', fg: '#1B5E20' });
  }
  if (dish.diet_type === 'vegan') {
    badges.push({ label: 'Vegan', emoji: '🌱', bg: '#E8F5E9', fg: '#2E7D32' });
  }

  // For derived badges we need at least one ingredient mapped. Otherwise be
  // conservative and skip (we can't claim "gluten-free" when we don't know).
  if (ingredients.length > 0) {
    if (!ingredients.some(i => i.is_gluten === true)) {
      badges.push({ label: 'Gluten-Free', emoji: '🌾', bg: '#FFF3E0', fg: '#E65100' });
    }
    if (!ingredients.some(i => i.is_dairy === true)) {
      badges.push({ label: 'Dairy-Free', emoji: '🥛', bg: '#E1F5FE', fg: '#01579B' });
    }
    if (!ingredients.some(i => i.is_nut === true)) {
      badges.push({ label: 'Nut-Free', emoji: '🥜', bg: '#FFF8E1', fg: '#6D4C00' });
    }
  }

  if (badges.length === 0) return null;

  return (
    <View style={styles.row}>
      {badges.map(b => (
        <View key={b.label} style={[styles.badge, { backgroundColor: b.bg }]}>
          <Text style={[styles.badgeText, { color: b.fg }]}>{b.emoji} {b.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  badge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
