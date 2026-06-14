import { useEffect, useState } from 'react';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * @summary Hydration-safe wrapper around useSafeAreaInsets for Expo Web.
 *
 * @description useSafeAreaInsets() returns {top:0,...} during SSR but real device
 * values on the client. Using real values before hydration completes causes React
 * error #418 (server/client style mismatch). This hook returns zero insets on the
 * first render (matching SSR) and switches to real values after mount.
 *
 * On native (iOS/Android) there is no SSR so mounted=true immediately and this
 * behaves identically to the raw hook.
 */
export function useClientInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? insets : ZERO_INSETS;
}
