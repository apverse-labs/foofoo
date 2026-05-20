import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import type { BucketItem, BucketMap, BucketType } from '../../types';

interface BucketSelectorProps {
  items: BucketItem[];
  onComplete: (buckets: BucketMap) => void;
  initialBuckets?: BucketMap;
}

const BUCKET_CONFIG = {
  F: { label: 'Frequently', color: COLORS.primary,  bgColor: `${COLORS.primary}15`  },
  O: { label: 'Occasionally', color: '#E67E22',     bgColor: '#E67E2215'             },
  N: { label: 'Never',       color: COLORS.error,   bgColor: `${COLORS.error}15`     },
} as const;

/**
 * @summary Tap-to-cycle bucket sorter for cuisine and meal preferences.
 *
 * @description Items cycle through: Unsorted → Frequently (green) →
 *   Occasionally (orange) → Never (red) → Unsorted on each tap.
 *   "Next" button activates only when all items are sorted.
 *   Calls onComplete with the final F/O/N bucket map.
 *
 * @param {BucketItem[]} items - Items to sort (id, label, emoji)
 * @param {(buckets: BucketMap) => void} onComplete - Called when Next is pressed after all sorted
 * @param {BucketMap} [initialBuckets] - Pre-populated bucket state (resume support)
 *
 * @calledBy Steps 4, 5, 6 — cuisine and meal bucket onboarding screens
 */
export function BucketSelector({ items, onComplete, initialBuckets }: BucketSelectorProps) {
  const [bucketMap, setBucketMap] = useState<Record<string, BucketType | null>>(() => {
    const initial: Record<string, BucketType | null> = {};
    items.forEach((item) => { initial[item.id] = null; });
    if (initialBuckets) {
      initialBuckets.F.forEach((id) => { initial[id] = 'F'; });
      initialBuckets.O.forEach((id) => { initial[id] = 'O'; });
      initialBuckets.N.forEach((id) => { initial[id] = 'N'; });
    }
    return initial;
  });

  const cycleItem = (id: string) => {
    setBucketMap((prev) => {
      const current = prev[id];
      const next: BucketType | null =
        current === null ? 'F' : current === 'F' ? 'O' : current === 'O' ? 'N' : null;
      return { ...prev, [id]: next };
    });
  };

  const { unsorted, sorted, buckets } = useMemo(() => {
    const unsorted: BucketItem[] = [];
    const sorted: BucketItem[] = [];
    const buckets: BucketMap = { F: [], O: [], N: [] };
    items.forEach((item) => {
      const b = bucketMap[item.id];
      if (b === null) {
        unsorted.push(item);
      } else {
        sorted.push(item);
        buckets[b].push(item.id);
      }
    });
    return { unsorted, sorted, buckets };
  }, [items, bucketMap]);

  const allSorted = unsorted.length === 0 && items.length > 0;

  const handleNext = () => {
    if (allSorted) onComplete(buckets);
  };

  return (
    <View style={styles.container}>
      {/* Bucket columns */}
      <View style={styles.bucketsRow}>
        {(['F', 'O', 'N'] as BucketType[]).map((b) => {
          const cfg = BUCKET_CONFIG[b];
          const bucketItems = items.filter((item) => bucketMap[item.id] === b);
          return (
            <View key={b} style={[styles.bucketCol, { borderTopColor: cfg.color }]}>
              <View style={[styles.bucketHeader, { backgroundColor: cfg.bgColor }]}>
                <Text style={[styles.bucketLabel, { color: cfg.color }]}>{cfg.label}</Text>
                <View style={[styles.badge, { backgroundColor: cfg.color }]}>
                  <Text style={styles.badgeText}>{bucketItems.length}</Text>
                </View>
              </View>
              <ScrollView style={styles.bucketContent} nestedScrollEnabled>
                {bucketItems.map((item) => (
                  <Pressable key={item.id} onPress={() => cycleItem(item.id)}>
                    <View style={[styles.bucketChip, { borderColor: cfg.color, backgroundColor: cfg.bgColor }]}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {item.emoji ? `${item.emoji} ` : ''}{item.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </View>

      {/* Unsorted grid */}
      <View style={styles.unsortedSection}>
        <Text style={styles.unsortedTitle}>Tap to sort ↑</Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.unsortedScroll}
          nestedScrollEnabled
        >
          <View style={styles.chipGrid}>
            {unsorted.map((item) => (
              <Pressable
                key={item.id}
                style={styles.unsortedChip}
                onPress={() => cycleItem(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Sort ${item.label}`}
              >
                <Text style={styles.unsortedChipText} numberOfLines={1}>
                  {item.emoji ? `${item.emoji} ` : ''}{item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.progress}>
          {sorted.length} of {items.length} sorted
        </Text>
        <Pressable
          style={[styles.nextBtn, !allSorted && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!allSorted}
          accessibilityRole="button"
          accessibilityState={{ disabled: !allSorted }}
        >
          <Text style={styles.nextBtnText}>Next →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bucketsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  bucketCol: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    borderTopWidth: 3,
    backgroundColor: COLORS.surface,
    minHeight: 160,
    maxHeight: 220,
    overflow: 'hidden',
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  bucketLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  badge: {
    borderRadius: BORDER_RADIUS.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  bucketContent: { flex: 1, padding: SPACING.xs },
  bucketChip: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    marginBottom: SPACING.xs,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary },
  unsortedSection: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  unsortedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unsortedScroll: { flex: 1 },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  unsortedChip: {
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unsortedChipText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  progress: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.lg,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: COLORS.border },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
