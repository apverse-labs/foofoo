// ─── CONFIGURABLE FILE ───────────────────────────────────────────────────────
// Update this file when:
//   • UI copy changes      → update `copy` section
//   • Feature added/removed → toggle `features` flags
//   • New screen added     → add entry to `routes` + `selectors`
//   • Design rework        → update `selectors` for new element structure
// ─────────────────────────────────────────────────────────────────────────────

export const E2E_CONFIG = {
  // App URL — set BASE_URL env var for Vercel/staging; defaults to local Expo web
  baseURL: process.env.BASE_URL ?? 'http://localhost:8081',

  // ── Feature flags ──────────────────────────────────────────────────────────
  // Set false to skip the entire test suite for that feature
  features: {
    auth: {
      signUp: true,
      signIn: true,
      forgotPassword: true,
      googleSignIn: false,        // not yet deployed
    },
    onboarding: {
      enabled: true,
      totalSteps: 7,
      steps: {
        profileSetup: true,       // step-1
        foodPreference: true,     // step-2
        allergies: true,          // step-3
        cuisineBuckets: true,     // step-4
        breakfastBuckets: true,   // step-5
        lunchDinnerBuckets: true, // step-6
        notifications: true,      // step-7
      },
    },
    home: {
      dayView: true,
      weekView: true,
      search: true,
      offlineBanner: true,
      mealCardGestures: true,
    },
    profile: {
      enabled: true,
      changePassword: true,
      deleteAccount: true,
    },
    reSafety: {
      dietTypeHardFilter: true,
      allergenHardFilter: true,
    },
  },

  // ── Routes ─────────────────────────────────────────────────────────────────
  // Update when Expo Router file paths change
  routes: {
    signIn:           '/(auth)/sign-in',
    signUp:           '/(auth)/sign-up',
    onboardingStep1:  '/(onboarding)/step-1',
    onboardingStep2:  '/(onboarding)/step-2',
    onboardingStep3:  '/(onboarding)/step-3',
    onboardingStep4:  '/(onboarding)/step-4',
    onboardingStep5:  '/(onboarding)/step-5',
    onboardingStep6:  '/(onboarding)/step-6',
    onboardingStep7:  '/(onboarding)/step-7',
    home:             '/(tabs)',
    profile:          '/(tabs)/profile',
    search:           '/(tabs)/search',
  },

  // ── UI Copy ────────────────────────────────────────────────────────────────
  // Update here when visible text changes — tests will pick up automatically
  copy: {
    appName: 'Foofoo',
    auth: {
      signInTitle:    'Welcome back',
      signInSubtitle: 'Sign in to your Foofoo account.',
      signUpTitle:    'Create account',
      signUpSubtitle: 'Join Foofoo — free forever.',
      signInBtn:      'Sign In',
      signUpBtn:      'Create Account',
      forgotPassword: 'Forgot password?',
      switchToSignUp: 'Create account',
      switchToSignIn: 'Sign in',
    },
    onboarding: {
      step1Title:     'Tell us about you',
      step2Title:     "What's your food preference?",
      nextBtn:        'Next',
      stepIndicator:  (n: number) => `Step ${n} of 7`,
      foodPrefs:      ['Veg', 'Non-Veg', 'Egg', 'Vegan', 'Jain'] as const,
    },
    home: {
      dayTab:         'Day',
      weekTab:        'Week',
      offlineBanner:  'Offline',
    },
  },

  // ── Selectors ──────────────────────────────────────────────────────────────
  // Update when HTML structure / component props change
  // Prefer: placeholder → role → text → CSS (most stable → least stable)
  selectors: {
    auth: {
      emailInput:    'input[placeholder="Email"]',
      passwordInput: 'input[placeholder="Password"]',
      nameInput:     'input[placeholder="Full Name"]',
    },
    onboarding: {
      step1: {
        nameInput:     'input[placeholder="e.g. Priya Sharma"]',
        usernameInput: 'input[placeholder="letters, numbers, underscore (3–20)"]',
        cityInput:     'input[placeholder="e.g. Mumbai"]',
      },
    },
  },

  // ── Timeouts (ms) ──────────────────────────────────────────────────────────
  timeouts: {
    navigation:  12_000,
    animation:    1_500,
    apiCall:     20_000,
    pageLoad:    15_000,
  },

  // ── Test credentials ───────────────────────────────────────────────────────
  // These users must exist in the Supabase project with onboarding completed
  users: {
    vegUser: {
      email:    process.env.E2E_VEG_USER_EMAIL    ?? 'e2e-veg@foofoo-test.dev',
      password: process.env.E2E_VEG_USER_PASSWORD ?? 'E2eVegTest123!',
      diet:     'veg',
    },
    nonVegUser: {
      email:    process.env.E2E_NONVEG_USER_EMAIL    ?? 'e2e-nonveg@foofoo-test.dev',
      password: process.env.E2E_NONVEG_USER_PASSWORD ?? 'E2eNonVegTest123!',
      diet:     'non_veg',
    },
  },

  // ── Viewports tested ───────────────────────────────────────────────────────
  // Add/remove viewports as target devices change
  viewports: {
    mobilePortrait:  { width: 375, height: 812 },   // iPhone 14
    mobileLandscape: { width: 812, height: 375 },
    tablet:          { width: 768, height: 1024 },   // iPad
    desktop:         { width: 1280, height: 800 },
  },
} as const;

export type E2EConfig = typeof E2E_CONFIG;
