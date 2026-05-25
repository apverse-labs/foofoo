/**
 * BucketSelector — tap-to-cycle cuisine/meal preference sorter for onboarding.
 * Consumed by app/(onboarding)/step-4.tsx, step-5.tsx, step-6.tsx.
 * Populated by cuisines or dish items from onboarding.repository.
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, Pressable, ScrollView, Modal, TouchableOpacity,
} from 'react-native';
import { COLORS, TIMING } from '../../config/constants';
import type { BucketItem, BucketMap, BucketType } from '../../types';
import { styles } from './BucketSelector.styles';

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

  /**
   * @summary Directly assigns a chip to a specific bucket (used by the long-press picker sheet).
   * @param {string} id - Item ID to assign
   * @param {BucketType | null} bucket - Target bucket, or null to leave unsorted
   */
  const assignBucket = (id: string, bucket: BucketType | null) => {
    setBucketMap((prev) => ({ ...prev, [id]: bucket }));
  };

  /**
   * @summary Cycles a chip through the bucket sequence: null → F → O → N → null.
   * @param {string} id - Item ID to cycle
   */
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

  /**
   * @summary Builds the final BucketMap (defaulting unsorted to O) and calls onComplete.
   * @description Unsorted items default to Occasional so nothing is silently lost.
   */
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
                    delayLongPress={TIMING.LONG_PRESS_MS}
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

