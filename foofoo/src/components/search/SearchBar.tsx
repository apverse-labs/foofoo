/**
 * @summary Top-of-screen search input bar with clear + filter buttons.
 *
 * @description
 * Controlled TextInput. Renders a search icon, the live input, a clear (X)
 * button when text is present, and a filter button on the right that opens
 * the FilterBottomSheet. Autofocuses on mount. Debouncing of the search
 * itself is handled by the parent screen — this component only owns input
 * state forwarding.
 *
 * @calledBy app/(tabs)/search.tsx
 */

import React from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';

interface Props {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
}

/**
 * @summary Renders the SearchBar.
 * @param {Props} props - Controlled value, callbacks, and active filter badge count
 * @returns {JSX.Element}
 */
export default function SearchBar({
  value, onChange, onClear, onOpenFilters, activeFilterCount,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search dishes, e.g. paneer, chawal…"
          placeholderTextColor={COLORS.textSecondary}
          value={value}
          onChangeText={onChange}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search dishes"
        />
        {value.length > 0 && (
          <Pressable onPress={onClear} hitSlop={12} accessibilityLabel="Clear search">
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        )}
      </View>
      <Pressable
        style={styles.filterBtn}
        onPress={onOpenFilters}
        accessibilityLabel="Open filters"
      >
        <Text style={styles.filterIcon}>⚙</Text>
        {activeFilterCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: { fontSize: 14 },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  clear: { fontSize: 14, color: COLORS.textSecondary, paddingHorizontal: SPACING.xs },
  filterBtn: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  filterIcon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
