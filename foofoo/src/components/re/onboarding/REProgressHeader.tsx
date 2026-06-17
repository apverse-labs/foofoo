import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SPACING, RE_TYPE, getREPalette, MIN_TOUCH } from '../../../config/re-theme';

export interface REProgressHeaderProps {
  step: number;          // 1-based
  total: number;
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

/**
 * @summary Onboarding progress pill + back/skip. Calm, never punishing (Duolingo-light).
 */
export default function REProgressHeader({ step, total, onBack, onSkip, showSkip }: REProgressHeaderProps) {
  const c = getREPalette('light');
  const pct = total > 0 ? Math.min(1, Math.max(0, step / total)) : 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {step > 1 && onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={styles.side}>
            <Text style={[styles.nav, { color: c.textSecondary }]}>←</Text>
          </Pressable>
        ) : <View style={styles.side} />}
        <View style={[styles.track, { backgroundColor: c.border }]} accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: total, now: step }}>
          <View style={[styles.fill, { backgroundColor: c.primary, width: `${pct * 100}%` }]} />
        </View>
        {showSkip && onSkip ? (
          <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip for now" hitSlop={8} style={styles.side}>
            <Text style={[styles.skip, { color: c.textSecondary }]}>Skip</Text>
          </Pressable>
        ) : <View style={styles.side} />}
      </View>
      <Text style={[styles.count, { color: c.textSecondary }]}>{step} of {total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  side: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: 'center', alignItems: 'center' },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  nav: { fontSize: 22 },
  skip: { ...RE_TYPE.caption, fontWeight: '600' },
  count: { ...RE_TYPE.caption, textAlign: 'center', marginTop: SPACING.xs },
});
