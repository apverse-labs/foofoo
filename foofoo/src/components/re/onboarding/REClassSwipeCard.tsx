import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_TYPE, RE_ELEVATION, getREPalette } from '../../../config/re-theme';
import REButton from '../foundation/REButton';
import { REACTION_AFFINITY, type SwipeReaction } from '../../../utils/re-onboarding-flow';

export { REACTION_AFFINITY };
export type { SwipeReaction };

export interface REClassSwipeCardProps {
  classCode: string;        // backing re_meal_classes code (debug/telemetry only)
  friendlyLabel: string;    // e.g. "Simple green sabzi + dal + roti"
  examples?: string[];      // peek examples (dish names)
  onReact: (classCode: string, reaction: SwipeReaction, affinity: number) => void;
  onPeek?: () => void;
}

/**
 * @summary Calibration card reacting to a meal CLASS (not aspirational dish).
 * @description Buttons are the accessible fallback for swipe; each reaction maps to a class-affinity
 *   delta in [-1,1]. The raw classCode is never shown to the user (label only).
 */
export default function REClassSwipeCard({ classCode, friendlyLabel, examples, onReact, onPeek }: REClassSwipeCardProps) {
  const c = getREPalette('light');
  const react = (r: SwipeReaction) => onReact(classCode, r, REACTION_AFFINITY[r]);
  return (
    <View style={[styles.card, { backgroundColor: c.surface }, RE_ELEVATION.hero]}>
      <Text accessibilityRole="header" style={[styles.label, { color: c.textPrimary }]}>{friendlyLabel}</Text>
      {examples && examples.length ? (
        <Text style={[styles.examples, { color: c.textSecondary }]} numberOfLines={2}>e.g. {examples.join(' · ')}</Text>
      ) : null}
      <View style={styles.row}>
        <REButton title="Not for us" variant="secondary" onPress={() => react('not')} />
        <REButton title="Sometimes" variant="ghost" onPress={() => react('sometimes')} />
        <REButton title="Love it" variant="primary" onPress={() => react('like')} />
      </View>
      {onPeek ? (
        <View style={styles.peek}><REButton title="Show examples" variant="ghost" onPress={onPeek} /></View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, gap: SPACING.md },
  label: { ...RE_TYPE.title },
  examples: { ...RE_TYPE.subLabel },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  peek: { marginTop: SPACING.xs, alignSelf: 'flex-start' },
});
