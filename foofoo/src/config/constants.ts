export const APP_NAME = 'Foofoo';
export const APP_VERSION = '0.1.0';

export const SUPABASE_URL = 'https://ufgfznpqixplcbhmsqqw.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZ2Z6bnBxaXhwbGNiaG1zcXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTg4MjMsImV4cCI6MjA5NDczNDgyM30.DUP9dIp2g6E-g3fphtdSNmQAKrmecJj6WEs0NKe-f4M';

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
  RANDOM_FACTOR_WEIGHT: 0.05,
  PLAN_CACHE_HOURS: 12,
  WEATHER_CACHE_HOURS: 12,
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
} as const;

export const API = {
  OPENWEATHERMAP_BASE: 'https://api.openweathermap.org/data/2.5',
  ONESIGNAL_APP_ID: 'YOUR_ONESIGNAL_APP_ID',
} as const;
