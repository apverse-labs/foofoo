import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SPACING, RE_TYPE, getREPalette } from '../../../config/re-theme';

export interface REQuestionCardProps {
  title: string;
  subtitle?: string;
  whyWeAsk?: string;        // tap-to-reveal rationale (trust)
  onWhy?: () => void;
  children?: React.ReactNode; // the input slot (chips, selectors, swipe deck)
}

/**
 * @summary Onboarding screen scaffold: warm title + subtitle + optional "why we ask" + input slot.
 * @description Presentational; one question per screen (Apple restraint). No data/logic.
 */
export default function REQuestionCard({ title, subtitle, whyWeAsk, onWhy, children }: REQuestionCardProps) {
  const c = getREPalette('light');
  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text> : null}
      {whyWeAsk && onWhy ? (
        <Pressable onPress={onWhy} accessibilityRole="button" accessibilityLabel="Why we ask" hitSlop={8} style={styles.why}>
          <Text style={[styles.whyText, { color: c.primary }]}>Why we ask?</Text>
        </Pressable>
      ) : null}
      <View style={styles.slot}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { ...RE_TYPE.display, marginBottom: SPACING.sm },
  subtitle: { ...RE_TYPE.body, marginBottom: SPACING.md },
  why: { alignSelf: 'flex-start', marginBottom: SPACING.md },
  whyText: { ...RE_TYPE.caption, fontWeight: '600' },
  slot: { marginTop: SPACING.sm },
});
