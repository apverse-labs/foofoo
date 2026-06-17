import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_TYPE, getREPalette, MIN_TOUCH } from '../../../config/re-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface REButtonProps {
  title: string;
  variant?: ButtonVariant;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  fullWidth?: boolean;
}

/**
 * @summary Action button — one primary action per surface (Apple-style restraint).
 * @description `primary` uses the warm accent (sparingly); `destructive` uses the never colour.
 */
export default function REButton({ title, variant = 'primary', onPress, disabled, accessibilityLabel, fullWidth }: REButtonProps) {
  const c = getREPalette('light');
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.accent, fg: '#FFFFFF', border: c.accent },
    secondary: { bg: c.surface, fg: c.primary, border: c.primary },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
    destructive: { bg: 'transparent', fg: c.never, border: c.never },
  };
  const p = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: p.bg, borderColor: p.border },
        fullWidth && styles.full,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: p.fg }]} numberOfLines={1}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: MIN_TOUCH, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg * 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  full: { alignSelf: 'stretch' },
  label: { ...RE_TYPE.body, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9 },
});
