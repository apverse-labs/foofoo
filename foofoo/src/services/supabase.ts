import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Read from env vars; fall back to empty strings so SSR pre-rendering during
// `expo export --platform web` doesn't crash (pages are client-hydrated anyway).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// true only in a real browser context (not SSR/Node.js)
const isBrowser = Platform.OS === 'web' && typeof localStorage !== 'undefined';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (isBrowser) return Promise.resolve(localStorage.getItem(key));
    // SSR / Node.js — SecureStore native module is unavailable; return null so
    // Supabase auth treats the session as empty rather than crashing.
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

// During static export SSR the env vars are empty — use placeholders so the
// module loads without throwing. The client won't be called during SSR since
// all screens are auth-gated and render only a loading state server-side.
export const supabase = createClient(
  SUPABASE_URL || 'https://ssr-placeholder.invalid',
  SUPABASE_ANON_KEY || 'ssr-placeholder-key',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
