import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../../config/re-theme';
import REButton from '../foundation/REButton';
import type { REFeedbackSignal } from '../../../types';

export interface REMealControlsProps {
  locked?: boolean;
  onKeep: () => void;        // ACCEPT
  onSwap: () => void;        // open swap (within class)
  onLock: () => void;        // LOCK / unlock
  onNotToday: () => void;    // NOT_TODAY
  onNever: () => void;       // NEVER (confirm handled by parent)
}

/**
 * @summary Meal actions as accessible buttons (the fallback for swipe gestures).
 * @description Emits the canonical signals; parent wires them to submitFeedback.
 *   Never/lock are clearly distinct; lock toggles label when locked.
 */
export default function REMealControls({ locked, onKeep, onSwap, onLock, onNotToday, onNever }: REMealControlsProps) {
  return (
    <View style={styles.wrap}>
      <REButton title={locked ? 'Locked ✓' : 'Keep'} variant={locked ? 'secondary' : 'primary'} onPress={locked ? onLock : onKeep} accessibilityLabel={locked ? 'Unlock meal' : 'Keep this meal'} />
      {!locked ? <REButton title="Swap" variant="secondary" onPress={onSwap} accessibilityLabel="Swap to another dish in this style" /> : null}
      {!locked ? <REButton title="Lock" variant="ghost" onPress={onLock} accessibilityLabel="Lock this meal" /> : null}
      {!locked ? <REButton title="Not today" variant="ghost" onPress={onNotToday} accessibilityLabel="Skip just today" /> : null}
      {!locked ? <REButton title="Never" variant="destructive" onPress={onNever} accessibilityLabel="Never suggest this dish" /> : null}
    </View>
  );
}

export const FEEDBACK_BY_CONTROL: Record<'keep' | 'lock' | 'notToday' | 'never', REFeedbackSignal> = {
  keep: 'ACCEPT', lock: 'LOCK', notToday: 'NOT_TODAY', never: 'NEVER',
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
});
