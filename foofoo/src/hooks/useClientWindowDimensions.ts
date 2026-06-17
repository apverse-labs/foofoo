import { useEffect, useState } from 'react';
import { useWindowDimensions, type ScaledSize } from 'react-native';

/**
 * @summary Hydration-safe wrapper around useWindowDimensions for Expo Web static export.
 *
 * @description useWindowDimensions() returns the real device viewport on the client but a
 * fixed/default value during SSR. This mismatch causes React error #418 when dimensions
 * drive inline styles or layout widths in the render tree.
 *
 * Returns safe defaults (iPhone-sized) on first render (matching SSR), then real values
 * after mount. On native there is no SSR so mounted=true fires immediately with no UX impact.
 *
 * @returns {ScaledSize} Dimensions — zeros on server, real values after mount
 */

const SSR_DEFAULTS: ScaledSize = { width: 375, height: 812, scale: 1, fontScale: 1 };

export function useClientWindowDimensions(): ScaledSize {
  const dims = useWindowDimensions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? dims : SSR_DEFAULTS;
}
