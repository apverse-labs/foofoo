/**
 * @summary Stateless helper components for the Home screen (loading, error, empty states).
 * @calledBy app/(tabs)/index.tsx
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import { useResponsive } from '../../utils/responsive';

/**
 * @summary Full-screen skeleton shown while the plan is loading on first mount.
 *
 * @param {{ insetTop: number }} props - Safe-area top inset to pad the top bar
 * @returns {JSX.Element} Three skeleton meal-card placeholders with the Foofoo header
 *
 * @calledBy `app/(tabs)/index.tsx` — rendered when loading=true and not refreshing
 */
export function LoadingScreen({ insetTop }: { insetTop: number }) {
  const { contentWidth, cardWidth } = useResponsive();
  return (
    <View style={[styles.container, { paddingTop: insetTop }]}>
      <View style={[styles.contentColumn, { maxWidth: contentWidth }]}>
        <View style={styles.topBar}>
          <Text style={styles.appName}>Foofoo</Text>
        </View>
        <View style={styles.scrollContent}>
          {(['BREAKFAST', 'LUNCH', 'DINNER'] as const).map(label => (
            <View key={label} style={styles.cardWrapper}>
              <View style={[styles.skeletonCard, { width: cardWidth }]}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={styles.skeletonText}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * @summary Inline error state shown inside the scroll view when plan loading fails.
 *
 * @param {{ message: string; onRetry: () => void }} props
 * @returns {JSX.Element} Friendly error message with a retry button
 *
 * @calledBy `app/(tabs)/index.tsx` — rendered when error state is set
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centerContent}>
      <Text style={styles.errorText}>Couldn't load your plan.</Text>
      <Text style={styles.errorSub}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </Pressable>
    </View>
  );
}

/**
 * @summary Inline empty state shown when plan generation returns no dishes.
 *
 * @returns {JSX.Element} Friendly message prompting the user to check back later
 *
 * @calledBy `app/(tabs)/index.tsx` — rendered when plan is null after loading
 */
export function EmptyState() {
  return (
    <View style={styles.centerContent}>
      <Text style={styles.emptyText}>We're still adding dishes! Check back soon. 🍲</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center' },
  contentColumn: { width: '100%', flex: 1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  appName: { fontSize: 24, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  scrollContent: { gap: SPACING.md, paddingTop: SPACING.sm, paddingHorizontal: SPACING.md },
  cardWrapper: { gap: 6, alignItems: 'center' },
  skeletonCard: {
    height: 200, borderRadius: BORDER_RADIUS.lg, backgroundColor: '#e8e8e8',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  skeletonText: { color: '#9e9e9e', fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  errorText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  errorSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },
});
