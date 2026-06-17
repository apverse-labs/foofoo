import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, RE_TYPE, getREPalette } from '../../../config/re-theme';
import { errorContent, REErrorCode } from '../../../utils/re-ui-helpers';
import REButton from './REButton';

export interface REErrorStateProps {
  code: REErrorCode;
  onRetry?: () => void;
  onPrimary?: () => void;   // for non-retry CTAs (e.g. Set diet)
}

/**
 * @summary Warm, non-technical error state mapped to DOC-23 codes.
 * @description Constraint errors never imply unsafe food; retryable codes show Retry.
 */
export default function REErrorState({ code, onRetry, onPrimary }: REErrorStateProps) {
  const c = getREPalette('light');
  const { title, body, ctaLabel, retryable } = errorContent(code);
  const handlePress = retryable ? onRetry : onPrimary;
  return (
    <View accessibilityRole="alert" style={styles.wrap}>
      <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>{body}</Text>
      {ctaLabel && handlePress ? (
        <View style={styles.cta}>
          <REButton title={ctaLabel} variant={retryable ? 'primary' : 'secondary'} onPress={handlePress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: SPACING.xl, alignItems: 'center' },
  title: { ...RE_TYPE.title, textAlign: 'center', marginBottom: SPACING.sm },
  body: { ...RE_TYPE.body, textAlign: 'center' },
  cta: { marginTop: SPACING.lg },
});
