import { useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useClientInsets } from '../../src/hooks/useClientInsets';
import { useClientWindowDimensions } from '../../src/hooks/useClientWindowDimensions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS } from '../../src/config/constants';

const SLIDES = [
  {
    emoji: '😩',
    bg: '#E8F5EE',
    headline: 'ARE YOU TIRED',
    subtext: 'of deciding what to cook or eat every single day?',
  },
  {
    emoji: '🤖',
    bg: '#FFF3EE',
    headline: 'WHAT IF',
    subtext: 'you never had to worry about it ever again?',
  },
  {
    emoji: '🎯',
    bg: '#EEF3FF',
    headline: 'FIND YOUR RHYTHM',
    subtext: 'in just 2 weeks of using Foofoo',
  },
] as const;

/**
 * @summary Three-slide intro carousel shown once to new users before auth.
 *
 * @description Full-screen horizontal paging ScrollView with per-slide
 * background colours. Page dot indicators reflect current position. A skip
 * button in the top-right bypasses remaining slides. The final slide shows a
 * "Let's Go" CTA — all paths converge on /(auth)/auth-gate.
 *
 * @calledBy
 * - `app/splash.tsx` — auto-navigates here after 2 s
 */
export default function IntroScreen() {
  const router = useRouter();
  const insets = useClientInsets();
  const { width: SW, height: SH } = useClientWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * @summary Marks the intro as seen and routes to the auth gate.
   *
   * @description Writing INTRO_SEEN here (not in app/index.tsx) means a
   *   force-quit during splash or earlier slides will replay the intro on the
   *   next launch — the flag only flips once the user has actually exited.
   */
  const handleSkip = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.INTRO_SEEN, 'true');
    router.replace('/(auth)/auth-gate');
  };

  /**
   * @summary Updates the active dot indicator when a slide scroll settles.
   *
   * @param {NativeSyntheticEvent<NativeScrollEvent>} e - Native scroll event
   */
  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setCurrentIndex(idx);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.scroller}
      >
        {SLIDES.map((slide, i) => (
          <View
            key={i}
            style={[
              styles.slide,
              {
                width: SW,
                height: SH,
                backgroundColor: slide.bg,
                paddingTop: insets.top + 96,
                paddingBottom: insets.bottom + 180,
              },
            ]}
          >
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.headline}>{slide.headline}</Text>
            <Text style={styles.subtext}>{slide.subtext}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Skip — top right, clears status bar */}
      <Pressable
        style={[styles.skipButton, { top: insets.top + SPACING.md }]}
        onPress={handleSkip}
        hitSlop={8}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Footer: dots always visible; CTA on last slide */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.xl }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {currentIndex === SLIDES.length - 1 && (
          <Pressable style={styles.ctaButton} onPress={handleSkip}>
            <Text style={styles.ctaText}>{"Let's Go 🎉"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroller: {
    flex: 1,
  },
  slide: {
    // width and height applied inline from useClientWindowDimensions — re-flows on resize/rotation.
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emoji: {
    fontSize: 80,
    marginBottom: SPACING.xl,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: SPACING.md,
  },
  subtext: {
    fontSize: 17,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  skipButton: {
    position: 'absolute',
    right: SPACING.lg,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
