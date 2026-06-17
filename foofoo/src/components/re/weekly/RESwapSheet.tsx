import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SPACING, RE_TYPE, getREPalette } from '../../../config/re-theme';
import type { REDishCandidate } from '../../../types';
import type { SwapTier } from '../../../utils/re-weekly';
import REBottomSheet from '../foundation/REBottomSheet';
import REDishCarousel from './REDishCarousel';

export interface RESwapSheetProps {
  visible: boolean;
  onClose: () => void;
  slotLabel: string;                       // friendly class label of the slot
  tiers: SwapTier[];                       // from buildSwapTiers (class-first order)
  candidatesByTier: Record<string, REDishCandidate[]>; // keyed by tier.id ('same'|'different'|'broader')
  onSelectDish: (dish: REDishCandidate, tier: SwapTier) => void;
}

/**
 * @summary Class-first swap sheet: tabs for "Same style" / "Try a different style" / "More options".
 * @description Guards every selection with isDishValidForTier → the UI cannot create a class/dish mismatch.
 */
export default function RESwapSheet({ visible, onClose, slotLabel, tiers, candidatesByTier, onSelectDish }: RESwapSheetProps) {
  const c = getREPalette('light');
  const [activeIdx, setActiveIdx] = useState(0);
  const active = tiers[activeIdx] ?? tiers[0];
  // Class-first guarantee: candidatesByTier[tier.id] MUST be fetched with .eq('meal_class_code', tier.classCode)
  // (or, for 'broader', from diet-valid cohort classes) — so every option here belongs to the right class.
  const candidates = candidatesByTier[active?.id] ?? [];

  return (
    <REBottomSheet visible={visible} onClose={onClose} title={`Swap your ${slotLabel}`}>
      <View style={styles.tabs}>
        {tiers.map((t, i) => (
          <Pressable key={t.id + i} onPress={() => setActiveIdx(i)} accessibilityRole="tab"
            accessibilityState={{ selected: i === activeIdx }}
            style={[styles.tab, i === activeIdx && { borderBottomColor: c.accent, borderBottomWidth: 2 }]}>
            <Text style={[styles.tabText, { color: i === activeIdx ? c.textPrimary : c.textSecondary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <REDishCarousel candidates={candidates} onSelect={(d) => onSelectDish(d, active)} />
    </REBottomSheet>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  tab: { paddingVertical: SPACING.sm },
  tabText: { ...RE_TYPE.body, fontWeight: '600' },
});
