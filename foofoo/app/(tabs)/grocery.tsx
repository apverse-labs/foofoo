/**
 * @summary Grocery List tab — categorised ingredients for today or this week.
 *
 * @description
 * Reads today's planner row(s) and surfaces unique ingredients grouped by
 * category. Toggle between Today / Week. Checkbox state is in-memory only
 * (decision: persisted shopping state is a Phase 1 feature — see Doc 12A).
 * Includes empty state + share-to-clipboard action.
 *
 * Logs:
 *   suggestion_logs: action='tapped_ingredients', meal_slot='all' on mount
 *   app_events: screen_view on mount
 *
 * @calledBy Expo Router — Grocery tab
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
  ActivityIndicator, Alert, Platform, Share,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/services/supabase';
import { getGroceryList } from '../../src/repositories/grocery.repository';
import { getTodayIST } from '../../src/repositories/plans.repository';
import { logScreenView, logSuggestionAction, logFeatureTap } from '../../src/repositories/feedback.repository';
import { PostHogService } from '../../src/services/posthog.service';
import { Logger } from '../../src/utils/systemLogger';
import { COLORS, SPACING, BORDER_RADIUS, APP_NAME } from '../../src/config/constants';
import { useResponsive } from '../../src/utils/responsive';
import GroceryCategorySection from '../../src/components/grocery/GroceryCategorySection';
import type { GroceryCategory } from '../../src/types';

export default function GroceryTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentWidth } = useResponsive();
  const [userId, setUserId] = useState<string>('');
  const [mode, setMode] = useState<'today' | 'week'>('today');
  const [planDate] = useState(getTodayIST);
  const [groups, setGroups] = useState<GroceryCategory[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.ingredients.length, 0),
    [groups],
  );
  const checkedCount = checkedIds.size;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const load = useCallback(async (showSpinner = true) => {
    if (!userId) return;
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const list = await getGroceryList(userId, planDate, mode === 'week');
      setGroups(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Logger.error('GROCERY', 'Load failed', { error: msg });
      setError('Could not load your grocery list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, planDate, mode]);

  useEffect(() => { load(true); }, [load]);

  // Log screen_view + tapped_ingredients on every focus (not just initial mount),
  // so navigating away and back creates a fresh log row — that's the funnel signal.
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    logScreenView(userId, 'grocery', { mode });
    PostHogService.screen('grocery', { mode });
    logSuggestionAction(userId, null, planDate, 'all', 'tapped_ingredients', 0).catch(() => {});
  }, [userId, planDate, mode]));

  const handleToggleItem = (id: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCheckAll = (ids: number[]) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      const allChecked = ids.every(id => next.has(id));
      if (allChecked) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handleClearChecked = () => {
    setCheckedIds(new Set());
    if (userId) logFeatureTap(userId, 'grocery_clear_checked', { screen: 'grocery' });
  };

  const buildShareText = (): string => {
    const lines = [`${APP_NAME} Grocery List — ${planDate}`, ''];
    for (const g of groups) {
      if (!g.ingredients.length) continue;
      lines.push(`${g.emoji} ${g.displayName}:`);
      for (const ing of g.ingredients) lines.push(`  □ ${ing.name}`);
      lines.push('');
    }
    return lines.join('\n').trim();
  };

  const handleShare = async () => {
    if (groups.length === 0) {
      Alert.alert('Nothing to share', 'Your grocery list is empty.');
      return;
    }
    const text = buildShareText();
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        Alert.alert('Copied!', 'Grocery list copied to clipboard.');
      } else {
        await Share.share({ message: text });
      }
      if (userId) logFeatureTap(userId, 'grocery_share', { screen: 'grocery', mode });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Logger.warn('GROCERY', 'Share failed', { error: msg });
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(false);
  }, [load]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.contentColumn, { maxWidth: contentWidth }]}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>Grocery List</Text>
            <Text style={styles.subtitle}>
              {mode === 'today' ? 'For today' : 'For this week'} · {totalCount} ingredient{totalCount === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.toggleWrap}>
            <Pressable
              onPress={() => setMode('today')}
              style={[styles.togglePill, mode === 'today' && styles.togglePillActive]}
            >
              <Text style={[styles.toggleText, mode === 'today' && styles.toggleTextActive]}>Today</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('week')}
              style={[styles.togglePill, mode === 'week' && styles.togglePillActive]}
            >
              <Text style={[styles.toggleText, mode === 'week' && styles.toggleTextActive]}>Week</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
        >
          {error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => load(true)}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </Pressable>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyTitle}>Plan your meals first</Text>
              <Text style={styles.emptySub}>Generate a meal plan from the Home tab</Text>
              <Pressable style={styles.goHomeBtn} onPress={() => router.push('/(tabs)' as never)}>
                <Text style={styles.goHomeText}>Go to Home</Text>
              </Pressable>
            </View>
          ) : (
            groups.map(g => (
              <GroceryCategorySection
                key={g.category}
                group={g}
                checkedIds={checkedIds}
                onToggleItem={handleToggleItem}
                onCheckAll={handleCheckAll}
              />
            ))
          )}
        </ScrollView>

        {groups.length > 0 && (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
            <Text style={styles.bottomCount}>
              <Text style={styles.bottomCountStrong}>{checkedCount}</Text> of {totalCount} items
            </Text>
            <Pressable style={styles.clearBtn} onPress={handleClearChecked} disabled={checkedCount === 0}>
              <Text style={[styles.clearText, checkedCount === 0 && styles.disabled]}>Clear</Text>
            </Pressable>
            <Pressable style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareText}>📤 Share list</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center' },
  contentColumn: { width: '100%', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  toggleWrap: {
    flexDirection: 'row', backgroundColor: '#F1F3F2',
    borderRadius: BORDER_RADIUS.full, padding: 3,
  },
  togglePill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  togglePillActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md, gap: SPACING.md },
  errorText: { fontSize: 14, color: COLORS.error, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  empty: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  goHomeBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl, paddingVertical: 12,
    borderRadius: BORDER_RADIUS.full,
  },
  goHomeText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  bottomCount: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  bottomCountStrong: { color: COLORS.textPrimary, fontWeight: '700' },
  clearBtn: { paddingHorizontal: SPACING.md, paddingVertical: 10 },
  clearText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  shareBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
  },
  shareText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
