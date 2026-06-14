import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../config/re-theme';
import { useReducedMotion } from './useReducedMotion';

export interface RESkeletonProps {
  variant?: 'card' | 'cell' | 'deck';
}

/**
 * @summary Food-shaped loading placeholder (never blank white). Pulses; static under reduced-motion.
 */
export default function RESkeleton({ variant = 'card' }: RESkeletonProps) {
  const reduce = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduce) { pulse.setValue(0.7); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse]);

  const Block = ({ style }: { style?: object }) => (
    <Animated.View style={[styles.block, { opacity: pulse }, style]} />
  );

  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar" style={styles.wrap}>
      {variant === 'cell' ? (
        <Block style={styles.cell} />
      ) : variant === 'deck' ? (
        <Block style={styles.deck} />
      ) : (
        <>
          <Block style={styles.image} />
          <Block style={styles.lineWide} />
          <Block style={styles.lineNarrow} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: SPACING.md },
  block: { backgroundColor: '#ECE9E3', borderRadius: BORDER_RADIUS.sm },
  image: { height: 140, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md },
  lineWide: { height: 16, width: '70%', marginBottom: SPACING.sm },
  lineNarrow: { height: 12, width: '40%' },
  cell: { height: 64, borderRadius: BORDER_RADIUS.md },
  deck: { height: 180, borderRadius: BORDER_RADIUS.md },
});
