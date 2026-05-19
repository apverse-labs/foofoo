import { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, APP_NAME } from '../src/config/constants';

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
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      router.replace('/(intro)/intro-1');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.logo, { opacity }]}>{APP_NAME}</Animated.Text>
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
