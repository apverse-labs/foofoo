/**
 * @summary First-time gesture tutorial overlay shown on Home screen.
 *
 * @description
 * Shown ONCE after user completes onboarding. Explains 4 core gestures.
 * Dismissed via 'Got it!' button. Shown if AsyncStorage key not set.
 *
 * @param onDismiss - Called when user taps 'Got it!' — caller sets AsyncStorage key
 * @calledBy app/(tabs)/index.tsx
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';

interface GestureTutorialProps {
  onDismiss: () => void;
}

const GESTURES = [
  { icon: '👆', gesture: 'Swipe left / right', desc: 'Browse meal options' },
  { icon: '👇', gesture: 'Long press + drag down', desc: 'Never suggest this again' },
  { icon: '☝️', gesture: 'Long press + drag up', desc: 'Not today — skip this meal' },
  { icon: '🔒', gesture: 'Tap lock icon', desc: 'Lock this meal in your plan' },
];

export default function GestureTutorial({ onDismiss }: GestureTutorialProps) {
  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>How it works</Text>
          <Text style={styles.subtitle}>Here's how to get the most from your meal plan</Text>

          <View style={styles.gestures}>
            {GESTURES.map(({ icon, gesture, desc }) => (
              <View key={gesture} style={styles.gestureRow}>
                <Text style={styles.gestureIcon}>{icon}</Text>
                <View style={styles.gestureText}>
                  <Text style={styles.gestureName}>{gesture}</Text>
                  <Text style={styles.gestureDesc}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Got it!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 360,
    gap: SPACING.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  gestures: { gap: SPACING.md, marginTop: SPACING.sm },
  gestureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
  },
  gestureIcon: { fontSize: 28 },
  gestureText: { flex: 1 },
  gestureName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  gestureDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
