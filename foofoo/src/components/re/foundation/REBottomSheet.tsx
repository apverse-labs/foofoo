import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_TYPE, TIMING, getREPalette } from '../../../config/re-theme';
import { reducedMotionDuration } from '../../../utils/re-ui-helpers';
import { useReducedMotion } from './useReducedMotion';

export interface REBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

/**
 * @summary Lightweight bottom-sheet wrapper (RN Modal + Animated slide).
 * @description No third-party sheet lib (avoids new deps / trade dress). Backdrop tap closes;
 *   reduced-motion → instant. Used for follow-ups, swap, why-this, examples.
 */
export default function REBottomSheet({ visible, onClose, title, children }: REBottomSheetProps) {
  const c = getREPalette('light');
  const reduce = useReducedMotion();
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : height,
      duration: reducedMotionDuration(reduce, TIMING.ANIMATION_NORMAL),
      useNativeDriver: true,
    }).start();
  }, [visible, height, reduce, translateY]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.scrim }]} accessibilityLabel="Close" onPress={onClose} />
      <Animated.View style={[styles.sheet, { backgroundColor: c.surface, transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        {title ? <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>{title}</Text> : null}
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: BORDER_RADIUS.lg, borderTopRightRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, paddingBottom: SPACING.xl,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D9D6D0', marginBottom: SPACING.md },
  title: { ...RE_TYPE.title, marginBottom: SPACING.md },
});
