/**
 * @summary React hook that tracks network connectivity in real-time.
 *
 * @description
 * Subscribes to NetInfo events on mount. Returns the current online state and
 * a 'wasOffline' flag that flips to true the moment we go offline and stays
 * true until the next online tick consumer observes — used to trigger a
 * sync of pending offline actions on reconnect.
 *
 * On web (no native NetInfo connectivity reporting), this falls back to
 * `navigator.onLine` + 'online' / 'offline' events.
 *
 * @returns { isOnline: boolean, wasOffline: boolean }
 * @calledBy app/(tabs)/index.tsx (offline banner + sync trigger)
 */

import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    Platform.OS === 'web' ? (typeof navigator !== 'undefined' ? navigator.onLine : true) : true,
  );
  const [wasOffline, setWasOffline] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const goOnline = () => {
        setIsOnline(true);
      };
      const goOffline = () => {
        wasOfflineRef.current = true;
        setWasOffline(true);
        setIsOnline(false);
      };
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      if (!online) {
        wasOfflineRef.current = true;
        setWasOffline(true);
      }
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  return { isOnline, wasOffline };
}
