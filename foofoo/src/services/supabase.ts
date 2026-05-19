import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/constants';
import { Platform } from 'react-native';

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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
