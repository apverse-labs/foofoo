import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * @summary Supabase client for the RE staging project (foofoo-staging).
 *
 * @description Handles both RE reference table reads and full auth/user
 * writes for new users routed through the RE onboarding flow.
 *
 * Auth sessions are stored under a 're-' prefixed key so they never
 * collide with the production client's session in SecureStore/localStorage.
 *
 * When RE_FEATURE_FLAGS.ONBOARDING_ENABLED=true, new signups authenticate
 * against this project. Production (`supabase`) is reserved for legacy users.
 *
 * @see src/services/supabase.ts — production client (legacy users only)
 * @see src/config/constants.ts — RE_FEATURE_FLAGS.ONBOARDING_ENABLED
 */
const RE_URL = process.env.EXPO_PUBLIC_SUPABASE_RE_URL ?? '';
const RE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_RE_ANON_KEY ?? '';

const isBrowser = Platform.OS === 'web' && typeof localStorage !== 'undefined';

// Same SecureStore/localStorage pattern as the production client,
// but all keys are prefixed with 're-' to prevent session collisions.
const RESecureStoreAdapter = {
  getItem: (key: string) => {
    if (isBrowser) return Promise.resolve(localStorage.getItem(key));
    if (Platform.OS === 'web') return Promise.resolve(null);
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (isBrowser) { localStorage.setItem(key, value); return Promise.resolve(); }
    if (Platform.OS === 'web') return Promise.resolve();
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (isBrowser) { localStorage.removeItem(key); return Promise.resolve(); }
    if (Platform.OS === 'web') return Promise.resolve();
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabaseRE = createClient(
  RE_URL || 'https://ssr-placeholder.invalid',
  RE_ANON_KEY || 'ssr-placeholder-key',
  {
    auth: {
      storage: RESecureStoreAdapter,
      storageKey: 're-sb-auth-token',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
