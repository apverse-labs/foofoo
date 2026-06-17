import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_TYPE, getREPalette, MIN_TOUCH } from '../../../config/re-theme';

export interface REMemberChipProps {
  label: string;            // friendly segment label, e.g. "Baby 6–18 mo"
  ageBand?: string | null;
  onRemove?: () => void;
  isAddButton?: boolean;
  onPress?: () => void;
}

/**
 * @summary Household member chip (multi-member loop) or an "add member" affordance.
 * @description Frames members as care; supports the member_segments[] capture loop.
 */
export default function REMemberChip({ label, ageBand, onRemove, isAddButton, onPress }: REMemberChipProps) {
  const c = getREPalette('light');
  if (isAddButton) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Add another member"
        style={[styles.chip, styles.add, { borderColor: c.border }]}>
        <Text style={[styles.addText, { color: c.textSecondary }]}>＋ Add member</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.chip, { borderColor: c.primary, backgroundColor: 'rgba(45,106,79,0.08)' }]}
          accessibilityLabel={`${label}${ageBand ? `, ${ageBand}` : ''}`}>
      <Text style={[styles.label, { color: c.textPrimary }]} numberOfLines={1}>
        {label}{ageBand ? ` · ${ageBand}` : ''}
      </Text>
      {onRemove ? (
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={10} style={styles.remove}>
          <Text style={[styles.removeText, { color: c.textSecondary }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg, borderWidth: 1.5, gap: SPACING.sm, alignSelf: 'flex-start',
  },
  add: { borderStyle: 'dashed', justifyContent: 'center' },
  addText: { ...RE_TYPE.body, fontWeight: '600' },
  label: { ...RE_TYPE.body },
  remove: { padding: 2 },
  removeText: { fontSize: 14 },
});
