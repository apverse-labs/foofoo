import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../src/services/supabase';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, APP_NAME } from '../src/config/constants';

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Finding your next meal...</Text>
      </View>
    );
  }

  return isLoggedIn
    ? <Redirect href="/(tabs)" />
    : <Redirect href="/(auth)/sign-in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
});
