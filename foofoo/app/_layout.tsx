import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Sentry from '@sentry/react-native';
import { COLORS, APP_VERSION, TIMING, RE_FEATURE_FLAGS } from '../src/config/constants';
import { supabase } from '../src/services/supabase';
import { supabaseRE } from '../src/services/supabase-re';
import { OneSignalService } from '../src/services/onesignal.service';
import { PostHogService } from '../src/services/posthog.service';

// Always start at index in dev so session-check logic runs fresh on every reload.
export const unstable_settings = { initialRouteName: 'index' };

// Initialize Sentry exactly once at module load, only when a DSN is present.
// In dev we still init so devs can verify the wiring; sampling is throttled hard.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN && !(Sentry as any).__foofooInitialized) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enableAutoSessionTracking: true,
    release: `foofoo@${APP_VERSION}`,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 0.0 : 0.1,
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_DEV_ENABLED === 'true',
  });
  (Sentry as any).__foofooInitialized = true;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: TIMING.QUERY_STALE_MS,
    },
  },
});

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Initialise push notifications (no-op on web) before anything else.
    OneSignalService.init();
    OneSignalService.setupNotificationHandlers();
    PostHogService.init();

    // On every full app reload in dev, force-navigate to index so its
    // session-check logic always runs instead of restoring the last screen.
    if (__DEV__) {
      router.replace('/' as never);
    }

    // Reactively route to auth-gate whenever the user signs out from any screen.
    // Listen to both the production client (legacy users) and the RE staging
    // client (RE users) so SIGNED_OUT from either project triggers the gate.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/auth-gate' as never);
      }
    });
    let reSubscription: { unsubscribe: () => void } | null = null;
    if (RE_FEATURE_FLAGS.ONBOARDING_ENABLED) {
      const { data: { subscription: reSub } } = supabaseRE.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          router.replace('/(auth)/auth-gate' as never);
        }
      });
      reSubscription = reSub;
    }

    // Deep-link handler: foofoo://home from the morning push notification jumps to the planner tab.
    const handleDeepLink = (url: string) => {
      if (url.includes('foofoo://home')) router.replace('/(tabs)' as never);
    };
    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    return () => {
      subscription.unsubscribe();
      reSubscription?.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
        />
        <meta name="theme-color" content="#2D6A4F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Foofoo" />
        <link rel="apple-touch-icon" href="/assets/icon.png" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" options={{ animation: 'none' }} />
          <Stack.Screen name="(intro)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(re-onboarding)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
