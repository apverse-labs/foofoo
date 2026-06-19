# FooFoo — DPDP Compliance Audit
_Audited: 2026-05-25 | Auditor: Claude Code_

---

## ⚡ MUST-FIX BEFORE PLAY STORE SUBMISSION

1. **No Privacy Policy URL** — `app.json` has no `android.privacyPolicyUrl`. Play Store will reject the app without a live, linked Privacy Policy.
2. **Consent has no explicit UI action** — Users never see a checkbox or tap-to-agree. Both the sign-up screen and Step 7 record consent as a silent background call. Under DPDP 2023, consent must be "free, specific, informed and unambiguous". A background write does not satisfy this.
3. **Single undifferentiated consent** — There is no separation between required processing (plan generation), optional analytics (PostHog), and optional marketing (OneSignal push). All consent is a single timestamp. DPDP requires granular, per-purpose consent.
4. **No data export feature** — Users have no way to download their personal data. No Edge Function for this exists. DPDP Section 11 grants the right to access / receive data.
5. **`data_consent_version` missing at sign-up** — The local `recordConsent()` in `sign-up.tsx` writes `data_consent_at` but omits `data_consent_version`. Only the Step 7 `meal-prefs.repository.ts` version sets `'v1.0'`.

---

## Founder Summary (Non-Technical)

### What you must have before submission

**MUST HAVE — Play Store will reject without these:**
1. Privacy Policy at a live public URL — add URL to `app.json` as `android.privacyPolicyUrl`
2. Privacy Policy must mention: what data you collect, why, who you share with, how users can delete their account, contact details for data queries

**MUST HAVE — DPDP legal requirement:**
3. Granular consent UI — show users a screen (not a background call) with separate opt-in checkboxes for analytics (PostHog) and marketing notifications (OneSignal), plus a disclosure that plan generation requires processing their preferences
4. Data export function — users must be able to download their data (a JSON file is fine)
5. Account deletion — implemented and working; the 72-hour grace period is not coded but deletion is immediate; assess whether a soft-delete/grace window is needed

**SHOULD HAVE — good practice:**
6. Hash user_id before attaching it to Sentry errors (currently Sentry receives the raw exception message from systemLogger but no explicit `setUser` call — low risk but good hygiene)
7. PostHog DPA (Data Processing Agreement) signed — posthog.com offers one under GDPR/DPA tab; applicable to DPDP as well
8. Grievance Officer name and contact email visible in-app (currently only `support@foofoo.app` appears in an error dialog)
9. Remove or justify `household_type` column in `profiles` — it is in the schema and types but never collected or used

---

## Detailed Findings

### Task 1: Consent Flow

| # | Check | STATUS | Description | Recommendation |
|---|-------|--------|-------------|----------------|
| 1.1 | Consent timing — relative to data collection | FLAG | `recordConsent()` is called in `sign-up.tsx` AFTER `supabase.auth.signUp()` completes (line 135). The auth trigger `handle_new_user()` fires on INSERT into `auth.users` and immediately writes a row to `public.profiles` (name + email). Profile data is therefore stored BEFORE consent is recorded. Additionally, even if sign-up with email confirmation is enabled, `recordConsent` still runs before onboarding (which writes diet rules, allergens, cuisine prefs). | Record consent BEFORE writing any personal data, or use a DB-level trigger that creates the consent row simultaneously with the profile row. |
| 1.2 | Consent UI — explicit user action | FLAG | Neither the sign-up screen nor onboarding Step 7 show the user a visible consent element. Consent is recorded silently in `recordConsent()` called inside `handleSignUp()` and `handleStart()`. There is no checkbox, toggle, or "I agree" button linked to a policy URL. | Add a checkbox with text "I agree to the [Privacy Policy] and [Terms of Service]" that must be checked before the Create Account button is enabled. Link to live URLs. |
| 1.3 | Consent granularity | NEEDS_IMPROVEMENT | `user_consent` has only `data_consent_at` and `data_consent_version`. No columns for `analytics_consent`, `marketing_consent`, or `required_processing_acknowledged`. All three uses (plan generation, PostHog, OneSignal) are bundled into one implicit consent. | Add `analytics_consent_at TIMESTAMPTZ`, `analytics_consent_version TEXT`, `marketing_consent_at TIMESTAMPTZ` columns to `user_consent`. Present separate opt-in toggles at sign-up or in onboarding Step 7. Required processing should be disclosed (not opted into). |
| 1.4 | Consent version stored | PASS (partial) | `meal-prefs.repository.ts recordConsent()` stores `data_consent_version: 'v1.0'`. The migration adds the column (`20260520000006`). However, the `recordConsent()` function in `sign-up.tsx` (local copy, separate from the shared repo function) does NOT include `data_consent_version`, meaning sign-up-path consent records will have a null version. | Remove the duplicate local `recordConsent()` in `sign-up.tsx` and call the shared `recordConsent` from `meal-prefs.repository.ts` instead, so version is always stored. |
| 1.5 | Double consent recording | NEEDS_IMPROVEMENT | Consent is recorded twice: once at sign-up (`sign-up.tsx` line 135) and once at end of onboarding (`step-7.tsx` via `recordConsent`). The upsert `onConflict: 'user_id'` means only the last timestamp survives (Step 7). However, the sign-up consent omits `data_consent_version`. The Step 7 consent is recorded at the correct time (after user explicitly taps "Start Using Foofoo") but still not linked to a visible privacy policy. | Consolidate to one consent recording point (Step 7 is the better location). Remove consent write from sign-up screen. |

---

### Task 2: Data Subject Rights

| Right | Implemented | Gaps | Recommendation |
|-------|-------------|------|----------------|
| Right to Access / Data Export | MISSING | No Edge Function exists for data export. No UI in profile.tsx for "Download my data". The DPDP compliance test (`dpdp-compliance.test.ts`) includes a test `can fetch complete user data for export` that assembles data from multiple tables, confirming the intent, but no production path delivers this to the user. | Build a `export-user-data` Edge Function that queries all personal tables (profiles, user_diet_rules, user_category_preferences, user_consent, never_list, suggestion_logs) for the authenticated user and returns a JSON file. Add "Download my data" button in Profile → Account section. |
| Right to Correction | PARTIAL | Profile screen has "Food Preferences" tappable card that routes to onboarding step-2 (re-runs food pref, allergens, cuisines). Name and username are not editable post-onboarding from the profile screen (only shown, no edit). Notification time and enabled flag are editable. | Add name/username edit to Profile → Account section. |
| Right to Erasure | PASS (with gaps) | Account deletion is implemented: Profile Danger Zone → two-step confirm → calls `delete-account` Edge Function → anonymises `suggestion_logs` + `user_feedback` → calls `auth.admin.deleteUser` → CASCADE deletes all FK-linked tables. `audit_log` is retained. No 72-hour grace window / soft-delete; deletion is immediate on confirm. | Assess whether immediate deletion satisfies "reasonable time" under DPDP. Consider 24-48h deactivation window (mark account as `pending_deletion`, cron cleans up). Verify `recommendation_debug_log`, `app_events`, `notification_log`, `planner`, `planner_carousel`, `never_list` are all CASCADE-deleted (they should be via profiles FK but confirm in DB). |
| Right to Grievance Redressal | PARTIAL | `support@foofoo.app` appears only in the error dialog for failed account deletion (profile.tsx line 180). Not visible in any accessible in-app settings view or "About" section. No Grievance Officer name or contact named anywhere in the codebase. Privacy Policy and Terms of Service links in Profile → App Info show toasts ("coming soon"). | Add a visible "Contact Us / Grievance" row in Profile → App Info linking to support email. Name a Grievance Officer in the Privacy Policy with a 30-day response commitment. |
| Right to Withdraw Consent | MISSING | No UI to withdraw analytics consent or marketing consent (independently of account deletion). | Analytics (PostHog) opt-out toggle should be available in Profile settings. OneSignal push is already toggleable (Notifications switch). |

---

### Task 3: Data Minimisation

**`profiles` table:**

| Field | Purpose | Used by Feature | Flag |
|-------|---------|-----------------|------|
| `id` | PK / auth link | All features | OK |
| `email` | Display in Profile screen | Profile → Account section | OK — minimal |
| `name` | Display, personalisation | Profile avatar, plan logs | OK |
| `username` | Unique handle | Profile display | OK — but no social feature yet uses it; consider deferring collection to Phase 1 |
| `avatar_url` | Profile photo | Profile avatar placeholder (initials used, no photo upload) | FLAG — column exists, never populated via UI, not displayed. Data not collected but schema signals future collection intent. |
| `food_pref` | RE hard filter | Plan generation, profile summary | OK |
| `home_state` | RE regional affinity boost, weather fallback | Plan generation | OK |
| `current_city` | Primary weather lookup | Plan generation | OK — city name only, no GPS coordinates |
| `household_type` | Unknown | Not found in any screen, repository, or Edge Function (only in `types/index.ts`) | FLAG — collected in schema and typed but never asked in onboarding and never used. Remove from schema or add to onboarding with a clear use case. |
| `role` | Cook vs instruct mode | Step 7, profile | OK |
| `onboarding_completed` | Routing logic | `app/index.tsx` | OK |
| `onboarding_step` | Resume onboarding | `app/index.tsx` | OK |
| `notification_time` | Push notification scheduling | Morning push Edge Function | OK |
| `notifications_enabled` | Enable/disable push | Morning push Edge Function | OK |
| `created_at` | Membership tenure display | Profile screen | OK |
| `updated_at` | Internal | Not user-facing | OK |

**`user_diet_rules` table:**

| Field | Purpose | Used by Feature | Flag |
|-------|---------|-----------------|------|
| `food_pref` | RE hard filter | Plan generation (duplicate of `profiles.food_pref`) | NEEDS_IMPROVEMENT — stored in two places. `user_diet_rules.food_pref` is used by the RE; `profiles.food_pref` is used for UI display. Acceptable but creates inconsistency risk if one is updated without the other (both are set in `saveFoodPref()`). |
| `excluded_ingredients` | Allergen filter | RE hard filter (integer IDs) | OK |
| `allowed_meats` | Meat preference filter | Schema only (column added in migration 6); not yet used by RE | FLAG — column added but no UI collects it. Defer until RE v2 uses it. |

**`user_consent` table:**

| Field | Purpose | Flag |
|-------|---------|------|
| `data_consent_at` | Timestamp of consent | OK |
| `data_consent_version` | Policy version accepted | OK (column exists; sign-up path doesn't populate it — see Task 1.4) |
| `analytics_consent_at` | Analytics (PostHog) consent timestamp | MISSING — needs to be added |
| `marketing_consent_at` | Marketing notifications (OneSignal) consent timestamp | MISSING — needs to be added |

---

### Task 4: Third Party Data Sharing

| Party | Data Sent | PII Risk | Disclosure Needed |
|-------|-----------|----------|--------------------|
| **PostHog** | User UUID (raw, unhashed) sent via `posthog.identify(userId, { food_pref, home_state, premium_tier, onboarding_completed })`. Events include `sign_up`, `account_deleted`, `dish_not_today` (with `dish_id`), screen names. `timestamp` and `is_dev` added to all events. | MEDIUM — user UUID is a stable pseudonymous identifier. `food_pref` and `home_state` are personal preference data. Together they constitute personal data under DPDP. `home_state` specifically identifies a geographic region. | Yes — must be listed in Privacy Policy. Analytics consent should be opt-in, separate from required processing consent. Consider hashing UUID before passing to `posthog.identify()` or using PostHog's distinct ID aliasing. |
| **Sentry** | Error messages + module context via `captureException(new Error("[MODULE] message"), { extra: meta })`. No explicit `Sentry.setUser()` call found — user UUID is NOT directly set as Sentry user context. However, meta objects passed via Logger may incidentally contain `userId` (e.g., `Logger.error('PROFILES', 'fetchProfile failed', { error: ..., userId })` passes userId in `extra`). | LOW-MEDIUM — user UUID may appear in Sentry `extra` context of error events. No email or name sent. | Yes — must be listed in Privacy Policy as an error monitoring processor. Hash or omit userId from Logger meta passed to Sentry. |
| **OneSignal** | Device push subscription ID (`onesignal_player_id`) stored in `profiles` and used by Edge Function to target the user's device. Device type implicit in SDK registration. No email or name sent to OneSignal directly. | LOW-MEDIUM — subscription ID is linked to user's device and stored against their `user_id`. Constitutes personal data as it enables targeting. | Yes — must be listed in Privacy Policy. Notifications consent should be opt-in (it is, via the Notifications button in Step 7 — but not explicitly linked to a consent record). |
| **Cloudinary** | Dish images only (no user data). `cloudinary.ts` utility constructs CDN URLs from dish slugs. | LOW — no user data transmitted. | No — but note in Privacy Policy for transparency. |
| **OpenWeatherMap** | `current_city` (text, e.g. "Mumbai") appended to API URL: `?q=${city},IN&appid=...`. Sent from Supabase Edge Function server-side, NOT from client device. User's IP is not involved. | LOW — city name is text data, transmitted server-side. However, city name is derived from user's `profiles.current_city` and tied to their user_id in application logic. Under DPDP it is personal data if linkable. | Yes — list in Privacy Policy. City is sent to a third-party weather API. No personal identifier (user_id, email) accompanies the request. |
| **Supabase** | All user data (auth, profiles, preferences, logs). Supabase hosts the database in `ap-south-1` (Mumbai). | HIGH (as infrastructure) — Supabase is the primary data processor. | Supabase must be listed as a data processor in Privacy Policy. Check if Supabase offers a DPA — they do (supabase.com/dpa). Sign it. |

---

## Legal Document Outlines

> Section headings only — actual legal text must be drafted by a lawyer or reviewed via Termly/iubenda.

### Privacy Policy — Section Headings

1. Who We Are (Data Controller details — company name, registered address, Grievance Officer name + email, response time commitment: 30 days)
2. What Personal Data We Collect
   - Account data (name, email, password hash managed by Supabase Auth)
   - Profile data (username, home state, current city)
   - Preference data (food preference type, allergen exclusions, cuisine preferences, meal item preferences)
   - Usage data (meal plan interactions, swipes, locks, search queries, feature taps)
   - Device data (push notification subscription ID, device platform, app version)
   - Location data (city name entered by user — not GPS; used for weather-based recommendations)
3. Why We Collect It (Purpose Limitation)
   - Account creation and authentication (required — no alternative)
   - Personalised meal plan generation (required — core feature)
   - Regional food recommendations (required — based on home state)
   - Weather-contextual recommendations (required — uses city name)
   - App improvement analytics (optional — PostHog — requires separate consent)
   - Morning push notifications (optional — OneSignal — requires separate consent)
4. Who We Share It With
   - PostHog, Inc. (analytics — USA) — user pseudonymous ID + behavioural events
   - Sentry (error monitoring — USA) — anonymised error logs + app module context
   - OneSignal, Inc. (push notifications — USA) — device push subscription ID
   - Cloudinary, Inc. (image delivery — USA/CDN) — no user data
   - OpenWeatherMap (weather data — EU) — city name only, server-side, no user identifier
   - Supabase, Inc. (database and auth infrastructure — USA, data stored ap-south-1 Mumbai)
5. How Long We Keep It
   - Account and preference data: until account deletion request is fulfilled
   - Behavioural logs (suggestion_logs): anonymised (user_id set to null) on account deletion; retained for aggregate analytics
   - Audit logs: minimum 3 years from event date per DPDP Section 17
   - Error logs (Sentry): per Sentry's retention policy (30 days free tier)
   - Analytics (PostHog): per PostHog's retention policy (configurable per project)
6. Your Rights Under DPDP Act 2023
   - Right to access your personal data
   - Right to correct inaccurate personal data
   - Right to erase your personal data (right to be forgotten)
   - Right to withdraw consent for optional processing (analytics, notifications)
   - Right to grievance redressal
7. How to Exercise Your Rights
   - In-app deletion: Settings → Danger Zone → Delete My Account
   - In-app data access: Settings → Download My Data (to be implemented)
   - Email: [grievance officer email]
   - Response time: within 30 days of receipt of request
8. Children's Data (DPDP requires verifiable parental consent for users under 18)
9. Security Measures
10. Changes to This Policy (versioning — consent re-capture required on material changes)
11. Contact Us / Grievance Officer

### Terms of Service — Section Headings

1. Acceptance of Terms
2. Description of Service
3. User Accounts and Responsibilities
4. Acceptable Use Policy
5. Intellectual Property
6. User-Generated Content (none currently, but reserve rights)
7. Disclaimer of Warranties
8. Limitation of Liability
9. Governing Law (Republic of India; jurisdiction: [city, e.g. Mumbai])
10. Dispute Resolution (Arbitration clause or court of jurisdiction)
11. Changes to Terms
12. Contact

---

## Action Checklist

| # | Action | Priority | Owner | Status |
|---|--------|----------|-------|--------|
| 1 | Publish Privacy Policy at a live public URL | CRITICAL | Founder + Legal | ⬜ |
| 2 | Add `privacyPolicyUrl` to `app.json` under `android` and `ios` | CRITICAL | Dev | ⬜ |
| 3 | Replace silent background `recordConsent()` in `sign-up.tsx` with a visible checkbox linking to Privacy Policy | CRITICAL | Dev | ⬜ |
| 4 | Add granular consent: separate opt-in for analytics (PostHog) and notifications (OneSignal) — add columns `analytics_consent_at`, `marketing_consent_at` to `user_consent` | HIGH | Dev | ⬜ |
| 5 | Build `export-user-data` Edge Function + "Download my data" UI in Profile | HIGH | Dev | ⬜ |
| 6 | Fix `recordConsent()` in `sign-up.tsx` to include `data_consent_version` — or remove the duplicate and call only the shared function from `meal-prefs.repository.ts` | HIGH | Dev | ⬜ |
| 7 | Add Grievance Officer name + contact email to Privacy Policy and make it accessible in-app (Profile → App Info) | HIGH | Founder + Legal | ⬜ |
| 8 | Remove `household_type` column from `profiles` (or add onboarding step + RE usage) | MEDIUM | Dev | ⬜ |
| 9 | Remove `allowed_meats` column from `user_diet_rules` until RE uses it (minimisation) | MEDIUM | Dev | ⬜ |
| 10 | Hash or omit `userId` from Logger meta objects that flow into Sentry `extra` context | MEDIUM | Dev | ⬜ |
| 11 | Sign PostHog DPA (posthog.com → settings → DPA) | MEDIUM | Founder | ⬜ |
| 12 | Sign Supabase DPA (supabase.com/dpa) | MEDIUM | Founder | ⬜ |
| 13 | Publish Terms of Service at a live public URL; link in Profile → App Info | MEDIUM | Founder + Legal | ⬜ |
| 14 | Add Right to Withdraw Consent toggle for analytics in Profile settings | MEDIUM | Dev | ⬜ |
| 15 | Add DPDP children's data clause to Privacy Policy (under-18 parental consent) | MEDIUM | Legal | ⬜ |
| 16 | Consider 24–48h soft-delete grace window before permanent account deletion (optional but good practice) | LOW | Dev | ⬜ |
| 17 | Assess whether PostHog `identify()` should use a hashed UUID rather than raw Supabase UUID | LOW | Dev | ⬜ |

---

## DPDP Integration Test Results

**Run:** `npm run test:integration -- --testPathPattern="dpdp"` from `/home/user/foofoo/foofoo-tests`

**Result: FAILED TO RUN** — all 5 integration test suites (including `dpdp-compliance.test.ts`) failed at the module load stage with:

```
● Test suite failed to run
    Missing env var: SUPABASE_URL
    at Object.<anonymous> (lib/supabase.ts:8:9)
```

**Cause:** The test runner does not have access to a `.env` file or environment variables for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. This is expected in a CI/audit environment without live credentials.

**Finding:** The tests themselves are well-structured and cover the right scenarios:
- `user_consent` has `data_consent_at` and `data_consent_version` (would pass with live DB given Step 7 path)
- Account deletion pipeline (user_diet_rules deleted, never_list deleted, suggestion_logs anonymised, audit_log retained)
- Data export capability (assembles all personal tables to JSON)
- Consent version update path

**Blockers that would cause test failures even with live credentials:**
1. `user_consent has data_consent_at and data_consent_version` — would FAIL for users who signed up via the sign-up screen path (where local `recordConsent()` omits `data_consent_version`)
2. `can fetch complete user data for export` — test passes technically (it reads tables directly), but the gap is that no production UI/function exposes this to the user
3. The `suggestion_logs` anonymisation test is a soft check that cannot verify a specific user's rows were anonymised (only that null user_id rows exist globally)

**Action:** Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in the test environment (`.env` or CI secrets) and re-run before Play Store submission. These tests must all pass.

---

## apverse-labs-re (Meal_Planning_RE_Engine) Scope

**Coverage:** This DPDP compliance audit covers consent flow, data subject rights, and data minimisation for the main FooFoo app's `profiles`/`user_diet_rules`/`user_consent` tables. It does not assess the RE module's own user-data tables (`re_user_household_profiles`, `re_user_weekly_plans`, `re_user_addon_plans`, `re_user_feedback`, `re_user_dish_affinity`, `re_user_class_affinity` — per `SYSTEM_STATE.md` Schema Registry SCHEMA-RE-001 through SCHEMA-RE-016) which are personal/behavioral data subject to the same DPDP obligations (access, correction, erasure, consent).

**Not yet covered for RE:**
- Whether the planned `export-user-data` Edge Function (PENDING.md H2, currently ⬜ not built) would need to also query the `re_*` tables once RE goes to production — not assessed here.
- Whether RE's `re_user_feedback` raw event log (swipes, locks, never-list actions) needs the same anonymisation-on-deletion treatment as `suggestion_logs` gets in the main app's `delete-account` Edge Function — not assessed; `re_user_feedback` likely needs an equivalent CASCADE/anonymise path before RE reaches production users.
- Consent granularity (H1 in PENDING.md) doesn't currently account for RE-specific processing (e.g. cohort/persona assignment, feedback-based learning) as a distinct disclosed purpose.

**Cross-reference:** No DPDP/compliance-specific file exists yet in `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/`. Closest related artifacts: `02_DB_AUDIT/SUPABASE_SCHEMA_SNAPSHOT.md` (lists the `re_*` user-data tables and their RLS state, but doesn't assess DPDP rights coverage) and `02_DB_AUDIT/DB_GAP_REGISTER.md` (0 blockers — schema-level, not compliance-level). Per root `CLAUDE.md`/`Meal_Planning_RE_Engine/CLAUDE.md` guardrails, this gap requires a founder/product decision on RE data-rights scope before code is written — not resolved in this session.
