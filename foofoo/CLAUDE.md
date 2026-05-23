@AGENTS.md

> IMPORTANT: Also always read AGENTS.md at the project root before writing any Expo code. 
> It points to the correct versioned Expo docs. Always consult those docs first.

# CLAUDE.md — FooFoo Project Context
> This file is read by Claude Code at the start of every session.
> Keep it updated at the end of every sprint.
> Last updated: Sprint 1 Setup | May 2026

---

## What Is FooFoo?

AI-powered meal decision assistant for the Indian market. Every morning, users see a personalised Breakfast / Lunch / Dinner meal plan. Swipe to browse, lock what they like, cook or order online.

**Core product = the DECISION ("what to eat"), not the instruction ("how to cook").**

The **Recommendation Engine (RE)** is the heart of the product. It must always work correctly before anything else matters.

App name is configured in `src/config/constants.ts` → `APP_NAME = "Foofoo"`. Change it there, updates everywhere.

---

## Platform

Single codebase for **Android + iOS + Web** using React Native Web + Expo.
- Android: primary test device via Expo Go
- iOS: via Expo Go on iPhone
- Web: runs in browser via `npx expo start --web`

No local Xcode or Android Studio needed. Builds happen in Expo EAS cloud.

---

## Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | React Native + Expo SDK 52+ | TypeScript strictly throughout |
| Web | React Native Web + Expo Metro | Full feature parity — same screens, same RE |
| Navigation | Expo Router (file-based) | Screen file name = route |
| State | Zustand | Lightweight, no boilerplate |
| Server state | @tanstack/react-query | Caching, offline, background refresh |
| Gestures | react-native-gesture-handler + react-native-reanimated 3 | 60fps — non-negotiable |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | Free tier covers MVP |
| Auth | Supabase Auth | Email+password MVP. Google Sign-In Phase 0.5. |
| Functions | Supabase Edge Functions (Deno/TypeScript) | RE scoring, plan generation, weather |
| Push | expo-notifications + OneSignal | Free unlimited |
| Images | Supabase Storage + Cloudinary CDN | WebP, Blurhash, on-the-fly resize |
| Weather | OpenWeatherMap API | Free: 1K calls/day |
| Analytics | PostHog | Free: 1M events/month |
| Errors | Sentry | Free: 5K events/month |
| Session storage | expo-secure-store (mobile) + localStorage (web) | Platform-aware adapter in supabase.ts |

---

## Project Structure

```
foofoo/
├── CLAUDE.md                        ← YOU ARE HERE — update every sprint
├── CHANGELOG.md                     ← Log every change here
├── app.json                         ← App config (name, platforms, plugins)
├── babel.config.js                  ← Reanimated plugin MUST be last
├── metro.config.js                  ← Web support config
├── .env.local                       ← API keys (gitignored — never commit)
│
├── app/                             ← Expo Router screens (file = route)
│   ├── _layout.tsx                  ← Root layout (GestureHandler + QueryClient)
│   ├── index.tsx                    ← Entry: check session → route to auth or home
│   ├── (auth)/                      ← Sign in / Sign up screens
│   ├── (onboarding)/                ← 7-step onboarding flow
│   └── (tabs)/                      ← Main app (home, search, grocery, profile)
│
├── src/
│   ├── config/
│   │   └── constants.ts             ← APP_NAME, COLORS, SPACING, FEATURES, RE_CONFIG
│   │
│   ├── modules/                     ← Feature modules (one folder per feature)
│   │   ├── recommendation-engine/   ← RE scoring logic, hooks, types
│   │   ├── auth/                    ← Auth hooks and helpers
│   │   ├── home/                    ← Home screen logic, planner hooks
│   │   ├── dish-detail/             ← Dish detail logic
│   │   ├── search/                  ← Search + filter logic
│   │   ├── grocery/                 ← Grocery list generation
│   │   ├── profile/                 ← Profile + preferences
│   │   └── notifications/           ← Push notification setup
│   │
│   ├── services/
│   │   └── supabase.ts              ← Supabase client (single instance)
│   │
│   ├── repositories/                ← All Supabase queries go here — NEVER raw SQL in screens
│   │   ├── dishes.repository.ts
│   │   ├── plans.repository.ts
│   │   ├── users.repository.ts
│   │   └── suggestion-logs.repository.ts
│   │
│   ├── components/
│   │   ├── shared/                  ← Reusable across screens
│   │   ├── dish/                    ← Dish card, meal card, dish detail components
│   │   └── planner/                 ← Home screen planner components
│   │
│   ├── types/
│   │   └── index.ts                 ← All TypeScript types (Dish, DailyPlan, etc.)
│   │
│   └── utils/                       ← Pure helper functions
│
├── supabase/
│   ├── functions/                   ← Edge Functions (Deno/TypeScript)
│   │   ├── generate-daily-plan/     ← RE v1 scoring + plan creation
│   │   ├── weather-fetch/           ← OpenWeatherMap → weather_cache table
│   │   └── analytics-email/         ← Daily 13-metric founder email
│   └── migrations/                  ← Ordered SQL migration files (run in sequence)
│
└── assets/
    ├── images/                      ← App icons, splash screen
    └── fonts/                       ← Inter font family
```

---

## Database

**42 MVP-active tables.** Full spec in Doc 11A (Final Merged Database Schema v4).

Key groups:
- **Food Knowledge Base:** `dishes`, `cuisines_master`, `dish_tags`, `ingredients_master`, `meal_ingredients`, `dish_combos`, `dish_combo_items`, `term_synonyms`
- **User & Preferences:** `profiles`, `user_diet_rules`, `user_category_preferences`, `user_inferred_prefs`, `user_behavioral_profile`, `never_list`, `user_recipe_affinity`
- **Planner & RE:** `planner`, `planner_carousel`, `suggestion_logs`, `recommendation_debug_log`, `weather_cache`, `region_food_affinity`
- **App Intelligence:** `app_events`, `experiments`, `experiment_assignments`
- **Operations:** `audit_log`, `etl_jobs`, `notification_log`, `referrals`, `media_assets`

**Critical rules:**
- All PKs are UUIDs (except `dishes.id` which is integer + sequence)
- All timestamps stored as UTC `timestamptz`. IST conversion happens in Edge Functions and client only.
- Diet exclusions use `excluded_ingredients integer[]` (NOT text — avoids language-matching bugs)
- Food DNA stored in `dish_tags` junction (not columns) — supports unlimited dimensions
- Auto-derivation: `allergens`, `diet_type`, `is_jain` computed from ingredient flags via `derive-dish-attributes` script — never manual
- RLS on every table: `WHERE user_id = auth.uid()`
- Cascade delete on user deletion. Anonymise `suggestion_logs` (keep for analytics). Retain `audit_log` (3-year DPDP requirement).
- Supabase region: **ap-south-1 (Mumbai)** — required for latency

**Connection:** Use `supabase` client from `src/services/supabase.ts` — never import createClient directly in screens.

---

## Recommendation Engine (RE)

**The heart of FooFoo. Prioritise correctness here above everything else.**

### RE Versions
| Version | When | Status |
|---------|------|--------|
| RE v1 | MVP launch (Sprint 3) | Build now |
| RE v2 | Week 3+ post-launch | Build Sprint 6 |
| RE v2.5 | Weeks 4–8 post-launch | Tier 2 tags active |
| RE v3 | Phase 1.5 (5K+ MAU) | K-means clustering |
| RE v4 | Phase 2–3 | Full collaborative filtering |

### RE v1 Scoring Pipeline (build first)
1. **Hard filter** — exclude by `diet_type`, `allergens` (integer IDs), `never_list`, `is_active=false`
2. **Cuisine boost** — user's Frequently bucket: +0.3, Occasionally: +0.1, Never: excluded
3. **Meal item boost** — user's bucket preferences for specific dishes: +0.2 to +0.4
4. **Weather boost** — cold/rainy: heavy/spicy +0.15; hot: light/chilled +0.15
5. **Home state boost** — regional affinity score from `region_food_affinity` table: +0.0 to +0.2
6. **Day-of-week** — `user_dish_patterns.preferred_days` (post MVP Week 3)
7. **Variety guard** — penalise dishes seen in last 3 days: -0.5
8. **Random factor** — 5% randomness (prevents staleness)
9. **Rank** — return top 8 per slot
10. **Combo-aware** — score combos as unit; swap components if one is never-listed
11. **Coherence** — don't suggest 3 heavy dishes in one day (learned per user, not hard rule)

### RE Fallback (if pipeline not ready by Day 3 of Sprint 3 Week 6)
Simplified: hard filters only + cuisine boost + random. Ship this, iterate to full pipeline.

### Food DNA Tiers
- **Tier 1 (MVP):** cuisine, diet_type, allergens, spice_level, cook_time_mins, difficulty, calories
- **Tier 2 (Weeks 4–8 post-launch):** cooking_method, primary_taste, texture, heaviness, richness, sweetness, weather_affinity
- **Tier 3 (Phase 2+):** mouthfeel, aroma_profile, fermentation, serving_temp, health_tags, ingredient_complexity

---

## Content Model

| Level | Content | When |
|-------|---------|------|
| 1 | Dish cards: name, photo, Tier 1 Food DNA tags, cuisine, diet, cook time, difficulty, calories | All 500 dishes at MVP launch |
| 2 | Simple ingredients: names only, no quantities. E.g. "paneer, tomato, cream, onion, spices" | All 500 dishes at MVP launch |
| 3 | Full recipes: step-by-step, quantities, audio/video | Phase 0.5 — top 50–100 dishes first |

---

## Gestures (Non-negotiable — must feel exact)

| Gesture | Action | Component |
|---------|--------|-----------|
| Swipe Left / Right | Browse carousel options | Meal card |
| Long Press Down (300ms) | Never — remove dish permanently | Meal card |
| Long Press Up (300ms) | Not Today — skip today only | Meal card |
| Tap Lock icon | Lock meal (no RE re-suggestion) | Meal card |
| Tap Plus icon | Add dish to future date | Meal Detail |
| Tap card | Open Meal Detail | Meal card |
| Pull Down | Refresh plan | Home Day View |

All gestures log to `suggestion_logs` and `app_events`. This is how RE v2 learns.

---

## Design System (from Doc 09)

```typescript
// Already in src/config/constants.ts
COLORS = {
  primary: '#2D6A4F',       // Deep green
  accent: '#FF6B35',        // Warm orange
  background: '#FAFAF8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
}
SPACING = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 }
BORDER_RADIUS = { sm:8, md:16, lg:24, full:9999 }
TIMING = { LONG_PRESS_MS: 300, ANIMATION_NORMAL: 350 }
```

- Font: Inter (with system fallback)
- Min touch target: 48dp on all interactive elements
- Dish photo always dominates the card — UI elements support, never compete
- Blurhash placeholder while images load — never blank white boxes
- All animations: 60fps, fluid, never abrupt

---

## Coding Rules (follow strictly)

1. **TypeScript strict** — no `any` types. Add types to `src/types/index.ts`.
2. **Max 300 lines per file** — split into sub-files if longer.
3. **No raw SQL in screens** — all Supabase queries go through `src/repositories/`.
4. **No API calls in screens** — all external calls go through `src/services/`.
5. **Every async function gets try/catch** — errors logged to Sentry.
6. **Structured logs** — format: `[MODULE_NAME] message`. E.g. `[RE-SCORING] Plan generated in 1.2s`.
7. **All timestamps UTC in DB** — convert to IST only in Edge Functions and UI display.
8. **Error response format from Edge Functions:**
   ```json
   // Success: { "success": true, "data": { ... } }
   // Error:   { "success": false, "error": { "code": "PLAN_GENERATION_FAILED", "message": "...", "retry": true } }
   ```

---

## Function Documentation Standard

Every function must have this JSDoc block:

```typescript
/**
 * @summary One-line: WHAT the function does (not how).
 *
 * @description Optional expanded context, edge cases, intent.
 *
 * @param {string} userId - Supabase UUID of the requesting user
 * @returns {Promise<DailyPlan>} Generated meal plan for the date
 *
 * @throws {SupabaseError} When database query fails
 *
 * @calledBy
 * - `app/(tabs)/index.tsx` — Home screen on mount
 * - `supabase/functions/daily-batch/index.ts` — 5 AM batch
 */
```

---

## Environment Variables

All in `.env.local` (gitignored). Prefixed `EXPO_PUBLIC_` so Expo can read them.
Secrets in Edge Functions go in **Supabase Vault** (Dashboard → Settings → Vault) — never hardcoded.

| Variable | Where to Get It | When Needed |
|----------|----------------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | supabase.com → project → Settings → API | NOW |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | supabase.com → project → Settings → API | NOW |
| `EXPO_PUBLIC_OPENWEATHERMAP_KEY` | openweathermap.org → My Account → API Keys | Sprint 3 |
| `EXPO_PUBLIC_ONESIGNAL_APP_ID` | onesignal.com → your app | Sprint 5–6 |
| `EXPO_PUBLIC_POSTHOG_KEY` | posthog.com → project settings | Sprint 6 |
| `EXPO_PUBLIC_SENTRY_DSN` | sentry.io → project settings → DSN | Sprint 6 |

---

## Current Sprint Status

**Sprint:** 7 — Polish + Google Play Launch — In Progress (2026-05-23)
**Platform:** Claude Code Web (GitHub Codespaces-free workflow)
**Environment:** Vercel web deployment for testing
**Version:** 1.0.0
**Pre-Sprint 7 readiness check:** see `logs/pre_sprint_reports/pre_sprint7_20260522.txt`
  - Build, features (26/26), navigation, performance, data integrity: all green
  - Hermes export blocker (supabase-js OTEL dynamic import) → patched via patch-package
  - Account deletion (Play Store 2023 requirement) → `delete-account` Edge Function + Profile UI shipped
  - app.json bumped to v1.0.0 + versionCode 1 + description
  - Open before submit: Privacy Policy URL, ToS URL, RESEND_API_KEY, EXPO_PUBLIC_SENTRY_DSN

**Sprint 6 — INTELLIGENCE — COMPLETED (2026-05-22, see Changelog.md):**
- [x] Section 1 — Morning push notification (`send-morning-notification`
      Edge Function + `foofoo-morning-notifications` CRON + deep-link
      handler in `app/_layout.tsx`).
- [x] Section 2 — `calculate-inferred-prefs` Edge Function +
      `foofoo-weekly-inferred-prefs` CRON. Verified: writes spice /
      complexity / repeat_tolerance / cuisine_drift scores for users
      with ≥20 actions across ≥14 days.
- [x] Section 3 — RE v2 wired into `generate-daily-plan`,
      `generate-daily-plans-batch`, and `regenerate-slot`. Stamps
      `re_version='v2'` when inferred_prefs exist, falls back to `'v1'`
      otherwise. Test plan produced confirmed v2 components (affinity
      +0.20, drift +0.12, complexity +0.05).
- [x] Section 4 — `compute-recipe-affinity` Edge Function +
      `foofoo-weekly-recipe-affinity` CRON. First run wrote 18 pairs
      across 3 users.
- [x] Section 5 — `daily-analytics-email` Edge Function +
      `foofoo-daily-analytics-email` CRON. All 13 metrics computed and
      captured in `etl_jobs.metadata`. **Pending:** add
      `RESEND_API_KEY` to Supabase Edge Function secrets to enable
      delivery (function is currently capturing metrics without
      sending).
- [x] Section 6 — Offline support: `useNetworkStatus` hook,
      `OfflineService` (cachePlan / getCachedPlan / queueAction /
      syncPendingActions), offline banner on Home, queue-on-offline in
      `feedback.repository`. TypeScript: 0 errors.

**Sprint 6 carry-over for Sprint 7:**
- Set `RESEND_API_KEY` + verified `RESEND_FROM` in Supabase Edge
  Function secrets so daily email goes out.
- Confirm `ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY` present in
  Edge Function secrets (notification function reads them; current
  user pool has 0 `onesignal_player_id` set so the path is untested
  end-to-end).
- Manual on-device verification of push (B6/C7/D3/D4 from prior
  parked backlog) once an EAS dev client is available.
- Manual browser smoke of the offline banner (DevTools → Network →
  Offline; swipe; reconnect; verify suggestion_logs queue drains).
- Inferred prefs only populate for users with ≥20 weighted actions
  across ≥14 days — for the live cohort that's currently the one
  test user with seeded history. Real users will reach the threshold
  organically over the next 2–3 weeks of usage.

**Sprint 5 — DISCOVERY — COMPLETE + POST-QA FIX PASS (2026-05-22)**

**Sprint 5 Post-QA Fix Pass — 2026-05-22 (see Changelog.md):**
- [x] RE Jain hard filter fixed in all 3 Edge Functions (added is_jain=true)
- [x] re_score now persisted in planner_carousel inserts
- [x] recommendation_debug_log insert added to batch function
- [x] Home-state regional affinity boost implemented (Doc 10 step 5)
- [x] Random factor 0.05 → 0.15 (spec match)
- [x] Email-verification poll: 5-min timeout + visible polling spinner
- [x] Profile: re-route to auth-gate when session expires
- [x] Sign-up + sign-in: friendly error-message mapping
- [x] All bare `.then()` chains now have `.catch()`
- [x] Grocery: planDate refreshes across midnight IST
- [x] MealCard fallback image: uses dish-{id} seed when slug is null
- [x] 3 RE Edge Functions deployed (gen v9, batch v6, regen v5)
- [x] All 4 RE safety gates now 0
- [ ] 2 DB migrations staged but not yet applied (see Changelog.md):
      `20260522110000_atomic_carousel_replace.sql`,
      `20260522110100_widen_suggestion_logs_action_check.sql`
      Apply via `supabase db push` before next sprint.

**Sprint 5 — DISCOVERY — COMPLETED:**
- [x] Section 1 — Full-text search: SearchBar, SearchResultCard, FilterBottomSheet, EmptySearchState, SlotPickerOverlay; src/repositories/search.repository.ts; synonym expansion via term_synonyms; pre-personalised cuisine chips
- [x] Section 2 — dish_similar populated (4,898 pairs across all 818 dishes); on_dish_inserted trigger queues derive-dish-attributes; populate_dish_similar() SQL function
- [x] Section 3 — Day/Week toggle on Home; src/components/planner/WeekView.tsx (7×3 grid); src/repositories/week.repository.ts; generate-daily-plans-batch Edge Function deployed; 5AM IST CRON scheduled via pg_cron + pg_net + vault-stored service_role_key
- [x] Section 4 — Profile screen: avatar with initials, food prefs summary card, notification toggle + 12h time picker, change-password form, premium placeholder, sign out
- [x] Section 5 — All MCP-verifiable tests green; TypeScript clean

**Sprint 1 — COMPLETED:**
- [x] Expo project + TypeScript + React Native Web
- [x] Supabase client with SecureStore adapter
- [x] Root layout (GestureHandler + React Query)
- [x] Auth screens (Sign Up, Sign In, Email Verification, Forgot Password)
- [x] Splash + Intro screens
- [x] Entry index.tsx with session routing

**Sprint 2 — Onboarding — COMPLETED (2026-05-19):**
- [x] app/(onboarding)/_layout.tsx — Stack navigator (existed)
- [x] src/components/shared/OnboardingLayout.tsx — shared layout with progress bar, back arrow, step counter, Next button, keyboard avoiding
- [x] src/repositories/profiles.repository.ts — fetchProfile, checkUsernameAvailable, saveProfileStep1, updateOnboardingStep, saveNotificationSettings, completeOnboarding
- [x] src/repositories/onboarding.repository.ts — saveFoodPref, saveAllergens, searchIngredients, fetchCuisines, saveCuisineBuckets, fetchUserCuisineBuckets, fetchFOCuisineIds, fetchBreakfastDishes, fetchLunchDinnerDishes, saveMealBuckets, recordConsent
- [x] src/utils/indian-states.ts — complete Indian states + UTs list
- [x] Step 1 — Profile Setup (name, username uniqueness debounce, city, state picker modal)
- [x] Step 2 — Food Preference (5 icon cards: Veg/Non-Veg/Egg/Vegan/Jain)
- [x] Step 3 — Allergies (ingredient_aliases search, integer ID storage, no-allergy toggle)
- [x] src/components/shared/BucketSelector.tsx — tap-to-cycle F/O/N sorter, bottom bar with progress + Next
- [x] Step 4 — Cuisine Buckets (cuisines_master, saves to user_category_preferences)
- [x] Step 5 — Breakfast Buckets (dishes filtered by F+O cuisines, top 20)
- [x] Step 6 — Lunch + Dinner Buckets (combined, deduped, top 30)
- [x] Step 7 — Role toggle, notification permission + custom time picker, consent, onboarding_completed=true
- [x] app/index.tsx — step-based resume routing (onboarding_step → resume at step N+1)

**Sprint 2 Gate Criteria:**
- [ ] All 7 steps save to Supabase (verify in Table Editor)
- [ ] profiles: onboarding_completed=true, all fields filled
- [ ] user_diet_rules: food_pref set, excluded_ingredients is integer array
- [ ] user_category_preferences: rows for cuisine + meal_item buckets
- [ ] user_consent: row exists with data_consent_at
- [ ] Kill app mid-step-4, reopen → resumes at step 4
- [ ] 100 dishes seeded with Tier 1 tags (Sprint 2 data requirement)

---

## Conversation Index

Tag every Claude session:
`[FooFoo| #NNN | Topic: <2–4 words> | Stage: <MVP-Sprint-N/Phase-X> | Output: <outcome>]`

Reference this in CHANGELOG.md for full traceability.

---

## Key Reminders (Claude will prompt at right time)

| Reminder | Phase |
|----------|-------|
| OpenWeatherMap setup | Sprint 3 |
| Cloudinary account + dish images | Sprint 4–5 |
| OneSignal App ID configured — check Dashboard for subscriber count | Sprint 6 — DONE 2026-05-22 |
| PostHog project live — check Live Events after each dev session | Sprint 6 — DONE 2026-05-22 |
| OneSignal push setup | Sprint 5–6 |
| Google Play Developer (₹2,100) | Sprint 7 / Week 13 |
| Apple Developer Account (₹8,700) | Phase 0.5 start |
| Privacy Policy + Terms of Service | Sprint 7 / Week 13 |
| Founder dish data (500 dishes, Tier 1 tags) | Sprint 4–5 / Week 10 deadline |
| LLP Registration | Production deployment |
| Co-Founder Agreement | Firm registration |
| Trademark Filing | Firm registration |

---

## Product Decision Log (overrides planning docs where conflicts exist) | Onboarding UX Fixes
- [#014] Bucket Selector: Next button is ALWAYS enabled. Unselected items 
  default to 'O' (Occasional) when user taps Next. Do NOT force all items 
  to be selected before allowing Next.
- [#014] Bucket Selector: Tapping a chip cycles: Unselected(gray) → 
  Frequently(green) → Occasionally(orange) → Never(red) → Unselected(gray).
  First tap on an unselected chip must go to Frequently. This is correct.
  But user must ALSO be able to long-press a chip to get a bottom sheet 
  with direct selection: "Frequently / Occasionally / Never / Leave unselected"
- [#014] Food preference cards (Veg/Non-Veg etc.) — Phase 1 will filter 
  bucket content based on this selection. For MVP, show all dishes regardless 
  of food preference in buckets but this is noted for Phase 1 improvement.
- [#014] Server state: intro screens must show on every cold start during 
  development. State persistence to be implemented in a dedicated session.
*Update this file at end of every sprint. Claude Code reads it fresh every session.*

