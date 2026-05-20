import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Modal, TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';
import type { BucketItem, BucketMap, BucketType } from '../../types';

interface BucketSelectorProps {
  items: BucketItem[];
  onComplete: (buckets: BucketMap) => void;
  initialBuckets?: BucketMap;
}

const BUCKET_CONFIG = {
  F: { label: 'Frequently',   color: COLORS.primary, bgColor: `${COLORS.primary}15` },
  O: { label: 'Occasionally', color: '#E67E22',      bgColor: '#E67E2215'            },
  N: { label: 'Never',        color: COLORS.error,   bgColor: `${COLORS.error}15`    },
} as const;

/**
 * @summary Tap-to-cycle bucket sorter for cuisine and meal preferences.
 *
 * @description Items cycle: Unsorted → Frequently → Occasionally → Never → Unsorted.
 *   Long-pressing any chip opens a bottom sheet for direct bucket selection.
 *   "Next" is always enabled — unsorted items default to Occasionally on submit.
 *   Calls onComplete with the final F/O/N bucket map.
 *
 * @param {BucketItem[]} items - Items to sort (id, label, emoji)
 * @param {(buckets: BucketMap) => void} onComplete - Called when Next is pressed
 * @param {BucketMap} [initialBuckets] - Pre-populated state (resume support)
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

  const [pickerChipId, setPickerChipId] = useState<string | null>(null);

  const assignBucket = (id: string, bucket: BucketType | null) => {
    setBucketMap((prev) => ({ ...prev, [id]: bucket }));
  };

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

  // Unsorted items default to Occasional so nothing is ever lost.
  const handleNext = () => {
    const finalBuckets: BucketMap = {
      F: [...buckets.F],
      O: [...buckets.O, ...unsorted.map((item) => item.id)],
      N: [...buckets.N],
    };
    onComplete(finalBuckets);
  };

  const pickerItem = pickerChipId ? items.find((i) => i.id === pickerChipId) : null;

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
                  <Pressable
                    key={item.id}
                    onPress={() => cycleItem(item.id)}
                    onLongPress={() => setPickerChipId(item.id)}
                    delayLongPress={300}
                  >
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
        <Text style={styles.unsortedTitle}>
          Tap to cycle · Long press to pick directly · Unselected = Occasional
        </Text>
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
                onLongPress={() => setPickerChipId(item.id)}
                delayLongPress={300}
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
        {unsorted.length > 0 && (
          <Text style={styles.unsortedHint}>
            Unselected items will be set to Occasional
          </Text>
        )}
      </View>

      {/* Bottom bar — Next is always enabled */}
      <View style={styles.bottomBar}>
        <Text style={styles.progress}>
          {unsorted.length === 0
            ? 'All sorted ✓'
            : `${sorted.length} sorted · ${unsorted.length} → Occasional`}
        </Text>
        <Pressable
          style={styles.nextBtn}
          onPress={handleNext}
          accessibilityRole="button"
        >
          <Text style={styles.nextBtnText}>Next →</Text>
        </Pressable>
      </View>

      {/* Long-press direct-selection bottom sheet */}
      {pickerItem && (
        <Modal
          transparent
          visible={pickerChipId !== null}
          animationType="fade"
          onRequestClose={() => setPickerChipId(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setPickerChipId(null)}
          >
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerTitle} numberOfLines={1}>
                {pickerItem.emoji ? `${pickerItem.emoji} ` : ''}{pickerItem.label}
              </Text>
              {(['F', 'O', 'N'] as BucketType[]).map((b) => {
                const cfg = BUCKET_CONFIG[b];
                return (
                  <TouchableOpacity
                    key={b}
                    style={styles.pickerRow}
                    onPress={() => { assignBucket(pickerChipId!, b); setPickerChipId(null); }}
                  >
                    <View style={[styles.pickerDot, { backgroundColor: cfg.color }]} />
                    <Text style={[styles.pickerOptionLabel, { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => { assignBucket(pickerChipId!, null); setPickerChipId(null); }}
              >
                <View style={[styles.pickerDot, { backgroundColor: '#999' }]} />
                <Text style={[styles.pickerOptionLabel, { color: '#999' }]}>
                  Leave unselected
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  unsortedHint: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
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
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Direct-picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.xs,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pickerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickerOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});
