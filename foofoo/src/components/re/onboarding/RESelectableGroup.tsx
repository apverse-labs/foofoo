import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../../config/re-theme';
import REChip from '../foundation/REChip';

export interface SelectOption { value: string; label: string; icon?: string; }

export interface RESelectableGroupProps {
  options: SelectOption[];
  selected: string[];
  multi?: boolean;            // single-select by default
  onChange: (next: string[]) => void;
  accessibilityHintPerOption?: string;
}

/**
 * @summary Reusable chip group for diet / cook / health / time / weekend / sub-cohort selection.
 * @description Single- or multi-select. Pure presentational over the foundation REChip.
 *   Backs REDietSelect / RECookSelect / health / weekday / weekend via config (one component, many uses).
 */
export default function RESelectableGroup({ options, selected, multi, onChange, accessibilityHintPerOption }: RESelectableGroupProps) {
  function toggle(value: string) {
    if (multi) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange([value]);
    }
  }
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <REChip
          key={o.value}
          label={o.label}
          icon={o.icon}
          variant="select"
          selected={selected.includes(o.value)}
          onPress={() => toggle(o.value)}
          accessibilityHint={accessibilityHintPerOption}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
