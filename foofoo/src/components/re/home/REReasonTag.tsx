import React from 'react';
import REChip from '../foundation/REChip';
import { buildReasonText, ReasonSignal } from '../../../utils/re-reason-tags';

export interface REReasonTagProps {
  topSignal: ReasonSignal;
  supporting?: ReasonSignal[];
  onPress?: () => void;   // open "why this?" sheet
}

/**
 * @summary "Why this?" trust chip backed by DOC-19 signals (short, never machinery).
 */
export default function REReasonTag({ topSignal, supporting, onPress }: REReasonTagProps) {
  return (
    <REChip
      label={buildReasonText(topSignal, supporting)}
      variant="reason"
      onPress={onPress}
      accessibilityHint={onPress ? 'See why this was suggested' : undefined}
    />
  );
}
