/**
 * @summary Responsive layout helper — single source of truth for breakpoints and
 *   content width caps. Reacts to window resize / device rotation via
 *   useWindowDimensions, unlike Dimensions.get() which is captured once.
 *
 * @description Breakpoints chosen to match common Indian device classes:
 *   - mobile  (<600px wide): phones in portrait, the primary form factor
 *   - tablet  (600–1199px): phones in landscape, tablets in portrait
 *   - desktop (≥1200px): tablets in landscape, web testing
 *
 * On tablet/desktop the content column is capped to CONTENT_MAX_WIDTH so the
 * app reads like a phone-sized column centred on the screen, instead of cards
 * stretching to the full window width and looking absurd.
 */

import { useClientWindowDimensions } from '../hooks/useClientWindowDimensions';

export const BREAKPOINT_TABLET = 600;
export const BREAKPOINT_DESKTOP = 1200;

/** Maximum readable width for the main content column on tablet/desktop */
export const CONTENT_MAX_WIDTH = 600;
/** Maximum card width regardless of window size — keeps photos from going huge */
export const CARD_MAX_WIDTH = 560;
/** Horizontal inset (each side) when content fills the window (mobile) */
export const CARD_INSET = 24;

export interface Responsive {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Width to use for the centered content column */
  contentWidth: number;
  /** Width to use for a single MealCard */
  cardWidth: number;
}

export function useResponsive(): Responsive {
  const { width, height } = useClientWindowDimensions();
  const isMobile = width < BREAKPOINT_TABLET;
  const isTablet = width >= BREAKPOINT_TABLET && width < BREAKPOINT_DESKTOP;
  const isDesktop = width >= BREAKPOINT_DESKTOP;

  const contentWidth = isMobile ? width : Math.min(width, CONTENT_MAX_WIDTH);
  const cardWidth = Math.min(contentWidth - CARD_INSET * 2, CARD_MAX_WIDTH);

  return { width, height, isMobile, isTablet, isDesktop, contentWidth, cardWidth };
}
