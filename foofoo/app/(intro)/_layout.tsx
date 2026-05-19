import { Stack } from 'expo-router';

/**
 * @summary Stack layout for the intro slide group with right-to-left animation.
 */
export default function IntroLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
