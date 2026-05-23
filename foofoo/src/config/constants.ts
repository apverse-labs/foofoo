export const APP_NAME = 'Foofoo';
export const APP_VERSION = '1.0.0';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const FEATURES = {
  GOOGLE_SIGNIN: false,
  PANTRY: false,
  MOOD_SELECTOR: false,
  PREMIUM_TIERS: false,
  FAMILY_PROFILES: false,
  SOCIAL: false,
} as const;

export const RE_CONFIG = {
  DISHES_PER_SLOT: 8,
  VARIETY_GUARD_DAYS: 3,
  RANDOM_FACTOR_WEIGHT: 0.15,
  PLAN_CACHE_HOURS: 12,
  WEATHER_CACHE_HOURS: 12,
  // RE v1 scoring weights — change these to tune recommendations
  CUISINE_BOOST_FREQUENT: 0.3,      // F bucket cuisine match
  CUISINE_BOOST_OCCASIONAL: 0.1,    // O bucket cuisine match
  MEAL_ITEM_BOOST_FREQUENT: 0.25,   // F bucket dish match
  MEAL_ITEM_BOOST_OCCASIONAL: 0.05, // O bucket dish match
  VARIETY_PENALTY: -0.5,            // Dish seen in last 3 days
  WEATHER_BOOST: 0.15,              // Single coherent weather match (Doc 10 §6.5)
  WEEKDAY_QUICK_BOOST: 0.1,         // Quick dish (≤20 min) on a weekday
  WEEKEND_SLOW_BOOST: 0.05,         // Slow dish (>30 min) on a weekend
  RANDOM_MAX: 0.15,                 // Max random noise per dish (Doc 10 §6.7)
  // Dish classification thresholds
  TEMP_HOT_CELSIUS: 32,
  TEMP_COLD_CELSIUS: 18,
  CALORIES_HEAVY: 400,
  CALORIES_LIGHT: 350,
  SPICE_LEVEL_SPICY: 3,
  COOK_TIME_QUICK_MINS: 20,
  COOK_TIME_SLOW_MINS: 30,
} as const;

export const COLORS = {
  primary: '#2D6A4F',
  accent: '#FF6B35',
  background: '#FAFAF8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E8E8E6',
  error: '#D62828',
  success: '#2D6A4F',
  locked: '#5C6BC0',   // Indigo — locked meal slot border
  never: '#D84315',    // Deep orange-red — Never action destructive button
  warning: '#FF8F00',  // Amber — Not Today action button
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 9999,
} as const;

export const TIMING = {
  LONG_PRESS_MS: 300,
  SWIPE_THRESHOLD: 50,
  ANIMATION_FAST: 200,
  ANIMATION_NORMAL: 350,
  IMAGE_TRANSITION_MS: 300, // Expo Image crossfade duration
} as const;

export const API = {
  OPENWEATHERMAP_BASE: 'https://api.openweathermap.org/data/2.5',
  ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
  POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
  POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
} as const;

export const STORAGE_KEYS = {
  INTRO_SEEN: 'foofoo_has_seen_intro',
} as const;

export const LEGAL = {
  PRIVACY_POLICY_URL: 'https://foofoo-privacy.vercel.app/privacy',
  TERMS_OF_SERVICE_URL: 'https://foofoo-privacy.vercel.app/terms',
} as const;
