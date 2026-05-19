#!/bin/bash
# ============================================================
# FooFoo — Expo Project Setup Script
# Run this ONCE inside your GitHub Codespace terminal.
# Copy-paste the whole file, or run: bash SETUP.sh
# ============================================================

set -e  # Stop immediately if any command fails

echo ""
echo "🍽️  FooFoo — Setting up project..."
echo "============================================================"

# ------------------------------------------------------------
# STEP 1: Node version check
# ------------------------------------------------------------
echo ""
echo "✅ Step 1: Checking Node.js..."
node -v
npm -v

# ------------------------------------------------------------
# STEP 2: Install Expo CLI globally
# ------------------------------------------------------------
echo ""
echo "✅ Step 2: Installing Expo CLI..."
npm install -g expo-cli eas-cli

# ------------------------------------------------------------
# STEP 3: Create Expo project with TypeScript template
# ------------------------------------------------------------
echo ""
echo "✅ Step 3: Creating Expo project (TypeScript + Expo Router)..."
npx create-expo-app@latest foofoo \
  --template expo-template-blank-typescript

cd foofoo

# ------------------------------------------------------------
# STEP 4: Install all required packages
# ------------------------------------------------------------
echo ""
echo "✅ Step 4: Installing packages..."

# Core navigation
npx expo install expo-router react-native-safe-area-context \
  react-native-screens expo-linking expo-constants expo-status-bar

# State management
npm install zustand @tanstack/react-query

# Supabase
npm install @supabase/supabase-js

# Secure storage (for Supabase session persistence)
npx expo install expo-secure-store

# Gestures and animations (REQUIRED for swipe cards)
npx expo install react-native-gesture-handler react-native-reanimated

# Images (fast loading + Blurhash placeholders)
npm install expo-image

# Push notifications
npx expo install expo-notifications expo-device

# Location (for weather API city lookup)
npx expo install expo-location

# Network state (offline detection)
npx expo install @react-native-community/netinfo

# React Native Web (web support — full feature parity)
npx expo install react-native-web react-dom @expo/metro-runtime

# Analytics + Error tracking
npm install posthog-react-native @sentry/react-native

# Async storage (offline plan caching)
npx expo install @react-native-async-storage/async-storage

echo ""
echo "✅ All packages installed."

# ------------------------------------------------------------
# STEP 5: Create project folder structure
# ------------------------------------------------------------
echo ""
echo "✅ Step 5: Creating folder structure..."

mkdir -p \
  app/(tabs) \
  app/(auth) \
  app/(onboarding) \
  src/config \
  src/modules/recommendation-engine \
  src/modules/auth \
  src/modules/home \
  src/modules/dish-detail \
  src/modules/search \
  src/modules/grocery \
  src/modules/profile \
  src/modules/notifications \
  src/services \
  src/repositories \
  src/components/shared \
  src/components/dish \
  src/components/planner \
  src/types \
  src/utils \
  supabase/functions/generate-daily-plan \
  supabase/functions/weather-fetch \
  supabase/functions/analytics-email \
  supabase/migrations \
  assets/images \
  assets/fonts

echo "  Folders created ✓"

# ------------------------------------------------------------
# STEP 6: Create constants.ts (single source of truth)
# ------------------------------------------------------------
echo ""
echo "✅ Step 6: Creating src/config/constants.ts..."

cat > src/config/constants.ts << 'EOF'
// ============================================================
// FooFoo — Global Constants
// Change APP_NAME here → updates everywhere in the app
// ============================================================

export const APP_NAME = 'Foofoo';
export const APP_VERSION = '0.1.0';

// ------------------------------------------------------------
// Supabase — replace with your actual project values
// Get these from: supabase.com → your project → Settings → API
// ------------------------------------------------------------
export const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// ------------------------------------------------------------
// Feature flags — toggle features per phase
// ------------------------------------------------------------
export const FEATURES = {
  GOOGLE_SIGNIN: false,      // Phase 0.5
  PANTRY: false,             // Phase 0.5
  MOOD_SELECTOR: false,      // Phase 1
  PREMIUM_TIERS: false,      // Phase 1.5
  FAMILY_PROFILES: false,    // Phase 2
  SOCIAL: false,             // Phase 3
} as const;

// ------------------------------------------------------------
// RE (Recommendation Engine) config — tunable without deploy
// ------------------------------------------------------------
export const RE_CONFIG = {
  DISHES_PER_SLOT: 8,          // Carousel depth per meal slot
  VARIETY_GUARD_DAYS: 3,        // Don't repeat same dish within N days
  RANDOM_FACTOR_WEIGHT: 0.05,   // 5% randomness in scoring
  PLAN_CACHE_HOURS: 12,         // How long to cache a generated plan
  WEATHER_CACHE_HOURS: 12,      // How long to cache weather data
} as const;

// ------------------------------------------------------------
// Design tokens — mirrors Doc 09 Design System
// ------------------------------------------------------------
export const COLORS = {
  primary: '#2D6A4F',       // Deep green
  accent: '#FF6B35',        // Warm orange
  background: '#FAFAF8',    // Off-white
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

// ------------------------------------------------------------
// Timing
// ------------------------------------------------------------
export const TIMING = {
  LONG_PRESS_MS: 300,          // Gesture activation time (generous)
  SWIPE_THRESHOLD: 50,         // px before swipe registers
  ANIMATION_FAST: 200,
  ANIMATION_NORMAL: 350,
} as const;

// ------------------------------------------------------------
// API endpoints
// ------------------------------------------------------------
export const API = {
  OPENWEATHERMAP_BASE: 'https://api.openweathermap.org/data/2.5',
  ONESIGNAL_APP_ID: 'YOUR_ONESIGNAL_APP_ID',  // Set after creating OneSignal account
} as const;
EOF

echo "  constants.ts created ✓"

# ------------------------------------------------------------
# STEP 7: Create Supabase client
# ------------------------------------------------------------
echo ""
echo "✅ Step 7: Creating src/services/supabase.ts..."

cat > src/services/supabase.ts << 'EOF'
// ============================================================
// FooFoo — Supabase Client
// Single instance used everywhere in the app.
// Session is persisted in Expo SecureStore (survives app restart).
// ============================================================

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/constants';
import { Platform } from 'react-native';

/**
 * @summary Custom storage adapter — uses SecureStore on native, localStorage on web.
 *
 * @description
 * Supabase needs a place to store the user's session (auth token).
 * On mobile: uses Expo SecureStore (encrypted, survives restarts).
 * On web: uses localStorage (standard browser storage).
 * This ensures the user stays logged in across app restarts on all platforms.
 *
 * @calledBy supabase client initialisation below
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
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
EOF

echo "  supabase.ts created ✓"

# ------------------------------------------------------------
# STEP 8: Create types/index.ts (shared TypeScript types)
# ------------------------------------------------------------
echo ""
echo "✅ Step 8: Creating src/types/index.ts..."

cat > src/types/index.ts << 'EOF'
// ============================================================
// FooFoo — Shared TypeScript Types
// Add types here as tables and features are built.
// ============================================================

// ------------------------------------------------------------
// Database row types (mirrors Doc 11A schema)
// ------------------------------------------------------------

export type FoodPref = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';
export type DietType = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DishRole = 'main' | 'side' | 'accompaniment' | 'dessert' | 'snack';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SpiceLevel = 1 | 2 | 3 | 4;

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  food_pref: FoodPref;
  home_state: string | null;
  current_city: string | null;
  household_type: 'solo' | 'couple' | 'family_with_kids' | 'flatmates' | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Dish {
  id: number;
  name: string;
  slug: string;
  cuisine_id: number;
  diet_type: DietType;
  dish_role: DishRole;
  meal_types: MealSlot[];
  spice_level: SpiceLevel;
  difficulty: Difficulty;
  cook_time_mins: number;
  calories: number;
  hero_image_url: string | null;
  blurhash: string | null;
  is_active: boolean;
  // Food DNA Tier 1 tags are joined via dish_tags
}

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string; // YYYY-MM-DD
  breakfast_dish_id: number | null;
  lunch_dish_id: number | null;
  dinner_dish_id: number | null;
  is_locked_breakfast: boolean;
  is_locked_lunch: boolean;
  is_locked_dinner: boolean;
  created_at: string;
}

export interface MealCard {
  slot: MealSlot;
  dish: Dish;
  isLocked: boolean;
  carouselOptions: Dish[]; // 8 options in the swipe carousel
}

// ------------------------------------------------------------
// RE (Recommendation Engine) types
// ------------------------------------------------------------

export interface REInput {
  userId: string;
  planDate: string;
  weatherCode?: number;
  forceRegenerate?: boolean;
}

export interface REScore {
  dishId: number;
  totalScore: number;
  hardFilterPassed: boolean;
  components: {
    cuisineBoost: number;
    weatherBoost: number;
    homeStateBoost: number;
    varietyPenalty: number;
    historyScore: number;
    randomFactor: number;
  };
}

// ------------------------------------------------------------
// App state types
// ------------------------------------------------------------

export interface OfflinePlan {
  plan: DailyPlan;
  cachedAt: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
EOF

echo "  types/index.ts created ✓"

# ------------------------------------------------------------
# STEP 9: Update app.json for web + all platforms
# ------------------------------------------------------------
echo ""
echo "✅ Step 9: Configuring app.json..."

cat > app.json << 'EOF'
{
  "expo": {
    "name": "Foofoo",
    "slug": "foofoo",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "foofoo",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#2D6A4F"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.foofoo.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#2D6A4F"
      },
      "package": "com.foofoo.app"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#2D6A4F"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
EOF

echo "  app.json configured ✓"

# ------------------------------------------------------------
# STEP 10: Update babel.config.js for Reanimated
# ------------------------------------------------------------
echo ""
echo "✅ Step 10: Configuring Babel for Reanimated..."

cat > babel.config.js << 'EOF'
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // IMPORTANT: react-native-reanimated/plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
EOF

echo "  babel.config.js configured ✓"

# ------------------------------------------------------------
# STEP 11: Create metro.config.js for web support
# ------------------------------------------------------------
echo ""
echo "✅ Step 11: Configuring Metro for web..."

cat > metro.config.js << 'EOF'
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

module.exports = config;
EOF

echo "  metro.config.js configured ✓"

# ------------------------------------------------------------
# STEP 12: Create .env.local template
# ------------------------------------------------------------
echo ""
echo "✅ Step 12: Creating .env.local template..."

cat > .env.local << 'EOF'
# FooFoo — Local Environment Variables
# DO NOT commit this file. It is already in .gitignore.
# --------------------------------------------------------
# Get these from: supabase.com → your project → Settings → API

EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Get from: openweathermap.org → My Account → API Keys
# (Set this up during Sprint 3 — Claude will remind you)
EXPO_PUBLIC_OPENWEATHERMAP_KEY=YOUR_KEY_HERE

# Get from: onesignal.com after creating your app
# (Set this up during Sprint 5–6 — Claude will remind you)
EXPO_PUBLIC_ONESIGNAL_APP_ID=YOUR_KEY_HERE

# Get from: posthog.com → your project → settings
EXPO_PUBLIC_POSTHOG_KEY=YOUR_KEY_HERE

# Get from: sentry.io → your project → settings → DSN
EXPO_PUBLIC_SENTRY_DSN=YOUR_DSN_HERE
EOF

echo "  .env.local template created ✓"

# Make sure .env.local is gitignored
echo ".env.local" >> .gitignore
echo ".env.staging" >> .gitignore
echo "  .gitignore updated ✓"

# ------------------------------------------------------------
# STEP 13: Create placeholder app entry with Expo Router
# ------------------------------------------------------------
echo ""
echo "✅ Step 13: Creating app/_layout.tsx (root layout)..."

cat > app/_layout.tsx << 'EOF'
// ============================================================
// FooFoo — Root Layout
// Sets up: gesture handler, query client, safe area, navigation
// ============================================================

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../src/config/constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

/**
 * @summary Root layout wrapping the entire FooFoo app.
 *
 * @description
 * Wraps all screens with:
 * - GestureHandlerRootView: required for swipe/long-press gestures
 * - QueryClientProvider: enables React Query data fetching everywhere
 * - Stack navigator: Expo Router's root stack
 *
 * @returns {JSX.Element} Root app layout
 *
 * @calledBy Expo Router (automatic — this is the root _layout)
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={COLORS.primary} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
EOF

echo "  app/_layout.tsx created ✓"

# ------------------------------------------------------------
# STEP 14: Create a minimal index screen to verify setup
# ------------------------------------------------------------
cat > app/index.tsx << 'EOF'
// ============================================================
// FooFoo — Entry point
// Redirects to auth or home depending on session state.
// ============================================================

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../src/services/supabase';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, APP_NAME } from '../src/config/constants';

/**
 * @summary Entry screen — checks session and routes accordingly.
 *
 * @description
 * On app open, checks if user has an active Supabase session.
 * - Session exists → redirect to home (tabs)
 * - No session → redirect to auth (sign in / sign up)
 * Shows a loading state while checking.
 *
 * @returns {JSX.Element} Loading screen or redirect
 *
 * @calledBy Expo Router (automatic — this is the root index route)
 */
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
EOF

echo "  app/index.tsx created ✓"

# ------------------------------------------------------------
# STEP 15: Create CHANGELOG.md
# ------------------------------------------------------------
echo ""
echo "✅ Step 15: Creating CHANGELOG.md..."

cat > CHANGELOG.md << 'EOF'
# FooFoo — Master Change Log

## [Unreleased]
<!-- Add changes here as you build. Move to a version when a sprint is done. -->

## [v0.1.0] — Sprint 1 Setup — $(date +%Y-%m-%d)
### Added
- Expo project created with TypeScript + Expo Router
- React Native Web configured (full feature parity on web from Day 1)
- Supabase client with SecureStore session persistence
- Platform-aware storage adapter (SecureStore on mobile, localStorage on web)
- Global constants (APP_NAME, COLORS, SPACING, TIMING, RE_CONFIG, FEATURES)
- Shared TypeScript types (Dish, DailyPlan, UserProfile, REInput, REScore)
- App root layout (GestureHandler + React Query + Stack navigator)
- Entry point with session check → route to auth or home
- Project folder structure (modules, services, repositories, types)
- .env.local template with all required API keys
- .gitignore updated to exclude secrets

### Packages Installed
- expo-router, react-native-safe-area-context, react-native-screens
- zustand, @tanstack/react-query
- @supabase/supabase-js, expo-secure-store
- react-native-gesture-handler, react-native-reanimated
- expo-image, expo-notifications, expo-device
- expo-location, @react-native-community/netinfo
- react-native-web, react-dom, @expo/metro-runtime
- posthog-react-native, @sentry/react-native
- @react-native-async-storage/async-storage

### FooFoo Session
[FooFoo| #003 | Topic: Project Scaffolding | Stage: MVP-Sprint-1 | Output: Full Expo project setup with web support, Supabase client, types, constants, root layout]
EOF

echo "  CHANGELOG.md created ✓"

# ------------------------------------------------------------
# Done
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "🎉  FooFoo project scaffolded successfully!"
echo "============================================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "  1. Open src/config/constants.ts"
echo "     → Replace SUPABASE_URL and SUPABASE_ANON_KEY"
echo "       with your actual values from supabase.com"
echo ""
echo "  2. Also update .env.local with the same values"
echo ""
echo "  3. Run the app to verify setup:"
echo "     cd foofoo && npx expo start --web"
echo "     (or scan QR with Expo Go on your phone)"
echo ""
echo "  4. Tell Claude Code:"
echo "     'Run the Supabase schema migration from Doc 11A'"
echo ""
echo "============================================================"