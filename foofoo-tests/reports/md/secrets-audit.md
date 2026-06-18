# FooFoo — Secrets & Environment Variable Audit
**Generated:** 2026-05-25  
**Scope:** `foofoo/` app source · `foofoo-tests/` · `.github/workflows/` · `supabase/functions/` · `app.json` · `devcontainer.json`  
**Method:** Read-only scan. No values printed. Key names only.

---

## Summary

| Category | Count |
|---|---|
| Conflicts (same key, ambiguous or multiple values) | 5 |
| Hardcoded values (must move — most urgent) | 5 |
| Missing (referenced but not documented in any .env.example) | 7 |
| Overscoped (secret used in a broader context than needed) | 2 |
| Test leaks (test project using prod keys) | 0 |
| **Total problems** | **19** |

---

## Task 1 — Inventory

| Key name | Defined in | Also defined in | Used in | Type |
|---|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env.local` (gitignored, not committed) | `VERCEL_ENV_SETUP.md` (docs only) | `src/config/constants.ts`, `src/services/supabase.ts` | SUPABASE_SECRET |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` (gitignored, not committed) | — | `src/config/constants.ts`, `src/services/supabase.ts` | SUPABASE_SECRET |
| `EXPO_PUBLIC_ONESIGNAL_APP_ID` | `.env.local` (gitignored, not committed) | `app.json:61` **HARDCODED** as `extra.oneSignalAppId` | `src/config/constants.ts → API.ONESIGNAL_APP_ID` | DUPLICATE |
| `EXPO_PUBLIC_POSTHOG_KEY` | `.env.local` (gitignored, not committed) | — | `src/config/constants.ts → API.POSTHOG_KEY` | API_KEY |
| `EXPO_PUBLIC_POSTHOG_HOST` | `.env.local` (gitignored, not committed) | `VERCEL_ENV_SETUP.md` (docs only) | `src/config/constants.ts → API.POSTHOG_HOST` | APP_CONFIG |
| `EXPO_PUBLIC_SENTRY_DSN` | `.env.local` (gitignored, not committed) | — | `app/_layout.tsx:19` | API_KEY |
| `EXPO_PUBLIC_SENTRY_DEV_ENABLED` | `.env.local` (gitignored, not committed) | — | `app/_layout.tsx:27` | APP_CONFIG |
| `SUPABASE_URL` | GitHub Secrets | `devcontainer.json` (forwarded from Codespace), `.env.test.example` (placeholder) | `foofoo-tests.yml`, `persona-validation.yml`, `sync-cloudinary-direct.yml`; Edge Functions (Deno auto-inject) | SUPABASE_SECRET |
| `SUPABASE_ANON_KEY` | GitHub Secrets | `.env.test.example` (placeholder) | `foofoo-tests.yml`, `persona-validation.yml`; Edge Functions (Deno auto-inject) | SUPABASE_SECRET |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets | `devcontainer.json` (forwarded) | `foofoo-tests.yml`, `persona-validation.yml`, `sync-cloudinary-direct.yml`, `sync-cloudinary.yml`; Edge Functions (Deno auto-inject) | SUPABASE_SECRET |
| `SUPABASE_ACCESS_TOKEN` | GitHub Secrets | `devcontainer.json` (**mislabelled** as "anon key") | `deploy-edge-functions.yml`, `sync-cloudinary.yml` (Supabase CLI personal auth token) | SUPABASE_SECRET |
| `SUPABASE_PROJECT_ID` | GitHub Secrets (sync-cloudinary.yml only) | Not documented anywhere else | `sync-cloudinary.yml:28,41` (project ref for link + URL) | SUPABASE_SECRET |
| `PROJECT_REF` (`ufgfznpqixplcbhmsqqw`) | **HARDCODED** in `deploy-edge-functions.yml:39` | `.env.test.example:9` (as URL), `CONTEXT.md:24`, `.devcontainer/devcontainer.json` (doc URLs) | `deploy-edge-functions.yml`, deployment steps | SUPABASE_SECRET |
| `SUPABASE_FUNCTIONS_URL` (`ufgfznpqixplcbhmsqqw`) | **HARDCODED** in migration SQL | — | `supabase/migrations/20260522065137_sprint5_schedule_5am_cron.sql:18` (pg_cron CRON job URL) | SUPABASE_SECRET |
| `OPENWEATHERMAP_KEY` | Supabase Vault | — | `generate-daily-plan/helpers.ts:59`, `generate-daily-plans-batch/helpers.ts:59`, `regenerate-slot/helpers.ts:59` | API_KEY |
| `ONESIGNAL_APP_ID` | Supabase Vault | `app.json:61` **HARDCODED** (different key name: `extra.oneSignalAppId`) | `send-morning-notification/index.ts:73` | DUPLICATE |
| `ONESIGNAL_REST_API_KEY` | Supabase Vault | — | `send-morning-notification/index.ts:74` | API_KEY |
| `RESEND_API_KEY` | Supabase Vault | — | `daily-analytics-email/index.ts:250` | API_KEY |
| `RESEND_FROM` | Supabase Vault | `daily-analytics-email/index.ts:253` (hardcoded default `'FooFoo Intelligence <onboarding@resend.dev>'`) | `daily-analytics-email/index.ts:253` | APP_CONFIG |
| `FOUNDER_EMAILS` | Supabase Vault | `daily-analytics-email/index.ts:251` **HARDCODED** fallback PII: `ankit3.mittal@[redacted]` | `daily-analytics-email/index.ts:251` | APP_CONFIG |
| `LOG_SAMPLE_RATE` | Supabase Vault | — | `log-re-decision/index.ts:35` | APP_CONFIG |
| `CLOUDINARY_API_KEY` | Supabase Vault | GitHub Secrets (`sync-cloudinary-direct.yml:22`) | `sync-cloudinary-images/index.ts:63`, `sync-cloudinary-direct.yml:22` | DUPLICATE |
| `CLOUDINARY_API_SECRET` | Supabase Vault | GitHub Secrets (`sync-cloudinary-direct.yml:23`) | `sync-cloudinary-images/index.ts:64`, `sync-cloudinary-direct.yml:23` | DUPLICATE |
| `CLOUDINARY_CLOUD_NAME` (`dzlqsobol`) | **HARDCODED** in `src/utils/cloudinary.ts:19` | **HARDCODED** in `sync-cloudinary-images/index.ts:32`; env var in `sync-cloudinary-direct.yml:26` | URL building, sync function | APP_CONFIG |
| `oneSignalAppId` (`83860a1b-…`) | **HARDCODED** in `app.json:61` (`extra.oneSignalAppId`) | — | `onesignal-expo-plugin` at build time | DUPLICATE |
| `eas.projectId` (`407c854c-…`) | **HARDCODED** in `app.json:81` | — | EAS build routing | APP_CONFIG |
| `FOUNDER_EMAIL` (PII) | **HARDCODED** in `daily-analytics-email/index.ts:251` | — | `daily-analytics-email` fallback when `FOUNDER_EMAILS` not in Vault | APP_CONFIG |

---

## Task 2 — Problems

### 🔴 HARDCODED (most urgent — move immediately)

**HC-01 — Supabase project ref hardcoded in workflow**  
`deploy-edge-functions.yml:39` — `PROJECT_REF: ufgfznpqixplcbhmsqqw`  
Hardcoded directly in the workflow env block. If the project migrates or a staging project is created, this silently deploys to the wrong environment.  
**Fix:** Replace with `PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}`. Add `SUPABASE_PROJECT_REF` to GitHub repo secrets (same value as `SUPABASE_PROJECT_ID` already used by `sync-cloudinary.yml`).

**HC-02 — Supabase project URL hardcoded in migration SQL** ⚠️ CRITICAL  
`supabase/migrations/20260522065137_sprint5_schedule_5am_cron.sql:18`  
```sql
v_url := 'https://ufgfznpqixplcbhmsqqw.supabase.co/functions/v1/generate-daily-plans-batch';
```
This is inside a versioned SQL migration that runs against the database. The CRON job is permanently configured to call the hardcoded project URL. If the project ref ever changes, the CRON silently stops working. pg_cron jobs cannot read env vars — the URL must be set at scheduling time, ideally via a separate SQL script or a parameterised migration that reads from `vault.secrets`.  
**Fix:** Add a comment block above the migration warning it contains a hardcoded URL, and document the URL in `supabase/.env.example` with a note that the CRON migration must be re-run against the correct project.

**HC-03 — OneSignal App ID hardcoded in app.json**  
`app.json:61` — `"oneSignalAppId": "83860a1b-1cb9-4982-8a61-d8acc2c4680a"`  
The `onesignal-expo-plugin` reads from `extra.oneSignalAppId` at build time. This means the App ID is committed to the repo. The OneSignal App ID is technically public (it's embedded in the client bundle anyway), but having it in two places (`app.json` and `EXPO_PUBLIC_ONESIGNAL_APP_ID`) creates a drift risk where the values can desynchronise.  
**Fix:** Keep it in `app.json` (required by plugin) but also document in `.env.example` as `EXPO_PUBLIC_ONESIGNAL_APP_ID` with a note that it must match `app.json extra.oneSignalAppId`.

**HC-04 — Cloudinary cloud name hardcoded in two source files**  
`src/utils/cloudinary.ts:19` — `export const CLOUDINARY_CLOUD_NAME = 'dzlqsobol'`  
`supabase/functions/sync-cloudinary-images/index.ts:32` — `const CLOUDINARY_CLOUD_NAME = 'dzlqsobol'`  
The code comment says "public — no env var needed" which is correct (cloud name appears in every CDN URL). However, it's defined twice in different places with no shared constant. `sync-cloudinary-direct.yml` correctly uses `CLOUDINARY_CLOUD_NAME: dzlqsobol` as an env var.  
**Fix:** Low priority. No security risk. Document as APP_CONFIG, consolidate the two inline definitions by having the Edge Function import from the same constant or reading from `Deno.env.get('CLOUDINARY_CLOUD_NAME')` (already set in the direct workflow).

**HC-05 — PII (founder email) hardcoded in Edge Function source**  
`supabase/functions/daily-analytics-email/index.ts:251`  
A personal email address is embedded as the default fallback when `FOUNDER_EMAILS` is not set in Vault. This means the email address is in the git history permanently and visible to anyone with repo access.  
**Fix:** Remove the hardcoded fallback. If `FOUNDER_EMAILS` is not set, log a warning and skip sending (same behaviour already exists for `RESEND_API_KEY`). Store the email in Supabase Vault under `FOUNDER_EMAILS`.

---

### 🟠 CONFLICT (ambiguous — clarify which value wins)

**CF-01 — `SUPABASE_ACCESS_TOKEN` mislabelled in devcontainer.json**  
`devcontainer.json:8-10` — description says "Supabase anon/public key" but the key name `SUPABASE_ACCESS_TOKEN` is a Supabase personal access token (used to authenticate the CLI), not an anon key. The anon key is `SUPABASE_ANON_KEY`.  
Any developer setting up Codespaces will put their anon key into `SUPABASE_ACCESS_TOKEN` and then wonder why `supabase login` fails.  
**Fix:** Rename to `SUPABASE_ANON_KEY` in devcontainer.json, and add a separate entry for `SUPABASE_ACCESS_TOKEN` (the CLI token).

**CF-02 — OneSignal App ID in two forms simultaneously**  
`app.json:61` has `extra.oneSignalAppId = "83860a1b-…"` (build-time, read by plugin).  
`src/config/constants.ts` reads `API.ONESIGNAL_APP_ID` from `process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID` (runtime).  
If the two values ever differ (e.g., dev vs prod OneSignal apps), the plugin and the runtime will use different App IDs silently.  
**Fix:** Document both in `.env.example` with a note that they must match. Long-term: consider using `app.config.js` instead of `app.json` to read the App ID from `process.env`.

**CF-03 — `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` defined in two stores**  
These live in both Supabase Vault (for the `sync-cloudinary-images` Edge Function) and GitHub Secrets (for `sync-cloudinary-direct.yml`). There is no guarantee the two stores have the same value. If the key is rotated in one place and not the other, one workflow silently fails.  
**Fix:** Document that these must be kept in sync. Consider using only one path: GitHub Actions → invoke the Edge Function (which reads from Vault), or GitHub Actions → direct API (which reads from GitHub Secrets). Currently both workflows exist for different reasons (Vault path for runtime, GitHub path for CI one-shot).

**CF-04 — `SUPABASE_URL` used for both test runs and production data operations**  
`foofoo-tests.yml` uses `secrets.SUPABASE_URL` for integration tests.  
`sync-cloudinary-direct.yml` uses `secrets.SUPABASE_URL` for writing production data to the dishes table.  
These are the same GitHub repo secret. Currently both point to the same dev project, so no issue. But if production is separated into its own project, there is no safe way to run tests against dev while running sync against prod — both would read the same `SUPABASE_URL` secret.  
**Fix:** Pre-empt by renaming to `SUPABASE_DEV_URL` (test/CI workflows) and `SUPABASE_PROD_URL` (data operations). Or document clearly that the `SUPABASE_URL` secret always points to dev and production sync must be triggered separately with an explicit project ref.

**CF-05 — `PROJECT_REF` / `SUPABASE_PROJECT_ID` naming inconsistency**  
`sync-cloudinary.yml` reads `secrets.SUPABASE_PROJECT_ID`.  
`deploy-edge-functions.yml` hardcodes `PROJECT_REF: ufgfznpqixplcbhmsqqw` instead of using a secret.  
Two workflows use different patterns to reference the same project. There is no `SUPABASE_PROJECT_REF` secret documented anywhere.  
**Fix:** Standardise on `SUPABASE_PROJECT_REF` as the secret name. Update `deploy-edge-functions.yml` to use it. Add `SUPABASE_PROJECT_REF` to secrets alongside `SUPABASE_PROJECT_ID` (or rename `SUPABASE_PROJECT_ID` to `SUPABASE_PROJECT_REF` for consistency).

---

### 🟡 MISSING (referenced but not in any .env.example)

**MS-01 — No `foofoo/.env.example` file exists**  
The app has 7 `EXPO_PUBLIC_` env vars that must be set for the app to function. None are documented in any example file. The only guidance is in `VERCEL_ENV_SETUP.md` (partial — covers only 5 of the 7).

**MS-02 — `EXPO_PUBLIC_ONESIGNAL_APP_ID`** — not in any .env.example  
**MS-03 — `EXPO_PUBLIC_POSTHOG_KEY`** — not in any .env.example  
**MS-04 — `EXPO_PUBLIC_POSTHOG_HOST`** — partially documented in VERCEL_ENV_SETUP.md but no .env.example  
**MS-05 — `EXPO_PUBLIC_SENTRY_DSN`** — not in any .env.example  
**MS-06 — `EXPO_PUBLIC_SENTRY_DEV_ENABLED`** — not in any .env.example  
**MS-07 — `SUPABASE_PROJECT_REF`** — used in `sync-cloudinary.yml` as `SUPABASE_PROJECT_ID`, hardcoded in `deploy-edge-functions.yml`, never documented in any setup file

---

### 🟡 OVERSCOPED

**OS-01 — `SUPABASE_SERVICE_ROLE_KEY` shared across test CI and production data ops**  
The same GitHub secret is used in `foofoo-tests.yml` (integration tests, needs service role for setup/teardown) and `sync-cloudinary-direct.yml` (writes production data). Service role keys bypass all RLS — sharing a single secret across dev tests and prod writes is a single point of failure.

**OS-02 — `deploy-edge-functions.yml` deploys to prod but is labelled "dev"**  
The job is named "Deploy to Supabase (dev)" but the hardcoded `PROJECT_REF` is the live production project (`ufgfznpqixplcbhmsqqw`). There is no staging deployment path. A developer reading the workflow name may assume it's a safe dev deployment when it's actually writing to production.

---

## Task 3 — Canonical Secret Map

### GITHUB REPO SECRETS (CI/CD only — never in files)

```
SUPABASE_ACCESS_TOKEN      # Personal access token for Supabase CLI (supabase login)
SUPABASE_PROJECT_REF       # Project ref: ufgfznpqixplcbhmsqqw (replaces SUPABASE_PROJECT_ID + hardcoded value)
SUPABASE_URL               # Dev project URL — for test CI only (foofoo-tests, persona-validation)
SUPABASE_ANON_KEY          # Dev anon key — for test CI only
SUPABASE_SERVICE_ROLE_KEY  # Dev service role key — for test CI teardown only
CLOUDINARY_API_KEY         # Cloudinary key — for sync-cloudinary-direct.yml only
CLOUDINARY_API_SECRET      # Cloudinary secret — for sync-cloudinary-direct.yml only
```

### SUPABASE VAULT (Edge Function runtime secrets — set via Supabase Dashboard → Edge Functions → Secrets)

```
OPENWEATHERMAP_KEY         # OpenWeatherMap API key (weather_cache fetcher)
ONESIGNAL_APP_ID           # OneSignal App ID (matches app.json extra.oneSignalAppId)
ONESIGNAL_REST_API_KEY     # OneSignal REST key (send-morning-notification)
CLOUDINARY_API_KEY         # Same value as GitHub secret — Vault copy for Edge Function use
CLOUDINARY_API_SECRET      # Same value as GitHub secret — Vault copy for Edge Function use
RESEND_API_KEY             # Resend email API key (daily-analytics-email)
RESEND_FROM                # From-address for analytics email
FOUNDER_EMAILS             # Comma-separated founder email(s) — remove hardcoded fallback
LOG_SAMPLE_RATE            # Fraction of RE decisions to log (default: 1.0)
```

### LOCAL `foofoo/.env.local` (dev only — gitignored, never committed)

```
EXPO_PUBLIC_SUPABASE_URL=https://ufgfznpqixplcbhmsqqw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
EXPO_PUBLIC_ONESIGNAL_APP_ID=83860a1b-1cb9-4982-8a61-d8acc2c4680a
EXPO_PUBLIC_POSTHOG_KEY=<PostHog project key>
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_SENTRY_DSN=<Sentry project DSN>
EXPO_PUBLIC_SENTRY_DEV_ENABLED=false
```

### LOCAL `foofoo-tests/.env.test` (dev only — gitignored, never committed)

```
SUPABASE_URL=https://ufgfznpqixplcbhmsqqw.supabase.co
SUPABASE_ANON_KEY=<anon key — same as EXPO_PUBLIC_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<service role key — DEV PROJECT ONLY, never prod>
SUPABASE_FUNCTIONS_URL=https://ufgfznpqixplcbhmsqqw.supabase.co/functions/v1
TEST_EMAIL_DOMAIN=foofoo.dev
PLAN_GEN_TIMEOUT_MS=5000
```

### CODESPACE SECRETS (GitHub Codespaces — mirror of .env.local)

```
SUPABASE_URL               # Dev project URL
SUPABASE_ANON_KEY          # Dev anon key (rename from SUPABASE_ACCESS_TOKEN in devcontainer.json)
SUPABASE_SERVICE_ROLE_KEY  # Dev service role key
SUPABASE_ACCESS_TOKEN      # Supabase CLI personal token (add as separate entry)
```

---

### Migration Instructions

| Action | Key | From | To |
|---|---|---|---|
| MOVE | `PROJECT_REF` hardcode | `deploy-edge-functions.yml:39` | GitHub Secret `SUPABASE_PROJECT_REF` |
| RENAME | `SUPABASE_PROJECT_ID` | GitHub Secret name | `SUPABASE_PROJECT_REF` (consistent with deploy workflow) |
| REMOVE | PII fallback email | `daily-analytics-email/index.ts:251` | Delete hardcoded fallback; require Vault `FOUNDER_EMAILS` |
| ADD | `FOUNDER_EMAILS` | — | Supabase Vault with founder email value |
| FIX | `SUPABASE_ACCESS_TOKEN` description | `devcontainer.json:10` | Change description to "Supabase CLI personal access token" |
| ADD | `SUPABASE_ANON_KEY` | `devcontainer.json` | Add as separate Codespace secret (currently absent) |
| ADD | `foofoo/.env.example` | — | Create with all 7 EXPO_PUBLIC_ vars |
| ADD | `foofoo-tests/.env.example` | — | Upgrade from `.env.test.example` (rename or supplement) |
| DOCUMENT | `CLOUDINARY_CLOUD_NAME` hardcode | `src/utils/cloudinary.ts:19`, `sync-cloudinary-images/index.ts:32` | Add comment: APP_CONFIG, public value, not a secret |
| NOTE | CRON migration hardcode | `migrations/20260522065137_sprint5_schedule_5am_cron.sql:18` | Add comment warning: URL is hardcoded, must be re-run if project ref changes |

---

## Task 4 — .env.example Files

### `foofoo/.env.example`

_(See file written to `foofoo/.env.example`)_

### `foofoo-tests/.env.example`

_(See file written to `foofoo-tests/.env.example`)_

---

## 2026-06-17 Status Re-check

All 5 "hardcoded — must move" findings (HC-01 through HC-05) were verified against current source and are **already remediated** (work landed in an earlier session, per `hygiene-complete.md` PR #20 "Hardcoded secrets removed — 4 files"):
- **HC-01** (`PROJECT_REF` in `deploy-edge-functions.yml`): now reads `PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}` — fixed.
- **HC-02** (Supabase URL in `20260522065137_sprint5_schedule_5am_cron.sql`): the literal URL is still present in the migration body (pg_cron cannot read env vars at schedule time — this is structurally unavoidable per the original fix recommendation), but is now preceded by an explicit warning comment documenting the hardcode and the project ref it targets. Accepted as-is per the doc's own fix guidance.
- **HC-03** (OneSignal App ID in `app.json`): still present in `app.json:62` (`extra.oneSignalAppId`) — this is correct and intentional per the doc's own fix note ("Keep it in app.json — required by plugin"); not a violation.
- **HC-04** (Cloudinary cloud name): still inline in `src/utils/cloudinary.ts:21` and `sync-cloudinary-images/index.ts:34`, but the Edge Function copy now reads `Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? 'dzlqsobol'` (env-var-first with public fallback) — this is the documented public-config exception (cloud name appears in every CDN URL; doc explicitly says "No security risk... Document as APP_CONFIG"). Left untouched per this session's guardrail of not touching constants that are genuinely public client-side config.
- **HC-05** (founder PII fallback email in `daily-analytics-email/index.ts`): hardcoded fallback has been removed; the function now reads only `Deno.env.get('FOUNDER_EMAILS')` with an explanatory comment ("FOUNDER_EMAILS must be set in Supabase Vault — no hardcoded fallback") and skips sending if unset. Fixed.

`foofoo/.env.example` and `foofoo-tests/.env.example` both now exist (Task 4 deliverables, previously "_(See file written to ...)_" placeholders) — confirmed present on disk.

No new hardcoded-secret patterns were found in this session's review; no further action taken here.

---

## apverse-labs-re (Meal_Planning_RE_Engine) Scope

**Coverage:** This audit's "Files Scanned" appendix lists only `foofoo/` and `foofoo-tests/` paths — `Meal_Planning_RE_Engine/` was not in scope and has its own separate Supabase project (`foofoo-staging`, ref `kwypxyqxojauhiehuirz`) with its own secrets surface (e.g. `EXPO_PUBLIC_SUPABASE_URL` pointing at staging when `re_engine_version` routing is active — see root `SYSTEM_STATE.md` DEP-STAGING entry). None of the 19 findings above were checked against RE module files.

**Not yet covered for RE:**
- No scan has been run over `Meal_Planning_RE_Engine/00_Implementation/` source (currently mostly unbuilt scaffold — see dependency-audit.md note above) or the RE technical docs folder for hardcoded staging project refs, API keys, or service-role usage patterns.
- The staging-vs-production environment-mismatch guardrail (`foofoo/scripts/verify-env-match.js`, added 2026-06-16 per `SYSTEM_STATE.md`) is a related but distinct control — it guards against branch/env drift, not hardcoded secrets, and isn't tracked by this doc.

**Cross-reference:** No RE-specific secrets/env audit exists yet in `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/`. The closest related artifact is `02_DB_AUDIT/SUPABASE_SCHEMA_SNAPSHOT.md` (schema-level only, not a secrets scan). Recommend a future RE-scoped secrets audit be added under `99_Deep_Recovery_Audit/03_CODE_AUDIT/` if/when `00_Implementation` gains real source.

---

## Appendix: Files Scanned

| File | Scanned |
|---|---|
| `foofoo/app.json` | ✓ |
| `foofoo/eas.json` | ✓ |
| `foofoo/VERCEL_ENV_SETUP.md` | ✓ |
| `foofoo/src/config/constants.ts` | ✓ |
| `foofoo/src/services/supabase.ts` | ✓ |
| `foofoo/src/services/onesignal.service.ts` | ✓ |
| `foofoo/src/services/posthog.service.ts` | ✓ |
| `foofoo/src/utils/cloudinary.ts` | ✓ |
| `foofoo/app/_layout.tsx` | ✓ |
| `foofoo/supabase/functions/generate-daily-plan/helpers.ts` | ✓ |
| `foofoo/supabase/functions/generate-daily-plan/index.ts` | ✓ |
| `foofoo/supabase/functions/generate-daily-plans-batch/helpers.ts` | ✓ |
| `foofoo/supabase/functions/generate-daily-plans-batch/index.ts` | ✓ |
| `foofoo/supabase/functions/regenerate-slot/helpers.ts` | ✓ |
| `foofoo/supabase/functions/regenerate-slot/index.ts` | ✓ |
| `foofoo/supabase/functions/delete-account/index.ts` | ✓ |
| `foofoo/supabase/functions/delete-user-account/index.ts` | ✓ |
| `foofoo/supabase/functions/send-morning-notification/index.ts` | ✓ |
| `foofoo/supabase/functions/daily-analytics-email/index.ts` | ✓ |
| `foofoo/supabase/functions/log-re-decision/index.ts` | ✓ |
| `foofoo/supabase/functions/sync-cloudinary-images/index.ts` | ✓ |
| `foofoo/supabase/functions/compute-recipe-affinity/index.ts` | ✓ |
| `foofoo/supabase/functions/calculate-inferred-prefs/index.ts` | ✓ |
| `foofoo/supabase/functions/backfill-ingredients/index.ts` | ✓ |
| `foofoo/supabase/functions/derive-dish-attributes/index.ts` | ✓ |
| `foofoo/supabase/migrations/20260522065137_sprint5_schedule_5am_cron.sql` | ✓ |
| `.github/workflows/deploy-edge-functions.yml` | ✓ |
| `.github/workflows/foofoo-tests.yml` | ✓ |
| `.github/workflows/persona-validation.yml` | ✓ |
| `.github/workflows/sync-cloudinary-direct.yml` | ✓ |
| `.github/workflows/sync-cloudinary.yml` | ✓ |
| `.devcontainer/devcontainer.json` | ✓ |
| `foofoo-tests/.env.test.example` | ✓ |
| `foofoo-tests/CONTEXT.md` | ✓ |
