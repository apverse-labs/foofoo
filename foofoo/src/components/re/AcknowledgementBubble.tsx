import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';

/**
 * @summary A chat bubble from the FooFoo character acknowledging an answer.
 *
 * @description Slides up + fades in when `visible` becomes true. Green bubble
 *   with white text and a speech-bubble tail at the bottom-left, next to a small
 *   green avatar with a 🍽️ emoji. Renders nothing when not visible.
 *
 * @param {string} message - Acknowledgement text to display.
 * @param {boolean} visible - Whether the bubble is shown.
 */
export default function AcknowledgementBubble({ message, visible }: { message: string; visible: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, anim, message]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.row,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>🍽️</Text>
      </View>
      <View style={styles.bubbleWrap}>
        <View style={styles.bubble}>
          <Text style={styles.message}>{message}</Text>
        </View>
        <View style={styles.tail} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.xs, marginTop: SPACING.md },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 16 },
  bubbleWrap: { flex: 1 },
  bubble: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  message: { color: '#fff', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  tail: {
    position: 'absolute', bottom: -5, left: 10,
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: COLORS.primary,
  },
});
