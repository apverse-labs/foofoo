/**
 * @summary Empty-state UI for the search screen.
 *
 * @description
 * Three modes:
 *   - 'initial'  : no query typed → "What are you craving?" + Popular Today header
 *   - 'too_short': 1 char typed → "Type at least 2 characters"
 *   - 'no_results': non-empty query returned 0 → "No dishes found for '…'" + Hindi hint
 *
 * @calledBy app/(tabs)/search.tsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../config/constants';

interface Props {
  mode: 'initial' | 'too_short' | 'no_results';
  query?: string;
}

/**
 * @summary Renders the empty/info state for the search screen.
 * @param {Props} props - mode and (optionally) the current query string
 * @returns {JSX.Element}
 */
export default function EmptySearchState({ mode, query }: Props) {
  if (mode === 'too_short') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.emoji}>⌨️</Text>
        <Text style={styles.title}>Type at least 2 characters</Text>
        <Text style={styles.hint}>Try cuisine names, dish names, or Hindi terms (chawal, murgh)</Text>
      </View>
    );
  }

  if (mode === 'no_results') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.title}>No dishes found for &ldquo;{query}&rdquo;</Text>
        <Text style={styles.hint}>
          Try searching in Hindi? E.g. <Text style={styles.bold}>&quot;Chawal&quot;</Text> for rice
          dishes, <Text style={styles.bold}>&quot;Murgh&quot;</Text> for chicken.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🍽️</Text>
      <Text style={styles.title}>What are you craving?</Text>
      <Text style={styles.hint}>Search 800+ dishes by name, cuisine, or Hindi term.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  bold: { fontWeight: '700', color: COLORS.textPrimary },
});
