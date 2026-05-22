import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { COLORS, APP_VERSION } from '../src/config/constants';
import { supabase } from '../src/services/supabase';
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
      staleTime: 1000 * 60 * 5,
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/auth-gate' as never);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={COLORS.primary} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" options={{ animation: 'none' }} />
          <Stack.Screen name="(intro)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
