import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_ELEVATION, getREPalette, MIN_TOUCH } from '../../../config/re-theme';

export interface RECardProps {
  variant?: 'hero' | 'compact';
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * @summary Surface card primitive for RE screens (hero or compact elevation).
 * @description Presentational only — no data. Becomes a button when `onPress` is set.
 */
export default function RECard({ variant = 'compact', onPress, accessibilityLabel, style, children }: RECardProps) {
  const c = getREPalette('light');
  const elevation = variant === 'hero' ? RE_ELEVATION.hero : RE_ELEVATION.low;
  const cardStyle = [
    styles.card,
    { backgroundColor: c.surface, padding: variant === 'hero' ? SPACING.lg : SPACING.md },
    elevation,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View accessibilityLabel={accessibilityLabel} style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: BORDER_RADIUS.md, minHeight: MIN_TOUCH, overflow: 'hidden' },
  pressed: { opacity: 0.92 },
});
