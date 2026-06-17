import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config/constants';

export interface PersonaTag {
  emoji: string;
  label: string;
}

/**
 * @summary A single persona tag chip that fades + slides in on mount.
 */
function AnimatedChip({ tag }: { tag: PersonaTag }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        styles.chip,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <Text style={styles.chipEmoji}>{tag.emoji}</Text>
      <Text style={styles.chipLabel} numberOfLines={1}>{tag.label}</Text>
    </Animated.View>
  );
}

/**
 * @summary Persona "food identity" card that builds up tags as onboarding progresses.
 *
 * @description Tags animate in one by one. Shows an empty state until the first
 *   tag is added. Used across the RE onboarding flow.
 *
 * @param {PersonaTag[]} tags - Ordered list of food-identity tags to render.
 */
export default function PersonaCard({ tags }: { tags: PersonaTag[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Your food identity</Text>
      {tags.length === 0 ? (
        <Text style={styles.empty}>Building your profile…</Text>
      ) : (
        <View style={styles.chips}>
          {tags.map((t, i) => (
            <AnimatedChip key={`${t.label}-${i}`} tag={t} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  header: { fontSize: 13, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.primary}12`,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, maxWidth: 160 },
});
