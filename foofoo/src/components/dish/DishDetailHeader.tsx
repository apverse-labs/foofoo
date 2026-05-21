/**
 * @summary Hero area for the Meal Detail page — full-bleed image + gradient + dish name.
 *
 * @description Top 40% of the screen. Shows hero image with blurhash placeholder,
 *   a back arrow (white, top-left), a gradient overlay on the bottom 30%, and
 *   the dish name + cuisine tag rendered over the gradient.
 *
 * @calledBy app/dish/[id].tsx
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TIMING } from '../../config/constants';
import type { FullDish } from '../../types';

const PLACEHOLDER_HASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);

interface Props {
  dish: FullDish;
  onBack: () => void;
}

/**
 * @summary Renders the hero image + cuisine chip + dish name overlay.
 * @param {Props} props - dish object and back handler
 * @returns {JSX.Element}
 * @calledBy app/dish/[id].tsx
 */
export default function DishDetailHeader({ dish, onBack }: Props) {
  const cuisineName = dish.cuisines?.display_name ?? dish.cuisines?.name ?? '';
  return (
    <View style={[styles.hero, { height: HERO_HEIGHT }]}>
      <Image
        source={{ uri: dish.hero_image_url ?? `https://picsum.photos/seed/${dish.slug}/800/600` }}
        placeholder={dish.blurhash ?? PLACEHOLDER_HASH}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
        transition={TIMING.IMAGE_TRANSITION_MS}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0, y: 1 }}
      />
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={12}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Text style={styles.backText}>‹</Text>
      </Pressable>

      <View style={styles.bottomOverlay}>
        {cuisineName ? <Text style={styles.cuisineChip}>{cuisineName}</Text> : null}
        <Text style={styles.dishName} numberOfLines={2}>{dish.name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', backgroundColor: '#1a1a1a', overflow: 'hidden' },
  gradient: { ...StyleSheet.absoluteFillObject },
  backBtn: {
    position: 'absolute', top: SPACING.md, left: SPACING.md,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#fff', fontSize: 28, lineHeight: 28, marginTop: -2 },
  bottomOverlay: {
    position: 'absolute', left: SPACING.md, right: SPACING.md, bottom: SPACING.md,
    gap: SPACING.xs,
  },
  cuisineChip: {
    alignSelf: 'flex-start',
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dishName: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  __unused: { color: COLORS.primary },
});
