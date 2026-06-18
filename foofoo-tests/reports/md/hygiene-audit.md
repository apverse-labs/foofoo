# FooFoo — Code Hygiene Audit
**Generated:** 2026-05-25  
**Auditor:** Claude Code (automated scan — PHASE 1, no changes made)  
**Scope:** `foofoo/src/` · `foofoo/app/` · `foofoo/supabase/functions/` · `foofoo-tests/`

---

## Summary Table

| Category | Items found | Safe to auto-fix | Needs review |
|---|---|---|---|
| Dead code | 12 | 7 | 5 |
| Duplicates | 6 | 0 | 6 |
| Optimisation | 4 | 0 | 4 |
| Code smell | 14 | 5 | 9 |
| **TOTAL** | **36** | **12** | **24** |

---

## Category 1: Dead Code

### DC-01 — `FEATURES` flags all hardcoded to `false`
**File:** `foofoo/src/config/constants.ts:7-14`  
```ts
export const FEATURES = {
  GOOGLE_SIGNIN: false,
  PANTRY: false,
  MOOD_SELECTOR: false,
  PREMIUM_TIERS: false,
  FAMILY_PROFILES: false,
  SOCIAL: false,
} as const;
```
**Type:** `dead_flag`  
**Safe to delete:** `NEEDS_REVIEW`  
**Reason:** All 6 flags are Phase 2/3 scaffolding. Zero occurrences of `FEATURES.` anywhere in `src/` or `app/`. Because they document planned work and cost nothing at runtime, the recommended action is to add a JSDoc block explaining the phase roadmap rather than delete — but all surrounding logic that would have been gated on them never got written, so they are pure dead weight at this stage.

---

### DC-02 — `src/utils/test-supabase.ts` — entire file never imported
**File:** `foofoo/src/utils/test-supabase.ts:1-150`  
**Type:** `unused_function`  
**Safe to delete:** `YES`  
**Reason:** `testSupabaseConnection()` is exported but zero `import` statements reference it in any `app/` or `src/` file. The file header itself says "call inside app/index.tsx's useEffect **during local dev**" — it was never wired and belongs in a `scripts/` folder outside the bundled app source.

---

### DC-03 — `src/utils/run-connection-test.js` — entire file never imported
**File:** `foofoo/src/utils/run-connection-test.js:1-180`  
**Type:** `unused_function`  
**Safe to delete:** `YES`  
**Reason:** Pure Node.js CLI script with `require()` calls. Never imported by any TS/TSX file. Zero references anywhere in the codebase. Should live in a `scripts/` folder at the repo root, not inside the bundled React Native source tree.

---

### DC-04 — `getProfile` alias in `profiles.repository.ts`
**File:** `foofoo/src/repositories/profiles.repository.ts:84-91`  
```ts
/** @summary Alias for fetchProfile — preferred name in Phase 3 audit spec. */
export const getProfile = fetchProfile;
```
**Type:** `unused_function`  
**Safe to delete:** `YES`  
**Reason:** `getProfile` is never called anywhere in `app/` or `src/`. The real function `fetchProfile` is imported directly where needed. The "Phase 3 audit spec" reference is forward-looking scaffolding with no live callers.

---

### DC-05 — `isUsernameAvailable` alias in `profiles.repository.ts`
**File:** `foofoo/src/repositories/profiles.repository.ts:118-126`  
```ts
/** @summary Alias for checkUsernameAvailable — preferred name in Phase 3 audit spec. */
export const isUsernameAvailable = checkUsernameAvailable;
```
**Type:** `unused_function`  
**Safe to delete:** `YES`  
**Reason:** Never called anywhere outside its own definition. `checkUsernameAvailable` is imported directly by callers.

---

### DC-06 — `searchAllergens` alias in `onboarding.repository.ts`
**File:** `foofoo/src/repositories/onboarding.repository.ts:202-209`  
```ts
/** @summary Alias for searchIngredients — preferred name in Phase 3 audit spec. */
export const searchAllergens = searchIngredients;
```
**Type:** `unused_function`  
**Safe to delete:** `YES`  
**Reason:** `app/(onboarding)/step-3.tsx` imports and calls `searchIngredients` directly. `searchAllergens` is never referenced anywhere.

---

### DC-07 — `src/repositories/account.repository.ts` — entire file never imported
**File:** `foofoo/src/repositories/account.repository.ts:1-110`  
**Type:** `unused_function` / orphaned implementation  
**Safe to delete:** `NEEDS_REVIEW`  
**Reason:** Zero `import` statements reference `account.repository` in any `app/` or `src/` file. `app/(tabs)/profile.tsx` calls `deleteAccount()` from `profile-settings.repository.ts` (which invokes the `delete-account` Edge Function). `account.repository.ts` is an earlier, parallel implementation that does manual row-by-row table cleanup before calling the separate `delete-user-account` Edge Function. The two approaches are **incompatible** — only one should exist. Confirm `profile-settings.repository.deleteAccount` → `delete-account` Edge Function is the canonical path before deleting.

---

### DC-08 — `supabase/functions/delete-user-account/` — entire Edge Function orphaned
**File:** `foofoo/supabase/functions/delete-user-account/index.ts:1-92`  
**Type:** `premature_feature`  
**Safe to delete:** `NEEDS_REVIEW`  
**Reason:** The only caller in the codebase is `account.repository.ts` (DC-07), which is itself never imported. The live deletion flow is: `profile.tsx` → `profile-settings.repository.deleteAccount()` → `delete-account` Edge Function (which uses CASCADE + `auth.admin.deleteUser`). `delete-user-account` is therefore a deployed but unreachable Edge Function. Confirm DC-07 first, then this can be decommissioned.

---

### DC-09 — `Platform` imported but unused in `app/splash.tsx`
**File:** `foofoo/app/splash.tsx:2`  
```ts
import { StyleSheet, View, Platform } from 'react-native';
```
`Platform` is imported but never referenced in the file body.  
**Type:** `unused_import`  
**Safe to delete:** `YES`  
**Reason:** Pure unused import. Remove `Platform` from the destructure; TypeScript/Metro will not miss it.

---

### DC-10 — `RE_CONFIG` scoring weights in `src/config/constants.ts` never used client-side
**File:** `foofoo/src/config/constants.ts:16-40`  
**Type:** `dead_flag` / misplaced constant  
**Safe to delete:** `NEEDS_REVIEW`  
**Reason:** The entire `RE_CONFIG` export (lines 16-40) — `CUISINE_BOOST_FREQUENT`, `VARIETY_GUARD_DAYS`, `TEMP_HOT_CELSIUS`, `CALORIES_HEAVY`, etc. — has **zero references** anywhere in `src/` or `app/` outside its own definition. All RE scoring happens in Edge Functions, which have their own `re-config.ts` files. The client-side `RE_CONFIG` is documentation masquerading as code. Recommend converting to a markdown comment or removing — but confirm no upcoming Sprint 7+ client-side RE preview UI is planned before deleting.

---

### DC-11 — Cloudinary smoke-test `console.log` block is dead
**File:** `foofoo/src/utils/cloudinary.ts:65-74`  
```ts
if (process.env.CLOUDINARY_SMOKE_TEST) {
  console.log(getCloudinaryUrl('curd_rice_hero_01_qxxbm7', 'thumb'));
  // ...
}
```
**Type:** `dead_flag`  
**Safe to delete:** `YES`  
**Reason:** `CLOUDINARY_SMOKE_TEST` is never set anywhere in the project (not in `.env.local.example`, not in `app.json`). The block never executes. The comments above it already document the expected output — those can stay. Remove the `if` block.

---

### DC-12 — `formatNotificationTime` imported but not called in `profile.tsx`
**File:** `foofoo/app/(tabs)/profile.tsx:33`  
```ts
import {
  getProfileSummary, updateProfileSettings, changePassword, signOut, deleteAccount,
  formatNotificationTime,   // ← imported but never called in this file
  formatMemberSince, initialsFromName, dietLabel,
  ...
} from '../../src/repositories/profile-settings.repository';
```
**Type:** `unused_import`  
**Safe to delete:** `YES`  
**Reason:** `formatNotificationTime` is never invoked in `profile.tsx`. Notification time is rendered via the `TimePickerRow` sub-component which reads directly from `summary.notification_time`. Remove from the import list.

---

## Category 2: Duplicate Code

### DUP-01 — `helpers.ts` identical across all 3 RE Edge Functions
**File paths + lines:**
- `foofoo/supabase/functions/generate-daily-plan/helpers.ts:1-243`
- `foofoo/supabase/functions/generate-daily-plans-batch/helpers.ts:1-243`  
- `foofoo/supabase/functions/regenerate-slot/helpers.ts:1-243`

**What it does:** `getTodayIST`, `getDateDaysAgo`, `getWeatherData`, `fetchCarousel`, `successResponse`, `seededRandom`, `stateNameToCode`, `loadRegionAffinity` — 8 utility functions, byte-for-byte identical across all three functions (verified via `diff`).  
**Suggested location:** `foofoo/supabase/functions/_shared/helpers.ts`  
**Risk:** `MEDIUM` — Supabase Edge Functions do support a `_shared/` directory pattern (import via `'../_shared/helpers.ts'`). Each function's `index.ts` import line changes. No logic changes. However, `supabase functions deploy` must be re-tested to confirm `_shared/` resolves in Deno's module graph. See [Supabase Edge Functions Shared Code docs](https://supabase.com/docs/guides/functions/shared-code).

---

### DUP-02 — `re-config.ts` values duplicated across all 3 RE Edge Functions
**File paths + lines:**
- `foofoo/supabase/functions/generate-daily-plan/re-config.ts:11-53`
- `foofoo/supabase/functions/generate-daily-plans-batch/re-config.ts:1-41`
- `foofoo/supabase/functions/regenerate-slot/re-config.ts:1-42`

**What it does:** `RE_V1` and `RE_V2` constant objects with all scoring weights. Numeric values are identical across all three; `regenerate-slot` version strips the comments but keeps all the same keys and values.  
**Suggested location:** `foofoo/supabase/functions/_shared/re-config.ts`  
**Risk:** `MEDIUM` — Same `_shared/` migration path as DUP-01. Comment-only differences in the `regenerate-slot` copy are not functional. Tuning a weight in one place currently requires editing 3 files — this has already caused a documentation drift (the regenerate-slot copy has no inline comments).

---

### DUP-03 — `InferredPrefs`, `ScoreComponents`, `ScoreResult` interfaces in 3 scoring files
**File paths + lines:**
- `foofoo/supabase/functions/generate-daily-plan/scoring.ts:15-40`
- `foofoo/supabase/functions/generate-daily-plans-batch/scoring.ts:15-40`
- `foofoo/supabase/functions/regenerate-slot/scoring.ts:15-36` (missing `ScoredDish` and `SlotResult`)

**What it does:** TypeScript interface definitions for RE scoring data structures.  
**Suggested location:** `foofoo/supabase/functions/_shared/re-types.ts`  
**Risk:** `MEDIUM` — `regenerate-slot` is already missing `ScoredDish` and `SlotResult` (uses `any` inline instead), creating a drift that could mask type errors. Consolidating into `_shared/` closes the gap and is the same migration as DUP-01/02.

---

### DUP-04 — Two separate `deleteAccount` implementations in client repositories
**File paths + lines:**
- `foofoo/src/repositories/account.repository.ts:18-109` — manually deletes from 10 tables in a loop, then calls `delete-user-account` Edge Function
- `foofoo/src/repositories/profile-settings.repository.ts:172-186` — calls `delete-account` Edge Function (which uses CASCADE + audit log)

**What it does:** Both purport to delete a user account. They have divergent approaches:  
  - `account.repository`: row-by-row deletion (fragile if schema changes), no `audit_log` entry
  - `profile-settings.repository`: Edge Function handles everything via CASCADE, writes DPDP-required audit row

**Suggested single location:** `profile-settings.repository.ts` (already the live path); `account.repository.ts` should be removed after confirmation (DC-07).  
**Risk:** `HIGH` — Before deleting, confirm `profile-settings.repository.deleteAccount` → `delete-account` EF is complete and tested (DPDP compliance is critical). The `account.repository` version is missing the `audit_log` write, making it non-compliant.

---

### DUP-05 — Toast dismiss timeout `2200` hardcoded in two screens
**File paths + lines:**
- `foofoo/app/(tabs)/profile.tsx:71` — `setTimeout(() => setToast(null), 2200)`
- `foofoo/app/(tabs)/search.tsx:174` — `setTimeout(() => setToast(null), 2200)`

**What it does:** Hides the temporary toast notification after 2.2 seconds.  
**Suggested location:** `TIMING.TOAST_DISMISS_MS = 2200` in `src/config/constants.ts`  
**Risk:** `LOW` — Pure constant extraction. Both screens should import `TIMING.TOAST_DISMISS_MS`.

---

### DUP-06 — `select('*')` on `profiles` table in `getProfileSummary`
**File paths + lines:**
- `foofoo/src/repositories/profile-settings.repository.ts:53`
- `foofoo/src/repositories/profiles.repository.ts:40` (uses `select('*')` for the full `UserProfile`)

**What it does:** Fetches all columns from `profiles` when `getProfileSummary` only needs 10 of them (`id, name, username, email, food_pref, avatar_url, premium_tier, created_at, notifications_enabled, notification_time`). The profiles table also has `onesignal_player_id`, `onboarding_completed`, `onboarding_step`, `household_type`, and more that are transferred over the wire unused.  
**Suggested single location:** Replace both `select('*')` calls with explicit column lists.  
**Risk:** `LOW` — SELECT column reduction, no logic change.

---

## Category 3: Optimisation Opportunities

### OPT-01 — Sequential `await` loop deleting from 10 tables in `account.repository.ts`
**File:** `foofoo/src/repositories/account.repository.ts:48-64`  
```ts
for (const table of tablesToClear) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId);
  // ...
}
```
**Current pattern:** 10 sequential round-trips to Supabase for independent `DELETE WHERE user_id=?` calls.  
**Optimised pattern:** `Promise.all(tablesToClear.map(table => supabase.from(table).delete().eq(...)))` — all 10 deletes fire in parallel.  
**Estimated impact:** `HIGH` — Reduces 10 sequential network round-trips to 1 parallel batch. On a 100ms connection, this saves ~900ms of account deletion time. **Note:** This file is currently dead code (DC-07), so the fix only matters if `account.repository.ts` is resurrected.

---

### OPT-02 — `getProfileSummary` fetches `SELECT *` on `profiles`
**File:** `foofoo/src/repositories/profile-settings.repository.ts:53`  
```ts
supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
```
**Current pattern:** Fetches all columns from `profiles` including `onesignal_player_id`, `onboarding_completed`, `onboarding_step`, `household_type`, and others that are immediately discarded.  
**Optimised pattern:**  
```ts
supabase.from('profiles')
  .select('id, name, username, email, food_pref, avatar_url, premium_tier, created_at, notifications_enabled, notification_time')
  .eq('id', userId)
  .maybeSingle()
```
**Estimated impact:** `MEDIUM` — Reduces payload size on every Profile tab mount. The `profiles` row is one of the larger rows in the schema. Also prevents accidentally using fields that weren't intended to be surfaced client-side (e.g., `onesignal_player_id`).

---

### OPT-03 — Double `planner` query in `generate-daily-plan/index.ts`
**File:** `foofoo/supabase/functions/generate-daily-plan/index.ts:86-91` and `169-175`  
**Current pattern:** Two separate queries to `planner` for the same `(user_id, plan_date)` row:
1. Lines 86-91: `select('id, plan_date, re_version, breakfast_ref_id, lunch_ref_id, dinner_ref_id, locked_slots')` — cache-hit check
2. Lines 169-175: `select('id, breakfast_ref_id, lunch_ref_id, dinner_ref_id, locked_slots')` — locked slots fetch

On a `forceRegenerate=true` or cache-miss path, both queries execute for the same row.  
**Optimised pattern:** Combine into a single `select` at line 86 that includes `locked_slots`. Re-use the result at line 169. Save one DB round-trip on every real plan generation.  
**Estimated impact:** `MEDIUM` — One fewer DB round-trip on every plan generation request from the client (cache-miss path). The Edge Function already declares "plan generated in Xms" — this saves ~50-80ms.

---

### OPT-04 — `supabase.auth.getUser()` called independently on every tab mount
**File:** `foofoo/app/(tabs)/search.tsx:89` · `foofoo/app/(tabs)/grocery.tsx:67` · `foofoo/app/(tabs)/profile.tsx:49`  
**Current pattern:** Each tab screen independently calls `supabase.auth.getUser()` on mount to resolve `userId`. These are separate async calls and are not shared.  
**Optimised pattern:** Use `supabase.auth.getSession()` (synchronous from the cached session) or hoist the `userId` into a React Context at the tabs layout level (`app/(tabs)/_layout.tsx`) so all three tabs read the same resolved value.  
**Estimated impact:** `LOW` — `auth.getUser()` is a fast local session read in Supabase JS v2 (hits the local store, not a network call unless the token is expired). However, three separate calls create unnecessary async waterfall on the first render of each tab.

---

## Category 4: Code Smell

### CS-01 — `err: any` in catch blocks across all repositories
**File:** Multiple — `src/repositories/onboarding.repository.ts` (8×), `src/repositories/meal-prefs.repository.ts` (6×), `src/repositories/plans.repository.ts` (5×), `src/repositories/profiles.repository.ts` (1×), `src/services/posthog.service.ts` (5×), `src/services/onesignal.service.ts` (4×)  
**Lines:** e.g. `onboarding.repository.ts:29, 58, 81, 105, 129, 167, 195, 234`  
**Type:** `any_type`  
**Suggested fix:** Replace `catch (err: any)` with `catch (err: unknown)` and use `err instanceof Error ? err.message : String(err)` — pattern already correctly used in `account.repository.ts` and `offline.service.ts`. Unifies error handling to TypeScript-safe standard.

---

### CS-02 — `supabase: any` parameter in all 3 Edge Function `helpers.ts` files
**File:** `foofoo/supabase/functions/generate-daily-plan/helpers.ts:44,91` (and identical lines in batch + regen)  
```ts
export async function getWeatherData(supabase: any, city: string)
export async function fetchCarousel(supabase: any, planId: string)
```
**Type:** `any_type`  
**Suggested fix:** Import `SupabaseClient` from `@supabase/supabase-js` and type the parameter as `SupabaseClient`. The `generate-daily-plans-batch/index.ts` already imports `SupabaseClient` correctly — the helpers.ts files just didn't inherit this.

---

### CS-03 — `LEGAL` URLs defined but Privacy Policy and ToS show "coming soon"
**File:** `foofoo/app/(tabs)/profile.tsx:312-322`  
```ts
onPress={() => showToast('Privacy Policy — coming soon')}  // line 312
onPress={() => showToast('Terms of Service — coming soon')}  // line 319
```
But `foofoo/src/config/constants.ts:92-95` already defines:
```ts
export const LEGAL = {
  PRIVACY_POLICY_URL: 'https://foofoo-privacy.vercel.app/privacy',
  TERMS_OF_SERVICE_URL: 'https://foofoo-privacy.vercel.app/terms',
};
```
**Type:** `stale_todo`  
**Suggested fix:** Replace toast with `Linking.openURL(LEGAL.PRIVACY_POLICY_URL)` and `Linking.openURL(LEGAL.TERMS_OF_SERVICE_URL)`. The URLs are live. The wiring is one line each.

---

### CS-04 — Magic number `2200` (toast dismiss) in two screens
**File:** `foofoo/app/(tabs)/profile.tsx:71` · `foofoo/app/(tabs)/search.tsx:174`  
**Type:** `magic_value`  
**Suggested fix:** Add `TOAST_DISMISS_MS: 2200` to `TIMING` in `src/config/constants.ts` and import it. (Also fixes DUP-05.)

---

### CS-05 — Magic number `2000` (splash screen duration)
**File:** `foofoo/app/splash.tsx:22`  
```ts
const timer = setTimeout(() => { router.replace('/(intro)/intro-1'); }, 2000);
```
**Type:** `magic_value`  
**Suggested fix:** Add `SPLASH_DURATION_MS: 2000` to `TIMING` in `src/config/constants.ts`.

---

### CS-06 — Magic expression `1000 * 60 * 5` (query stale time)
**File:** `foofoo/app/_layout.tsx:36`  
```ts
staleTime: 1000 * 60 * 5,
```
**Type:** `magic_value`  
**Suggested fix:** Add `QUERY_STALE_MS: 300_000` to `TIMING` in `src/config/constants.ts` and use it here.

---

### CS-07 — Magic number `7` for max onboarding steps in `app/index.tsx`
**File:** `foofoo/app/index.tsx:74`  
```ts
const step = Math.min(Math.max((profile?.onboarding_step ?? 0) + 1, 1), 7);
```
**Type:** `magic_value`  
**Suggested fix:** Add `ONBOARDING_STEPS: 7` to a constants group. If onboarding steps change, this hardcoded `7` will silently break the resume logic.

---

### CS-08 — Magic number `8` (minimum password length) in `profile.tsx`
**File:** `foofoo/app/(tabs)/profile.tsx:452`  
```ts
if (next.length < 8) { setErr('Password must be at least 8 characters.'); return; }
```
**Type:** `magic_value`  
**Suggested fix:** Add `PASSWORD_MIN_LENGTH: 8` to constants. Same validation should apply everywhere passwords are created (sign-up screen uses Supabase's own minimum — check consistency).

---

### CS-09 — "Edit photo — coming in Phase 0.5" stale placeholder in profile
**File:** `foofoo/app/(tabs)/profile.tsx:216`  
```ts
onPress={() => showToast('Edit photo — coming in Phase 0.5')}
```
**Type:** `stale_todo`  
**Suggested fix:** Either disable the "Edit photo" `<Pressable>` entirely (remove it + button) until Phase 0.5, or replace the toast with a non-interactive element. A tappable element with a toast creates false affordance and will appear in QA/store review.

---

### CS-10 — `generateSlot` called with 17 positional parameters (3× in each RE index)
**File:** `foofoo/supabase/functions/generate-daily-plan/index.ts:182-184`  
```ts
const breakfastResult = generateSlot('breakfast', user.id, planDate, allDishes as any[], assignedDishIds, lockedSlots.includes('breakfast') ? existingForLocks?.breakfast_ref_id : undefined, neverDishIds, excludedIngredients, cuisineBuckets, mealItemBuckets, cuisineIdToCode, weather, isWeekend, recentDishIds, regionAffinityByCuisineId, inferredPrefs as any, affinityByDishId);
```
**Type:** `long_function` / excessive parameter count  
**Suggested fix:** Introduce a `SlotContext` object type that groups the invariant parameters (`neverDishIds`, `excludedIngredients`, `cuisineBuckets`, `mealItemBuckets`, `cuisineIdToCode`, `weather`, `isWeekend`, `recentDishIds`, `regionAffinityByCuisineId`, `inferredPrefs`, `affinityByDishId`) and pass the context as a single argument. Reduces each call to `generateSlot(slot, userId, planDate, dishes, context)`.

---

### CS-11 — `useWindowDimensions` in `search.tsx` vs `useResponsive()` everywhere else
**File:** `foofoo/app/(tabs)/search.tsx:71`  
```ts
const { width } = useWindowDimensions();
```
Other screens (`grocery.tsx:38`, `(tabs)/index.tsx:34`) use:  
```ts
const { contentWidth } = useResponsive();
```
`useResponsive()` already caps `contentWidth` at 700 and handles the breakpoint logic (from `src/utils/responsive.ts`). The search screen re-implements the same cap inline:  
```ts
const contentWidth = Math.min(width, 700);  // line 148
```
**Type:** `magic_value` + inconsistency  
**Suggested fix:** Replace `useWindowDimensions` + inline `Math.min(width, 700)` with `const { contentWidth } = useResponsive()`.

---

### CS-12 — `console.log` smoke test in `cloudinary.ts` (guarded but bundled)
**File:** `foofoo/src/utils/cloudinary.ts:65-74`  
**Type:** `console_log`  
**Suggested fix:** Remove the `if (process.env.CLOUDINARY_SMOKE_TEST)` block entirely — it is never triggered (DC-11). The comments above it documenting expected output are sufficient.

---

### CS-13 — `console.log` present in production Edge Function scoring path
**File:** `foofoo/supabase/functions/generate-daily-plan/scoring.ts:242`  
```ts
console.log(`[RE-v1] ${mealSlot}: ${eligible.length} eligible dishes scored`);
```
Also: `foofoo/supabase/functions/generate-daily-plans-batch/scoring.ts:242`  
**Type:** `console_log`  
**Suggested fix:** In Supabase Edge Functions, `console.log` goes to the function logs dashboard — acceptable for debugging. However this fires on **every slot of every plan generation** (3× per request), adding 3 log lines per plan. In a batch run over 500 users, that's 1500 log lines per batch. Wrap in a `DEBUG` flag or remove from the hot path.

---

### CS-14 — "Full recipe coming soon" stale content markers in dish detail
**File:** `foofoo/app/dish/[id].tsx:223` · `foofoo/app/dish/[id].tsx:232` · `foofoo/src/components/dish/IngredientList.tsx:34`  
```ts
<Text style={styles.sectionSub}>Simple ingredient list — full recipe coming soon</Text>
<Text style={styles.recipeTitle}>Full recipe with quantities &amp; steps coming soon!</Text>
<Text>Ingredients coming soon for this dish 🍳</Text>
```
**Type:** `stale_todo`  
**Suggested fix:** These are accurate Phase 0.5 placeholders (Doc 12 confirms full recipes are Phase 0.5). They are not bugs. However, the "Ingredients coming soon" in `IngredientList.tsx:34` fires when `meal_ingredients` is empty — for MVP dishes that should all have ingredients seeded, this case may indicate a data gap rather than a Phase 0.5 feature. Suggest renaming the component fallback to `"Ingredient data not yet linked for this dish"` to distinguish a data issue from a planned feature.

---

## Appendix: Files Reviewed

| File | Lines | Status |
|---|---|---|
| `src/config/constants.ts` | 95 | ✓ Reviewed |
| `src/types/index.ts` | 274 | ✓ Reviewed |
| `src/services/supabase.ts` | 47 | ✓ Reviewed |
| `src/services/offline.service.ts` | 148 | ✓ Reviewed |
| `src/services/onesignal.service.ts` | 179 | ✓ Reviewed |
| `src/services/posthog.service.ts` | 188 | ✓ Reviewed |
| `src/repositories/account.repository.ts` | 110 | ✓ Reviewed |
| `src/repositories/dishes.repository.ts` | 80 | ✓ Reviewed |
| `src/repositories/feedback.repository.ts` | 146 | ✓ Reviewed |
| `src/repositories/grocery.repository.ts` | 133 | ✓ Reviewed |
| `src/repositories/meal-prefs.repository.ts` | 246 | ✓ Reviewed |
| `src/repositories/onboarding.repository.ts` | 238 | ✓ Reviewed |
| `src/repositories/plans.repository.ts` | 254 | ✓ Reviewed |
| `src/repositories/profile-settings.repository.ts` | 246 | ✓ Reviewed |
| `src/repositories/profiles.repository.ts` | 274 | ✓ Reviewed |
| `src/repositories/search.repository.ts` | 460 | ✓ Reviewed |
| `src/repositories/week.repository.ts` | 151 | ✓ Reviewed |
| `src/modules/home/HomeScreen.helpers.tsx` | ~100 | ✓ Reviewed |
| `src/modules/home/useHomeScreen.ts` | 323 | ✓ Reviewed |
| `src/hooks/useNetworkStatus.ts` | ~50 | ✓ Reviewed |
| `src/utils/cloudinary.ts` | ~75 | ✓ Reviewed |
| `src/utils/indian-states.ts` | ~45 | ✓ Reviewed |
| `src/utils/ingredientCategory.ts` | ~40 | ✓ Reviewed |
| `src/utils/reDecisionLogger.ts` | ~120 | ✓ Reviewed |
| `src/utils/responsive.ts` | ~50 | ✓ Reviewed |
| `src/utils/systemLogger.ts` | ~80 | ✓ Reviewed |
| `src/utils/userJourneyLogger.ts` | ~80 | ✓ Reviewed |
| `src/utils/test-supabase.ts` | 150 | ✓ Reviewed |
| `src/utils/run-connection-test.js` | 180 | ✓ Reviewed |
| `src/utils/validators.ts` | 19 | ✓ Reviewed |
| `app/_layout.tsx` | 102 | ✓ Reviewed |
| `app/index.tsx` | 124 | ✓ Reviewed |
| `app/splash.tsx` | 50 | ✓ Reviewed |
| `app/(tabs)/_layout.tsx` | 58 | ✓ Reviewed |
| `app/(tabs)/index.tsx` | 265 | ✓ Reviewed |
| `app/(tabs)/grocery.tsx` | 305 | ✓ Reviewed |
| `app/(tabs)/profile.tsx` | 637 | ✓ Reviewed |
| `app/(tabs)/search.tsx` | 366 | ✓ Reviewed |
| `app/(auth)/sign-in.tsx` | ~210 | ✓ Reviewed |
| `app/(auth)/sign-up.tsx` | ~280 | ✓ Reviewed |
| `app/(auth)/forgot-password.tsx` | ~155 | ✓ Reviewed |
| `app/(auth)/email-verification.tsx` | ~215 | ✓ Reviewed |
| `app/(auth)/auth-gate.tsx` | ~120 | ✓ Reviewed |
| `app/(onboarding)/step-1.tsx` through `step-7.tsx` | ~1300 | ✓ Reviewed |
| `app/(intro)/intro-1.tsx` | ~222 | ✓ Reviewed |
| `app/(dev)/logs.tsx` | ~275 | ✓ Reviewed |
| `app/dish/[id].tsx` | ~375 | ✓ Reviewed |
| `src/components/dish/*.tsx` (7 files) | ~400 | ✓ Reviewed |
| `src/components/grocery/*.tsx` (2 files) | ~120 | ✓ Reviewed |
| `src/components/planner/WeekView.tsx` | ~200 | ✓ Reviewed |
| `src/components/search/*.tsx` (5 files) | ~350 | ✓ Reviewed |
| `src/components/shared/*.tsx` (4 files) | ~300 | ✓ Reviewed |
| `supabase/functions/generate-daily-plan/*` (4 files) | ~900 | ✓ Reviewed |
| `supabase/functions/generate-daily-plans-batch/*` (4 files) | ~950 | ✓ Reviewed |
| `supabase/functions/regenerate-slot/*` (4 files) | ~800 | ✓ Reviewed |
| `supabase/functions/delete-account/index.ts` | 111 | ✓ Reviewed |
| `supabase/functions/delete-user-account/index.ts` | 92 | ✓ Reviewed |
| `supabase/functions/log-re-decision/index.ts` | 97 | ✓ Reviewed |
| `supabase/functions/backfill-ingredients/index.ts` | 183 | ✓ Reviewed |
| `supabase/functions/calculate-inferred-prefs/index.ts` | 227 | ✓ Reviewed |
| `supabase/functions/compute-recipe-affinity/index.ts` | 193 | ✓ Reviewed |
| `supabase/functions/daily-analytics-email/index.ts` | 309 | ✓ Reviewed |
| `supabase/functions/derive-dish-attributes/index.ts` | 67 | ✓ Reviewed |
| `supabase/functions/send-morning-notification/index.ts` | 207 | ✓ Reviewed |
| `supabase/functions/sync-cloudinary-images/index.ts` | 180 | ✓ Reviewed |
| `foofoo-tests/CONTEXT.md` | 51 | ✓ Updated (foofoo-app/ → foofoo/) |

---

## 2026-06-17 Safe-fix pass

5 additional unambiguous unused-import / dead-code items were found and fixed via `tsc --noUnusedLocals` (not previously itemised by symbol name in this doc's DC/CS list, but same category as DC-02/DC-03):

| File | Fix |
|---|---|
| `foofoo/app/(tabs)/search.tsx` | Removed unused `useRef` import (named import, never called) |
| `foofoo/app/_layout.tsx` | Removed unused `COLORS` import from `src/config/constants` |
| `foofoo/src/components/re/weekly/REDishCarousel.tsx` | Removed unused `View` import from `react-native` |
| `foofoo/src/components/re/home/REMealCard.tsx` | Removed unused `BORDER_RADIUS` import from `config/re-theme` |
| `foofoo/src/repositories/re-plan.repository.ts` | Removed dead `pickClass()` function (defined, never called anywhere in the file or imported elsewhere) |

Verified post-fix: `foofoo/ tsc --noEmit` → 0 errors; `foofoo-tests/` unit suite → 417/417 passing. The bulk of `tsc --noUnusedLocals` output (~40 files) was `import React from 'react'` flagged unused under the new JSX transform — left untouched as a repo-wide convention rather than auto-stripped, since touching ~40 files for a cosmetic/non-functional import is outside "unambiguous, mechanical, low-risk" scope and risks masking a real future regression if the transform config ever changes.

---

## apverse-labs-re (Meal_Planning_RE_Engine) Scope

**Coverage:** This audit's scope line lists `foofoo/src/`, `foofoo/app/`, `foofoo/supabase/functions/`, `foofoo-tests/` — `Meal_Planning_RE_Engine/` (the doc/audit-tree folder) is not included. `console.log` finding CS-13 (production Edge Function hot path) is specific to `generate-daily-plan`/`generate-daily-plans-batch` scoring code (app-side legacy RE), not RE-module code.

**Correction (2026-06-17):** the `src/components/re/*` and `src/repositories/re-plan.repository.ts` files touched in the 2026-06-17 safe-fix pass above are **not** merely an "app-side integration layer" calling into the RE module from outside — per `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/03_CODE_AUDIT/CODE_STRUCTURE_AUDIT.md`'s own implementation-surface mapping, `foofoo/src/re-engine/**` and `foofoo/src/repositories/re-*.repository.ts` (including `re-plan.repository.ts`, mapped there as BUILD-04 "weekly class-first plan") **are** the actual `Meal_Planning_RE_Engine` module implementation — just located outside the module's own `00_Implementation/` folder, which that audit explicitly calls a "documented divergence, not a defect" from the module CLAUDE.md's aspirational layout. So the dead-code fix to `re-plan.repository.ts` in this pass was, in fact, a hygiene fix to RE-module-internal code, not RE-adjacent code.

**Not yet covered for RE:**
- No hygiene scan (dead code / duplicates / code smell) has been run over `Meal_Planning_RE_Engine/00_Implementation/` — that tree has its own structure audit instead (see cross-reference below), which checks architecture-pattern compliance rather than hygiene issues like unused imports or dead code.
- The logger-utility convention recorded in this doc and `hygiene-complete.md` (`src/utils/systemLogger.ts` primary, `src/lib/logger.ts` lightweight companion) has not been verified as the intended pattern for any future RE module client-side code — the RE module's own `CLAUDE.md` doesn't currently specify a logging convention.

**Cross-reference:** `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/03_CODE_AUDIT/CODE_STRUCTURE_AUDIT.md`, `CODE_TO_DOC_TRACEABILITY.md`, and `WRONG_PATTERN_SCAN.md` (17 clean / 3 partial / 0 wrong-architecture patterns — closest existing equivalent to a hygiene audit for the RE module, though it audits architecture-pattern conformance rather than dead-code/unused-import hygiene specifically).
