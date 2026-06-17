import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, RE_TYPE, getREPalette } from '../../../config/re-theme';
import type { REMealClassRef, REDishCandidate, REAddonComponent } from '../../../types';
import type { ReasonSignal } from '../../../utils/re-reason-tags';
import RECard from '../foundation/RECard';
import REReasonTag from './REReasonTag';
import REAddonSubCard from './REAddonSubCard';
import REMealControls from './REMealControls';

export interface REMealCardProps {
  slot: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  classRef: REMealClassRef | null;
  topDish: REDishCandidate | null;
  addons?: REAddonComponent[];
  reasonSignal?: ReasonSignal;
  supportingSignals?: ReasonSignal[];
  locked?: boolean;
  variant?: 'hero' | 'compact';
  onKeep: () => void; onSwap: () => void; onLock: () => void;
  onNotToday: () => void; onNever: () => void; onWhy?: () => void;
}

const SLOT_LABEL: Record<REMealCardProps['slot'], string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner',
};

/**
 * @summary One slot card: primary dish headline + quiet class sub-label + add-ons + reason + actions.
 * @description Class-first visible (sub-label) but not loud. Dish/cook-time metadata that v3 lacks is
 *   simply omitted (no fake fields). Add-ons render as secondary sub-cards beneath the primary.
 */
export default function REMealCard(props: REMealCardProps) {
  const { slot, classRef, topDish, addons = [], reasonSignal = 'none', supportingSignals, locked, variant = 'compact' } = props;
  const c = getREPalette('light');
  const hasContent = !!topDish;

  return (
    <RECard variant={variant} accessibilityLabel={`${SLOT_LABEL[slot]} plan`}>
      <Text style={[styles.slot, { color: c.textSecondary }]}>{SLOT_LABEL[slot]}</Text>
      {hasContent ? (
        <>
          <Text style={[styles.dish, { color: c.textPrimary }]} numberOfLines={2}>{topDish!.dishName}</Text>
          {classRef ? <Text style={[styles.classLabel, { color: c.textSecondary }]}>in {classRef.display}</Text> : null}
          <View style={styles.reasonRow}>
            <REReasonTag topSignal={reasonSignal} supporting={supportingSignals} onPress={props.onWhy} />
          </View>
          {addons.map((a) => (
            <REAddonSubCard key={a.addonClassCode + a.targetMemberSegment} component={a} />
          ))}
          <REMealControls
            locked={locked}
            onKeep={props.onKeep} onSwap={props.onSwap} onLock={props.onLock}
            onNotToday={props.onNotToday} onNever={props.onNever}
          />
        </>
      ) : (
        <Text style={[styles.empty, { color: c.textSecondary }]}>
          {classRef ? `${classRef.display} — great options coming soon` : 'Tap to add a meal'}
        </Text>
      )}
    </RECard>
  );
}

const styles = StyleSheet.create({
  slot: { ...RE_TYPE.caption, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.xs },
  dish: { ...RE_TYPE.title },
  classLabel: { ...RE_TYPE.subLabel, marginTop: 2 },
  reasonRow: { marginTop: SPACING.sm },
  empty: { ...RE_TYPE.body, marginTop: SPACING.sm },
});

export { SLOT_LABEL };
