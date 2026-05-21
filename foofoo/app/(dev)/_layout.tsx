/**
 * @summary Layout for the hidden developer tools route group.
 * @description Renders nothing in production — entire group is dev-only.
 * @calledBy Expo Router when navigating to /(dev)/logs
 */

import { Stack } from 'expo-router';

declare const __DEV__: boolean;

export default function DevLayout() {
  if (!__DEV__) return null;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }} />;
}
