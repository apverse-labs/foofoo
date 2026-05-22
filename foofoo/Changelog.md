# FooFoo — Master Change Log
*Every code change goes here. Format is at the bottom of this file.*

---

## [Unreleased]
<!-- Add new changes here. Move to a version block when a sprint completes. -->

### Pre-Sprint 7 readiness pass — 2026-05-22

Diagnosis + fix pass before starting the Polish + Launch sprint.
Full report: `logs/pre_sprint_reports/pre_sprint7_20260522.txt`.

- **Build blocker fix — Hermes / supabase-js OTEL dynamic import.**
  `@supabase/supabase-js@2.106` ships a dynamic `import("@opentelemetry/api")`
  that the bundled Hermes compiler (Expo SDK 56) refuses to parse,
  failing `expo export --platform android`. Replaced the call with
  `Promise.resolve(null)` in both dist files, installed `patch-package`
  + `postinstall-postinstall`, generated
  `patches/@supabase+supabase-js+2.106.0.patch`, added
  `"postinstall": "patch-package"` to package.json. Re-export: success
  (6.98 MB hbc, 0 errors).
- **Account deletion (Play Store 2023 requirement).** New Edge Function
  `delete-account` (v1, JWT-verified). Anonymises `suggestion_logs` +
  `user_feedback` (FK ON DELETE SET NULL) → calls
  `supabase.auth.admin.deleteUser(user.id)` with the service role
  (CASCADE on `profiles_id_fkey` removes every public.* row tied to
  the user) → writes an `audit_log` entry (retained 3 years per DPDP).
  Added `deleteAccount()` in `src/repositories/profile-settings.repository.ts`.
  Profile tab now has a "Delete Account" button below Sign Out with a
  destructive confirmation alert; mobile + web paths covered.
- **app.json — Play Store metadata.** Bumped `version` 0.1.0 → 1.0.0,
  added `android.versionCode: 1`, added `description`.
- **PostHog event union.** Added `account_deleted` to `FooFooEvent`.

### Sprint 6 — INTELLIGENCE — 2026-05-22

Milestone: RE learns from behaviour, push notifications live, founders
see daily metrics, app survives offline.

**Section 1 — Morning Push Notification**
- New Edge Function `send-morning-notification` (v1). Per-user lookup of
  notifications_enabled + onesignal_player_id + today's planner row,
  builds personalised heading/body from breakfast dish, sends via
  OneSignal REST `https://onesignal.com/api/v1/notifications`, records
  send in `notification_log`. Idempotent per IST day; quiet-hours guard
  22:00–06:00 IST; auto-clears stale `onesignal_player_id` when OneSignal
  reports the player is no longer subscribed.
- New SQL wrapper `public.run_morning_notifications()` (SECURITY DEFINER)
  pulls `service_role_key` from Supabase Vault and POSTs to the function.
- New CRON `foofoo-morning-notifications` (`45 23 * * *` = 5:15 AM IST).
- `app/_layout.tsx`: added `expo-linking` listener — `foofoo://home` deep
  links from the notification jump to `/(tabs)`. Handles both cold-start
  (`Linking.getInitialURL`) and warm (`addEventListener('url', …)`).
- Verified: function returns 200, runs in ~1.5s, quiet-hours guard
  active during this session's 22:30 IST run (no eligible users — none
  have an `onesignal_player_id` set yet, expected pre-EAS-dev-client).

**Section 2 — RE v2: Inferred Preferences (`calculate-inferred-prefs`)**
- New Edge Function. Eligibility: ≥20 weighted actions across ≥14
  distinct days in the last 90 days. Computes spice_score (-1..+1),
  complexity_score (-1..+1), repeat_tolerance (0..1), cuisine_drift
  (jsonb cuisine_code→score). Action weights: locked=1.5,
  tapped_detail/accepted/added_to_date=1.0, tapped_ingredients=0.5,
  swiped_to=0.3, swiped_past=-0.5, not_today=-0.8, never=-2.0;
  surfacing signals (`shown`/`viewed`/`refresh`/`unlocked`) weighted 0
  so they don't move preferences.
- Cuisine drift fires only when ≥5 cuisine observations exist (variance
  floor).
- New SQL wrapper `run_calculate_inferred_prefs()`.
- New CRON `foofoo-weekly-inferred-prefs` (`30 21 * * 6` = Sun 3:00 AM
  IST).
- Verified: seeded a test user with 28 synthetic actions over 14 days;
  function processed 1 eligible user, wrote one `user_inferred_prefs`
  row with spice=+0.27, complexity=+0.50, repeat_tol=0.67, and a
  cuisine_drift jsonb covering 7 cuisines.

**Section 3 — Wire RE v2 into scoring**
- `generate-daily-plan/re-config.ts`: added `RE_V2` constants
  (spice/complexity thresholds + weights, drift + affinity multipliers).
- `generate-daily-plan/scoring.ts`: extended `scoreDish()` and
  `generateSlot()` with optional `inferredPrefs` + `affinityByDishId`
  parameters; new components `re_v2_spice_boost`,
  `re_v2_complexity_boost`, `re_v2_drift_boost`, `re_v2_affinity_boost`
  on `ScoreComponents`; affinity boost applies even without inferred
  prefs (it's a direct historical signal).
- `generate-daily-plan/index.ts`: added parallel fetches for
  `user_inferred_prefs` + `user_recipe_affinity` in the user-context
  block; threads both through to `generateSlot`; stamps
  `re_version = inferredPrefs ? 'v2' : 'v1'` on planner, carousel logs,
  suggestion_logs, debug log, and response envelope.
- Mirrored the same wiring in `generate-daily-plans-batch/index.ts`
  (5 AM CRON) and `regenerate-slot/index.ts` (per-slot regen).
- **Bug discovered + fixed during self-test:** double `const aff`
  declaration in `generate-daily-plan/scoring.ts` caused the v9 bundle
  to 503 with `BOOT_ERROR` (Deno failed to evaluate the module).
  Renamed the second declaration to `affDish`; bundle now boots clean.
  All three functions re-deployed.
- Verified: after seeding inferred_prefs + affinity for the test user
  and clearing tomorrow's plan, the batch run produced a `re_version='v2'`
  planner row with non-zero v2 component values:
    breakfast aff=+0.20 drift=+0.12, lunch aff=+0.20 drift=-0.11 cx=+0.05,
    dinner drift=-0.15. Spice boost stayed 0 because the test user's
    spice_score (0.27) is below the configured threshold (0.30) — works
    as designed.
- All RE safety gates still 0 (never-list violations 0, Jain-rule
  violations 0).

**Section 4 — Pre-computed dish affinity (`compute-recipe-affinity`)**
- New Edge Function. Per (user, dish), starts from baseline 0.5 and
  applies decayed action deltas: locked/tapped_detail/accepted +0.30 ×
  decay, added_to_date +0.20, swiped_to +0.10, tapped_ingredients +0.05,
  swiped_past −0.10, not_today −0.20, rejected −0.30. `never` action
  hard-pins affinity to 0. Decay: ≤7d 1.0, 8-30d 0.5, 31-90d 0.2. Active
  `never_list` entries are also hard-pinned to 0 even without log rows.
  Upserts in batches of 500.
- New SQL wrapper `run_compute_recipe_affinity()`.
- New CRON `foofoo-weekly-recipe-affinity` (`0 22 * * 6` = Sun 3:30 AM
  IST, 30 min after inferred-prefs).
- Verified: first run wrote 18 (user, dish) pairs for 3 users.

**Section 5 — Daily analytics email (`daily-analytics-email`)**
- New Edge Function. Computes 13 metrics for the last full IST day:
  DAU, new_signups, onboarding_done, plans_generated, total_actions,
  acceptance_rate, never_added, most_accepted dish, most_rejected dish,
  search_count, top_search, avg_carousel_depth, re_version breakdown.
  Sends a plain-text report to `FOUNDER_EMAILS` (env var, default
  `ankit3.mittal@ril.com`) via Resend. If `RESEND_API_KEY` is unset,
  metrics still land in `etl_jobs.metadata` so nothing is lost.
- New SQL wrapper `run_daily_analytics_email()`.
- New CRON `foofoo-daily-analytics-email` (`30 17 * * *` = 11:00 PM IST).
- Verified: function ran with status 'partial', captured all 13 metrics
  in etl_jobs.metadata (today: dau=0, plans=5, accept rate=33%, most
  accepted "Rajma Chawal" 2x, top search "roti"). Email send blocked on
  `RESEND_API_KEY` — needs to be added to Supabase Edge Function secrets
  manually (Dashboard → Functions → secrets) for live sending.

**Section 6 — Offline support**
- New `src/hooks/useNetworkStatus.ts` — React hook subscribing to
  NetInfo on native and `navigator.online`/`offline` events on web;
  returns `{ isOnline, wasOffline }`. The `wasOffline` flag latches true
  on first disconnect so reconnect handlers can detect the transition.
- New `src/services/offline.service.ts` — three responsibilities:
    - `cachePlan(userId, planDate, plan)` — persists today's
      `GeneratedPlan` to AsyncStorage under
      `foofoo_plan_cache_<userId>_<planDate>`.
    - `getCachedPlan(...)` — reads it back. Returns null if absent.
    - `queueAction(userId, action)` + `syncPendingActions(userId)` —
      append-only queue at `foofoo_pending_actions_<userId>`; on
      reconnect, drains the queue applying `never` / `lock` /
      `suggestion_log` actions, keeping failures in the queue for the
      next attempt.
- `src/repositories/feedback.repository.ts` — `logSuggestionAction` now
  routes through `OfflineService.queueAction` when offline (detected
  via NetInfo on native, `navigator.onLine` on web).
- `src/modules/home/useHomeScreen.ts` — caches every successful plan
  load; on plan-load failure, falls back to cached plan + sets
  `usingCachedPlan`; on (`isOnline` && `wasOffline`) transition, runs
  `syncPendingActions`. Exposes `isOnline` + `usingCachedPlan` to the
  screen.
- `app/(tabs)/index.tsx` — amber banner above the date navigator
  whenever `!isOnline`. Copy switches between "Offline — showing your
  last plan" and "No internet connection" depending on whether a cache
  hit was available.
- TypeScript: `tsc --noEmit` returns 0 errors.
- Note: in-browser smoke test of the banner toggle (DevTools → Network
  → Offline) is the next manual verification step; not yet exercised
  in this session.

**Schema / infra changes**
- `etl_jobs.status_check` CHECK constraint widened to allow `'partial'`
  in addition to `pending/running/completed/failed`. Was discovered
  during self-test — three new ETL jobs use `'partial'` for mixed-outcome
  runs and were silently failing to insert their etl_jobs row prior to
  the migration.

**CRON inventory (all active)**
| jobname                          | schedule       | IST          |
|----------------------------------|----------------|--------------|
| foofoo-5am-daily-plans           | `30 23 * * *`  | Daily 05:00  |
| foofoo-morning-notifications     | `45 23 * * *`  | Daily 05:15  |
| foofoo-daily-analytics-email     | `30 17 * * *`  | Daily 23:00  |
| foofoo-weekly-inferred-prefs     | `30 21 * * 6`  | Sun 03:00    |
| foofoo-weekly-recipe-affinity    | `0 22 * * 6`   | Sun 03:30    |

**Files created**
- `supabase/functions/send-morning-notification/index.ts`
- `supabase/functions/calculate-inferred-prefs/index.ts`
- `supabase/functions/compute-recipe-affinity/index.ts`
- `supabase/functions/daily-analytics-email/index.ts`
- `src/hooks/useNetworkStatus.ts`
- `src/services/offline.service.ts`

**Files modified**
- `app/_layout.tsx` — added deep-link handler
- `app/(tabs)/index.tsx` — offline banner + isOnline wiring
- `src/modules/home/useHomeScreen.ts` — cache + sync hooks
- `src/repositories/feedback.repository.ts` — offline queueing
- `supabase/functions/generate-daily-plan/{index,scoring,re-config}.ts`
- `supabase/functions/generate-daily-plans-batch/{index,scoring,re-config}.ts`
- `supabase/functions/regenerate-slot/{index,scoring,re-config}.ts`

**Edge Functions deployed**
- send-morning-notification v1
- calculate-inferred-prefs v1
- compute-recipe-affinity v1
- daily-analytics-email v1
- generate-daily-plan v11 (v10 had a boot error, fixed)
- generate-daily-plans-batch v8
- regenerate-slot v7

**Open items / manual follow-ups (carry-over for next sprint)**
- Add `RESEND_API_KEY` to Supabase Edge Function secrets so the daily
  analytics email actually delivers (metrics already captured).
- Add `ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY` to Edge Function
  secrets (notification function reads them but no users qualify yet).
- On-device end-to-end of push + offline still needs an EAS dev client.
- Manual browser smoke of the offline banner (toggle DevTools Network
  to Offline, observe banner, swipe a card, reconnect, watch the queue
  drain into `suggestion_logs`).

### Sprint 5 Post-QA Fix Pass — 2026-05-22

Triggered by the full QA report at `logs/qa_reports/full_qa_20260522.txt`.
TypeScript stayed at 0 errors throughout. All RE safety gates went 4→0
violations.

**Critical — Recommendation Engine safety**
- **R1.1** Jain hard-filter fix in all three RE Edge Functions
  (`supabase/functions/generate-daily-plan/index.ts:144`,
  `generate-daily-plans-batch/index.ts:100`,
  `regenerate-slot/index.ts:150`): added `.eq('is_jain', true)` for
  `food_pref='jain'` so non-Jain dishes can no longer leak into a Jain
  user's carousel. The `egg` branch also dropped `jain` from its diet-type
  list (semantically wrong inclusion).
- **R1.2** Re-verified the QA report's "14 mis-labelled is_jain dishes"
  claim using the canonical FK table (`ingredients`, 78 rows). Confirmed
  **false positive** — the QA agent had joined `ingredients_master` (211
  rows) which is a separate, richer catalogue not referenced by
  `meal_ingredients.ingredient_id`. Real `is_jain` data is correct: 0
  dishes flagged `is_jain=true` actually contain onion/garlic/radish.
- **R1.3** Persist `re_score` in every `planner_carousel` insert across
  all three RE functions. Previously all 192 rows were NULL.
- **R1.4** Added `recommendation_debug_log` insert to the batch function
  (was missing — only the single-plan function wrote rows). Schema
  harmonised across single-plan / batch / regenerate-slot using a `source`
  tag (`'batch' | 'regen' | <implicit single>`).
- **R1.5** Implemented the home-state regional affinity boost (Doc 10
  step 5):
  - New `HOME_STATE_BOOST_MAX = 0.2` in `re-config.ts` (all three fns).
  - `ScoreComponents.homeStateBoost` plumbed through `scoreDish()` and
    `generateSlot()` signatures.
  - New helpers `stateNameToCode(stateName)` and
    `loadRegionAffinity(supabase, stateCode)` in each function's
    `helpers.ts`. Region affinity loaded in parallel with weather.
  - `buildReasoning()` mentions the boost when applied.
- **R1.6** Wired missing `suggestion_logs` action types. Real root cause
  (not noted in QA report): the `suggestion_logs.action` CHECK constraint
  only allowed 6 values, so every `shown`, `swiped_to`, `swiped_past`,
  `tapped_detail`, `tapped_ingredients`, `added_to_date`, `unlocked`,
  `refresh` insert from the client and the RE Edge Functions was
  silently rejected at the DB layer.
  - Migration **staged** as
    `supabase/migrations/20260522110100_widen_suggestion_logs_action_check.sql`.
    Classifier blocked the `mcp__supabase__apply_migration` call from
    AskUserQuestion confirmation alone — user needs to `supabase db push`.
  - Once applied, all 15 action values will be accepted (no client code
    changes needed — gestures already log via `logSuggestionAction`).

**RE deployed**
- `generate-daily-plan` v9 (verify_jwt=true)
- `generate-daily-plans-batch` v6 (verify_jwt=false; service-role only)
- `regenerate-slot` v5 (verify_jwt=true)
- Forced regeneration of the Jain user's 2026-05-23 plan: it now contains
  zero non-Jain dishes (was 15 of 24 before).

**High — runtime resilience**
- **R2.7** Carousel atomic replace **migration staged** as
  `supabase/migrations/20260522110000_atomic_carousel_replace.sql`. New
  SECURITY DEFINER function `replace_planner_carousel_slot(planner_id,
  meal_slot, rows jsonb)` runs delete+insert inside a single transaction.
  `regenerate-slot/index.ts` left on direct delete+insert pending the
  migration being applied; in-line comment points to the migration file.
- **R2.8** Random factor 0.05 → 0.15 in `re-config.ts` of all three Edge
  Functions and in `src/config/constants.ts` (`RE_CONFIG.RANDOM_FACTOR_WEIGHT`
  and `RE_CONFIG.RANDOM_MAX`) — matches Doc 10 §6.7.
- **R2.10** `app/(auth)/email-verification.tsx`: 5-minute hard timeout on
  the 5-sec poll loop. While polling shows an `ActivityIndicator` + label;
  on timeout shows a friendly retry button instead of polling silently
  forever.
- **R2.11** `app/(tabs)/profile.tsx`: when `auth.getUser()` returns no
  user, the reload effect now bounces back to `/(auth)/auth-gate`
  instead of leaving live buttons on a session-expired screen.
- **R2.12** Confirmed `app/dish/[id].tsx`'s `Number.isNaN(dishId)` guard
  IS correct (QA agent's claim that it didn't catch was wrong —
  `Number.isNaN(NaN)` is `true`). No change.
- **R2.13** Wrapped the three remaining bare `.then()` chains with
  `.catch()`:
  - `app/(tabs)/_useHomeScreen.ts:60` — logs to Logger on auth failure
  - `app/(dev)/logs.tsx:57` — silent (dev screen)
  - `src/services/onesignal.service.ts:174` — logs the import failure
- **R2.17** `app/(auth)/sign-up.tsx`: new `getAuthErrorMessage(raw)`
  mapper for common Supabase errors (`User already registered`,
  `Password should be…`, `Invalid email`, network, rate-limit). Raw
  message still logged via `Logger.warn`.
- **R3.5** `app/(auth)/sign-in.tsx`: same friendly-error mapping for
  `Invalid login credentials`, network, rate-limit cases.

**Medium**
- **R3.19** `app/(tabs)/grocery.tsx`: `planDate` now refreshes every
  minute via `setInterval`, so a grocery screen open across midnight
  IST rolls to the new day instead of staying frozen.
- **R3.21** `src/components/dish/MealCard.tsx:282`: fallback image URL
  uses `dish-${id}` when `slug` is null, instead of literal `"null"` as
  the picsum seed (which silently still returned a photo and hid the
  underlying null-slug bug).
- **R3.22** Score breakdown JSON schema for `recommendation_debug_log`
  now matches across single-plan, batch, regen (winner/alternatives/
  context/regen/source/re_version). Single-plan's existing format kept;
  batch + regen updated to fit.

**Not applied (deferred to user)**
- Two DB migrations are **staged as files but not run** because the
  classifier did not accept AskUserQuestion responses as authorization
  for `mcp__supabase__apply_migration`:
  - `20260522110000_atomic_carousel_replace.sql`
  - `20260522110100_widen_suggestion_logs_action_check.sql`
  Apply both via `supabase db push` when convenient. The second is
  high-priority: until it runs, 8 of 10 `suggestion_logs` action types
  continue to be silently rejected.

**Sprint 7 deferrals**
- 74 hardcoded hex colour literals across 26 files (token sweep)
- 6 files >300 lines (profile, search, search.repository, dish/[id],
  MealCard, WeekView) — split along feature seams
- `dish_combos` end-to-end implementation
- 8AM region\_food\_affinity backfill if dropped during a later migration
- Supabase advisors: `auth_leaked_password_protection` toggle and
  `pg_trgm` relocation out of `public`

### Sprint 5 Day-0 Content Backfill — 2026-05-22

- `supabase/migrations/20260522000003_sprint5_content_backfill.sql` (applied
  in several MCP steps; consolidated migration file for reproducibility):
  - **Part A** — `backfill_ingredients_v1()` linked **587 previously-empty
    dishes**, inserting 3,889 `meal_ingredients` rows. Ingredient coverage
    went from 2.4% → **74.2%** (607/818 active dishes).
  - **Part B** — `auto_tag_dishes()` added Tier-1 tags from existing dish
    columns (spice_level, difficulty, meal_type, dish_role with drink→beverage
    mapping, heaviness derived from calories). dish_tags coverage went from
    2.4% → **100%** (818/818 dishes, 4,885 assignments, avg 6.0 tags/dish).
  - **Part C** — `derive_dish_attributes()` rewritten to use the slug-bearing
    `ingredients` table (not `ingredients_master`) and run for every linked
    dish (607 derived). Conflicts logged to `etl_jobs`.
  - **Data correction** — 4 fish dishes were mislabeled `diet_type='veg'`
    (Fish Fry Street Style #690, Ou Tenga Fish Curry #785, Naga Fish Curry
    #796, Chettinad Fish Curry #884). Surfaced by the conflict log. Updated
    to `non_veg` and re-derived.
  - **Safety re-verification** — all four gates return 0:
    veg dish with meat/seafood ingredient: 0;
    is_jain=true with onion/garlic linked: 0;
    active planner diet violations: 0;
    non_veg/egg dish marked is_jain: 0.
- `supabase/functions/backfill-ingredients/index.ts` — Edge Function spec
  (executed via the SQL twin for atomicity, kept here as canonical
  reference + re-runnable endpoint).
- `supabase/functions/derive-dish-attributes/index.ts` — Edge Function
  wrapper around `derive_dish_attributes()` for future CRON use.
- 85 conflicts remain in `etl_jobs` for content review (81 non_veg dishes
  whose name didn't match a meat keyword — e.g. "Keema Matar", "Taar Gosht",
  "Bhopali Gosht Korma"). Not safety violations; content backfill TODO.
- Part D — suggestion-log wiring audit: **all 10 action types are wired in
  code** (the original 3/10 reflected zero-event history, not missing code).
  Code-cleanup items flagged separately (see notes below).
- Sprint 5 carry-over: stale `'swiped'` call at
  `app/(tabs)/_useHomeScreen.ts:175` (use `'swiped_to'`); duplicate
  `logSuggestionAction` exported from both `feedback.repository.ts` and
  `plans.repository.ts`. Consolidate during Sprint 5 cleanup.

### Sprint 5 Security Hardening — 2026-05-22

- `supabase/migrations/20260522000002_sprint5_security_hardening.sql` (applied)
  - Fix 1: enable RLS + service-role-only policy on `_seed_sessions`.
  - Fix 2: revoke `EXECUTE` on `handle_new_user()` from anon/authenticated/PUBLIC.
  - Fix 3: revoke `SELECT` on materialized view `dish_popularity` from
    anon/authenticated/PUBLIC (Edge Functions use service_role).
  - Fix 4: pin `search_path = public, pg_catalog` on `rollback_seed_session`,
    `_trg_meal_ingredients_derive`, `_trg_ingredients_master_derive`.
  - Fix 6: bulk `array_replace('snacks','snack')` on `dishes.meal_types`
    for 296 rows. Client-side `MealSlot`/`DishRole` types already used
    singular `snack` — no TS code changes required.
- Fix 5 (Supabase Auth leaked-password protection) is dashboard-only and
  remains pending until enabled manually.
- Advisor diff (security): cleared `_seed_sessions` RLS ERROR,
  4× `function_search_path_mutable` WARN, `dish_popularity`
  `materialized_view_in_api` WARN, and both `handle_new_user`
  `*_security_definer_function_executable` WARN. Remaining: 6× INFO
  `rls_enabled_no_policy` (admin-only tables — deny-all by default,
  acceptable), 1× WARN `extension_in_public` for `pg_trgm` (low
  priority — Sprint 5 backlog), 1× WARN auth leaked-password (Fix 5).

### Pre-Sprint 5 Health Check — 2026-05-22

- `logs/pre_sprint_reports/pre_sprint5_20260522.txt` — full read-only audit.
  819 dishes (not 829 as the prompt anticipated). 5 critical issues identified.
- `supabase/migrations/20260522000001_pre_sprint5_critical_fixes.sql` —
  pending migration (not yet applied; Supabase MCP was read-only in this
  session) covering:
  - Patch `derive_dish_attributes()` so jain-safety fails closed: non_veg/egg
    dishes are forced `is_jain=false`, and dishes with no ingredient links
    default to `is_jain=false` instead of true. Also pins search_path.
  - Bulk `UPDATE dishes SET is_jain=false WHERE diet_type IN ('non_veg','egg')`
    — fixes 255 mismarked rows (199 non_veg + 56 egg).
  - Deactivate duplicate "Parotta (Kerala/Tamil)" id=569 (kept id=282 canonical).
  - DELETE the 7 planner rows for the affected Jain user
    (7b53646c-1fd4-423a-96fe-ef2bf70c46af) so the RE regenerates with the
    corrected filter.
- Sprint 5 Day-0 backlog (NOT in this migration — requires content work):
  - Backfill `meal_ingredients` for 799 dishes (currently 2.4% coverage)
  - Backfill `dish_tags` for 799 dishes (currently 2.4% coverage)
  - Then re-run `derive_dish_attributes()` for every dish.
  - Populate `dish_similar` (currently empty).
  - Replace 814 missing hero_image_url placeholders.

---

## [v0.1.0] — Sprint 1 Setup — 2026-05-19

### Added
- Expo project scaffolded (TypeScript, Expo SDK 52+, Expo Router)
- React Native Web configured — full feature parity on web from Day 1
- `app/_layout.tsx` — Root layout wrapping GestureHandlerRootView + QueryClientProvider + Stack navigator
- `app/index.tsx` — Entry point: checks Supabase session → routes to auth or home
- `src/services/supabase.ts` — Supabase client with platform-aware SecureStore adapter (SecureStore on native, localStorage on web)
- `src/config/constants.ts` — Global constants: APP_NAME, COLORS, SPACING, BORDER_RADIUS, TIMING, RE_CONFIG, FEATURES, API
- `src/types/index.ts` — Shared TypeScript types: Dish, DailyPlan, UserProfile, MealCard, REInput, REScore, MealSlot, FoodPref, etc.
- `app.json` — Multi-platform config (Android, iOS, Web) with scheme, splash, notifications plugin
- `babel.config.js` — Reanimated plugin configured (must be last)
- `metro.config.js` — Metro bundler configured for web support
- `.env.local` — Template for all API keys (gitignored)
- `.gitignore` — Updated to exclude .env.local, .env.staging
- `CLAUDE.md` — Project context file for Claude Code
- `CHANGELOG.md` — This file

### Packages Installed
| Package | Version | Purpose |
|---------|---------|---------|
| expo-router | latest | File-based navigation |
| react-native-safe-area-context | latest | Safe area handling |
| react-native-screens | latest | Native screen optimization |
| zustand | latest | Lightweight state management |
| @tanstack/react-query | latest | Server state, caching, offline |
| @supabase/supabase-js | latest | Database + Auth + Storage client |
| expo-secure-store | latest | Encrypted session storage on device |
| react-native-gesture-handler | latest | 60fps swipe + long-press gestures |
| react-native-reanimated | latest | Fluid animations |
| expo-image | latest | Fast image loading with Blurhash support |
| expo-notifications | latest | Push notification handling |
| expo-device | latest | Device info for notifications |
| expo-location | latest | GPS for weather city lookup |
| @react-native-community/netinfo | latest | Network/offline detection |
| react-native-web | latest | Web platform support |
| react-dom | latest | Required for web |
| @expo/metro-runtime | latest | Metro web runtime |
| posthog-react-native | latest | Analytics |
| @sentry/react-native | latest | Error tracking |
| @react-native-async-storage/async-storage | latest | Offline plan caching |

### FooFoo Session Reference
`[FooFoo| #003 | Topic: Project Scaffolding | Stage: MVP-Sprint-1 | Output: Full Expo project setup — web+mobile, Supabase client, types, constants, root layout, CLAUDE.md]`

---

## [v0.2.0] — Sprint 1 Complete
<!-- Fill this in when Sprint 1 gate criteria all pass -->
### Added
- [ ] Supabase 42-table migration applied
- [ ] Seed data: cuisines_master, ingredients_master
- [ ] Splash screen
- [ ] 3 Intro screens
- [ ] Auth: Sign Up + Sign In + Email Verification
- [ ] Auto-derivation verified

---

## Change Log Entry Format

When adding an entry, use this template:

```markdown
## [vX.Y.Z] — Sprint N Complete / Feature Name — YYYY-MM-DD

### Added
- Description of new file or feature

### Changed
- Description of what changed in existing code, and why

### Fixed
- Description of bug fixed

### Packages
| Package | Version | Purpose |

### FooFoo Session Reference
[FooFoo| #NNN | Topic: ... | Stage: ... | Output: ...]
```

---
*This file lives at the project root. Every Claude Code session that produces code must add an entry here.*