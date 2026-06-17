import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { RE_TYPE, getREPalette } from '../../../config/re-theme';
import { confidenceCopy, confidenceLabel } from '../../../utils/re-reason-tags';

export interface REConfidenceTagProps { confidence: number; }

/**
 * @summary Honest confidence line — never shows a raw number to the user.
 */
export default function REConfidenceTag({ confidence }: REConfidenceTagProps) {
  const c = getREPalette('light');
  return (
    <Text accessibilityLabel={`Confidence: ${confidenceLabel(confidence)}`} style={[styles.text, { color: c.textSecondary }]}>
      {confidenceCopy(confidence)}
    </Text>
  );
}

const styles = StyleSheet.create({ text: { ...RE_TYPE.caption, fontStyle: 'italic' } });
