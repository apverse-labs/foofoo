import React from 'react';
import { ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_TYPE, getREPalette } from '../../../config/re-theme';
import type { REDishCandidate } from '../../../types';

export interface REDishCarouselProps {
  candidates: REDishCandidate[];
  onSelect: (dish: REDishCandidate) => void;
  onDetails?: (dish: REDishCandidate) => void;
  emptyText?: string;
}

/**
 * @summary Horizontal rail of ranked dish options (all share one meal class by construction).
 */
export default function REDishCarousel({ candidates, onSelect, onDetails, emptyText }: REDishCarouselProps) {
  const c = getREPalette('light');
  if (candidates.length === 0) {
    return <Text style={[styles.empty, { color: c.textSecondary }]}>{emptyText ?? 'Great options coming soon'}</Text>;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {candidates.map((d) => (
        <Pressable key={d.dishOptionId} onPress={() => onSelect(d)}
          onLongPress={onDetails ? () => onDetails(d) : undefined}
          accessibilityRole="button" accessibilityLabel={`Choose ${d.dishName}`}
          style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={2}>{d.dishName}</Text>
          {d.regionRelevance ? <Text style={[styles.meta, { color: c.textSecondary }]} numberOfLines={1}>{d.regionRelevance}</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  card: { width: 150, minHeight: 72, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  name: { ...RE_TYPE.body, fontWeight: '600' },
  meta: { ...RE_TYPE.caption, marginTop: 4 },
  empty: { ...RE_TYPE.body, padding: SPACING.md },
});
