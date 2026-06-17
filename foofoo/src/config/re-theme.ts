/**
 * re-theme.ts — RE UI design-system tokens (UI-BUILD-01).
 *
 * Extends the app's base tokens (COLORS/SPACING/BORDER_RADIUS/TIMING in constants.ts)
 * with RE-specific type scale, elevation, and a light/dark palette scaffold.
 * PURE module (no react-native import) so it is unit-testable.
 *
 * No DB, no API, no RE logic — presentational tokens only.
 */
import { COLORS, SPACING, BORDER_RADIUS, TIMING } from './constants';

export { SPACING, BORDER_RADIUS, TIMING };

/** Minimum interactive touch target (dp) — accessibility floor. */
export const MIN_TOUCH = 48;

/** Type scale (Inter). Values are presentational defaults; dynamic-type scales them up. */
export const RE_TYPE = {
  display:  { fontSize: 24, fontWeight: '600' as const, lineHeight: 30 }, // greeting
  title:    { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 }, // dish name (hero)
  body:     { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  subLabel: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 }, // class phrase
  caption:  { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 }, // chips
} as const;

/** Soft, low elevations (no hard borders). hero = one step above compact. */
export const RE_ELEVATION = {
  none: { shadowColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  low: {
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  hero: {
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
} as const;

export type ColorScheme = 'light' | 'dark';

export interface REThemeColors {
  primary: string; accent: string; background: string; surface: string;
  textPrimary: string; textSecondary: string; border: string;
  locked: string; never: string; warning: string; error: string; success: string;
  reasonChipBg: string; scrim: string;
}

/**
 * Light/dark palettes. Light reuses the canonical COLORS; dark is a warm scaffold
 * (deep charcoal canvas, lifted surfaces, same green/orange accents at adjusted luminance).
 * Dark mode is a future flag — these tokens make it a switch, not a rewrite.
 */
export const RE_PALETTE: { light: REThemeColors; dark: REThemeColors } = {
  light: {
    primary: COLORS.primary,
    accent: COLORS.accent,
    background: COLORS.background,
    surface: COLORS.surface,
    textPrimary: COLORS.textPrimary,
    textSecondary: COLORS.textSecondary,
    border: COLORS.border,
    locked: COLORS.locked,
    never: COLORS.never,
    warning: COLORS.warning,
    error: COLORS.error,
    success: COLORS.success,
    reasonChipBg: 'rgba(45,106,79,0.10)', // primary @ low alpha
    scrim: 'rgba(0,0,0,0.35)',
  },
  dark: {
    primary: '#4C9C77',
    accent: '#FF7A47',
    background: '#15110E',
    surface: '#221C17',
    textPrimary: '#F5F1EC',
    textSecondary: '#B5ADA3',
    border: '#3A322B',
    locked: '#7E8BE0',
    never: '#FF7043',
    warning: '#FFB300',
    error: '#FF6B6B',
    success: '#4C9C77',
    reasonChipBg: 'rgba(76,156,119,0.18)',
    scrim: 'rgba(0,0,0,0.55)',
  },
};

/** Resolve the palette for a color scheme (defaults to light). */
export function getREPalette(scheme: ColorScheme = 'light'): REThemeColors {
  return RE_PALETTE[scheme] ?? RE_PALETTE.light;
}
