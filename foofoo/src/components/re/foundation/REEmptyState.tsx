import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, RE_TYPE, getREPalette } from '../../../config/re-theme';
import { emptyStateContent, EmptyKind } from '../../../utils/re-ui-helpers';
import REButton from './REButton';

export interface REEmptyStateProps {
  kind: EmptyKind;
  onCta?: () => void;
}

/**
 * @summary Warm empty state — always a kind next step, never a dead end.
 */
export default function REEmptyState({ kind, onCta }: REEmptyStateProps) {
  const c = getREPalette('light');
  const { title, body, ctaLabel } = emptyStateContent(kind);
  return (
    <View accessibilityRole="summary" style={styles.wrap}>
      <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      {body ? <Text style={[styles.body, { color: c.textSecondary }]}>{body}</Text> : null}
      {ctaLabel && onCta ? <View style={styles.cta}><REButton title={ctaLabel} onPress={onCta} /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: SPACING.xl, alignItems: 'center' },
  title: { ...RE_TYPE.title, textAlign: 'center', marginBottom: SPACING.sm },
  body: { ...RE_TYPE.body, textAlign: 'center' },
  cta: { marginTop: SPACING.lg },
});
