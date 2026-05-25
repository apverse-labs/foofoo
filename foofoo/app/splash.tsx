import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { COLORS, APP_NAME, TIMING } from '../src/config/constants';

/**
 * @summary Animated green splash screen shown on first app launch.
 *
 * @description Logo fades in over 300 ms using the native driver, then the
 * screen auto-navigates to the intro carousel after a 2-second display window.
 * AsyncStorage already marked has_seen_intro before routing here so a back
 * gesture cannot loop back to this screen.
 */
export default function Splash() {
  const router = useRouter();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    const timer = setTimeout(() => {
      router.replace('/(intro)/intro-1');
    }, TIMING.SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.logo, fadeStyle]}>{APP_NAME}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
});
