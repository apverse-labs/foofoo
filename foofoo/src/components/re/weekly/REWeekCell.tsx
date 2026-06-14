import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_TYPE, getREPalette, MIN_TOUCH } from '../../../config/re-theme';
import { buildA11yLabel } from '../../../utils/re-ui-helpers';

export interface REWeekCellProps {
  day: string;
  slot: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  dishName?: string | null;
  friendlyClass: string;
  addonCount?: number;
  isToday?: boolean;
  isWeekend?: boolean;
  locked?: boolean;
  onPress?: () => void;
}

/**
 * @summary Compact weekly grid cell — friendly class + top dish; today/weekend accent; lock + add-on pill.
 * @description Never renders raw class codes (user mode). Weekend differentiation is by accent + label.
 */
export default function REWeekCell(props: REWeekCellProps) {
  const { day, slot, dishName, friendlyClass, addonCount = 0, isToday, isWeekend, locked, onPress } = props;
  const c = getREPalette('light');
  const bg = isToday ? 'rgba(45,106,79,0.08)' : isWeekend ? 'rgba(255,107,53,0.06)' : c.surface;
  const border = isToday ? c.primary : c.border;
  const label = buildA11yLabel(`${day} ${slot}: ${dishName ?? friendlyClass}`, {
    state: [locked ? 'locked' : '', isToday ? 'today' : '', isWeekend ? 'weekend' : ''].filter(Boolean).join(', ') || undefined,
  });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={[styles.cell, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.topRow}>
        <Text style={[styles.dish, { color: c.textPrimary }]} numberOfLines={1}>{dishName ?? friendlyClass}</Text>
        {locked ? <Text accessibilityLabel="locked" style={styles.icon}>🔒</Text> : null}
      </View>
      <Text style={[styles.cls, { color: c.textSecondary }]} numberOfLines={1}>{friendlyClass}</Text>
      {addonCount > 0 ? <Text style={[styles.addon, { color: c.primary }]}>+{addonCount} for family</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { minHeight: MIN_TOUCH, padding: SPACING.sm, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, marginBottom: SPACING.xs },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dish: { ...RE_TYPE.subLabel, fontWeight: '600', flex: 1 },
  icon: { fontSize: 12, marginLeft: 4 },
  cls: { ...RE_TYPE.caption },
  addon: { ...RE_TYPE.caption, marginTop: 2 },
});
