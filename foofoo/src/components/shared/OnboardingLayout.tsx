import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';

interface OnboardingLayoutProps {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  /** Pass true for bucket steps that render their own bottom bar */
  hideFooter?: boolean;
}

/**
 * @summary Shared wrapper for all 7 onboarding steps.
 *
 * @description Renders progress bar, step counter, back arrow, title/subtitle,
 *   scrollable content area, and Next button. Wraps children in KeyboardAvoidingView
 *   so text inputs don't get obscured by the soft keyboard.
 *
 * @calledBy All app/(onboarding)/step-*.tsx screens
 */
export function OnboardingLayout({
  step,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextDisabled = false,
  nextLabel = 'Next',
  hideFooter = false,
}: OnboardingLayoutProps) {
  const progressPct = `${(step / 7) * 100}%`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: progressPct as `${number}%` }]} />
        </View>

        {/* Header row */}
        <View style={styles.header}>
          {step > 1 && onBack ? (
            <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <Text style={styles.stepCounter}>Step {step} of 7</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </ScrollView>

        {/* Footer */}
        {!hideFooter && (
          <View style={styles.footer}>
            <Pressable
              style={[styles.nextBtn, nextDisabled && styles.nextBtnDisabled]}
              onPress={nextDisabled ? undefined : onNext}
              accessibilityRole="button"
              accessibilityState={{ disabled: nextDisabled }}
            >
              <Text style={styles.nextBtnText}>{nextLabel}</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  progressBg: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  headerSpacer: { width: 36 },
  stepCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  footer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
