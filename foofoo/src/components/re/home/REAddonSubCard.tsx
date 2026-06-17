import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_TYPE, getREPalette, MIN_TOUCH } from '../../../config/re-theme';
import type { REAddonComponent } from '../../../types';
import { buildA11yLabel } from '../../../utils/re-ui-helpers';

export interface REAddonSubCardProps {
  component: REAddonComponent;
  memberLabel?: string;          // friendly "For Aarav" / segment label
  onAccept?: () => void;
  onReject?: () => void;
  unavailable?: boolean;         // no dish → show class label only
}

/**
 * @summary Member add-on as a quiet, secondary sub-card (never primary-sized; care framing).
 */
export default function REAddonSubCard({ component, memberLabel, onAccept, onReject, unavailable }: REAddonSubCardProps) {
  const c = getREPalette('light');
  const who = memberLabel ?? component.targetMemberSegment;
  const label = `+ For ${who}: ${component.addonClassName}${unavailable ? ' (coming soon)' : ''}`;
  return (
    <View style={[styles.wrap, { borderColor: c.border }]} accessibilityLabel={buildA11yLabel(label, { hint: 'add-on, secondary' })}>
      <Text style={[styles.text, { color: c.textSecondary }]} numberOfLines={2}>{label}</Text>
      {onAccept || onReject ? (
        <View style={styles.actions}>
          {onAccept ? (
            <Pressable onPress={onAccept} accessibilityRole="button" accessibilityLabel={`Accept add-on for ${who}`} hitSlop={10} style={styles.act}>
              <Text style={{ color: c.primary }}>✓</Text>
            </Pressable>
          ) : null}
          {onReject ? (
            <Pressable onPress={onReject} accessibilityRole="button" accessibilityLabel={`Skip add-on for ${who}`} hitSlop={10} style={styles.act}>
              <Text style={{ color: c.textSecondary }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, marginTop: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderLeftWidth: 3,
  },
  text: { ...RE_TYPE.subLabel, flex: 1, marginRight: SPACING.sm },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  act: { minWidth: MIN_TOUCH / 1.3, minHeight: MIN_TOUCH / 1.3, alignItems: 'center', justifyContent: 'center' },
});
