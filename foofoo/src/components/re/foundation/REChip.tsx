import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_TYPE, getREPalette, MIN_TOUCH } from '../../../config/re-theme';
import { buildA11yLabel } from '../../../utils/re-ui-helpers';

export type ChipVariant = 'reason' | 'select' | 'status';

export interface REChipProps {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
  icon?: string;            // leading glyph/emoji; state never relies on color alone
  onPress?: () => void;
  accessibilityHint?: string;
}

/**
 * @summary Pill chip — reason tag, selectable option, or status (lock/skip) marker.
 * @description Status/select always pair an icon + label so meaning is not color-only.
 */
export default function REChip({ label, variant = 'select', selected, icon, onPress, accessibilityHint }: REChipProps) {
  const c = getREPalette('light');
  const bg = variant === 'reason' ? c.reasonChipBg
    : selected ? 'rgba(255,107,53,0.14)'   // accent @ low alpha when selected
      : 'transparent';
  const borderColor = selected ? c.accent : c.border;
  const textColor = variant === 'reason' ? c.primary : c.textPrimary;

  const content = (
    <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
      {icon ? `${icon} ` : ''}{label}
    </Text>
  );
  const chipStyle = [styles.chip, { backgroundColor: bg, borderColor }];

  if (!onPress) {
    return <Text accessibilityRole="text" accessibilityLabel={label} style={chipStyle as never}>{content}</Text>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={variant === 'select' ? 'checkbox' : 'button'}
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={buildA11yLabel(label, { state: selected ? 'selected' : undefined, hint: accessibilityHint })}
      hitSlop={8}
      style={({ pressed }) => [...chipStyle, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg * 2, borderWidth: 1.5,
  },
  text: { ...RE_TYPE.caption },
  pressed: { opacity: 0.9 },
});

export const CHIP_MIN_TOUCH = MIN_TOUCH;
