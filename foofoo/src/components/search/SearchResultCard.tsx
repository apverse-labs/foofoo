/**
 * @summary Compact 2-column grid card for a single search result dish.
 *
 * @description
 * Square-ish card: hero image at top (1:1 area), text below.
 * - Tap → navigate to /dish/[id]
 * - Long press (300ms) → trigger slot picker overlay via onLongPress
 * Diet type dot (green/red/yellow) shown in top-left of image.
 * Cook time pill shown in bottom-right of image.
 *
 * @calledBy app/(tabs)/search.tsx — grid of results / trending
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SPACING, BORDER_RADIUS, TIMING } from '../../config/constants';
import type { SearchResult } from '../../repositories/search.repository';

interface Props {
  dish: SearchResult;
  onPress: () => void;
  onLongPress: () => void;
  width: number;
}

/**
 * @summary Picks a colour dot for the diet type indicator.
 * @param {string} diet - diet_type code
 * @returns {string} hex colour
 */
function dietColor(diet: string): string {
  switch (diet) {
    case 'veg': return '#2D6A4F';
    case 'non_veg': return '#D62828';
    case 'egg': return '#F1B40F';
    case 'vegan': return '#74C69D';
    case 'jain': return '#9D4EDD';
    default: return COLORS.textSecondary;
  }
}

/**
 * @summary Renders one SearchResultCard.
 * @param {Props} props - dish row, press handlers, target width
 * @returns {JSX.Element}
 */
export default function SearchResultCard({ dish, onPress, onLongPress, width }: Props) {
  return (
    <Pressable
      style={[styles.card, { width }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={TIMING.LONG_PRESS_MS}
      accessibilityLabel={`Dish ${dish.name}`}
    >
      <View style={[styles.imageWrap, { width, height: width }]}>
        <Image
          source={{ uri: dish.hero_image_url ?? `https://picsum.photos/seed/dish-${dish.id}/300/300` }}
          placeholder={dish.blurhash ?? 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'}
          contentFit="cover"
          style={styles.image}
        />
        <View style={[styles.dietDot, { backgroundColor: dietColor(dish.diet_type) }]} />
        <View style={styles.timePill}>
          <Text style={styles.timeText}>{dish.cook_time_mins}m</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{dish.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {dish.cuisines?.display_name ?? dish.cuisines?.name ?? '—'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  imageWrap: { position: 'relative', backgroundColor: '#eee' },
  image: { width: '100%', height: '100%' },
  dietDot: {
    position: 'absolute', top: 8, left: 8,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#fff',
  },
  timePill: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  timeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  body: { padding: SPACING.sm, gap: 2 },
  name: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 11, color: COLORS.textSecondary },
});
