import React from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { SPACING, RE_TYPE, getREPalette } from '../../config/re-theme';
import REProgressHeader from './onboarding/REProgressHeader';
import REButton from './foundation/REButton';

export interface REOnboardingLayoutProps {
  step: number;          // 1-based, out of 9
  total?: number;        // default 9
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  showSkip?: boolean;
  onSkip?: () => void;
  children: React.ReactNode;
}

/**
 * @summary RE-flavoured onboarding screen wrapper: progress header + scrollable body + next button.
 *
 * @description Replaces the legacy OnboardingLayout for all (re-onboarding) steps so every step
 *   uses the RE palette, REProgressHeader progress bar, and RE-styled CTA button.
 *   Children are the question body (REQuestionCard + input controls).
 */
export default function REOnboardingLayout({
  step, total = 9, title, subtitle, onBack, onNext, nextDisabled = false,
  nextLabel = 'Next', showSkip = false, onSkip, children,
}: REOnboardingLayoutProps) {
  const c = getREPalette('light');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <REProgressHeader
          step={step}
          total={total}
          onBack={onBack}
          onSkip={onSkip}
          showSkip={showSkip}
        />

        <View style={styles.body}>
          {title ? <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text> : null}
          {subtitle ? <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text> : null}
          {children}
        </View>

        <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
          <REButton
            title={nextLabel}
            variant="primary"
            onPress={onNext}
            disabled={nextDisabled}
            accessibilityLabel={nextLabel}
          />
          {showSkip && onSkip && (
            <REButton
              title="Skip for now"
              variant="ghost"
              onPress={onSkip}
              accessibilityLabel="Skip this step"
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  title: { ...RE_TYPE.display, marginBottom: SPACING.xs },
  subtitle: { ...RE_TYPE.body, marginBottom: SPACING.lg },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.xs,
  },
});
