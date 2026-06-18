# FooFoo — Pending Items
> Last updated: 2026-05-25 (Sprint 7)  
> Sources: RLS security audit · DPDP/compliance audit · dependency audit  
> This file is the single source of truth for outstanding manual, legal, and dev tasks.  
> **Update status here whenever an item is completed.**

---

## Legend
- 🔴 CRITICAL — Play Store will reject / production security risk
- 🟠 HIGH — Legal requirement or significant security gap
- 🟡 MEDIUM — Good practice, should ship before scale
- 🟢 LOW — Deferred, post-launch or Sprint 8+
- **Dev** — code change required
- **Founder** — business / legal decision
- **Manual** — dashboard / config action (no code)

---

## 🔴 CRITICAL — Do Before Play Store Submission

| # | Item | Owner | Source | Done? |
|---|------|-------|--------|-------|
| C1 | Publish a Privacy Policy at a live public URL | Founder + Legal | DPDP audit | ⬜ |
| C2 | Add `android.privacyPolicyUrl` (and `ios.privacyPolicyUrl`) to `app.json` pointing to the live policy URL | Dev | DPDP audit | ⬜ |
| C3 | Replace the silent background `recordConsent()` call in `sign-up.tsx` with a **visible checkbox** ("I agree to the [Privacy Policy] and [Terms of Service]") that must be checked before the Create Account button is enabled. Under DPDP 2023, consent must be free, specific, informed, and unambiguous — a background write does not satisfy this. | Dev | DPDP audit §1.2 | ⬜ |

---

## 🟠 HIGH — Legal Requirements / Security

### DPDP / Privacy

| # | Item | Owner | Source | Done? |
|---|------|-------|--------|-------|
| H1 | Add **granular consent columns** to `user_consent` table: `analytics_consent_at TIMESTAMPTZ`, `analytics_consent_version TEXT`, `marketing_consent_at TIMESTAMPTZ`. Present separate opt-in toggles for PostHog analytics and OneSignal notifications at onboarding Step 7 (or sign-up). Required processing disclosure (plan generation) does not need opt-in — just disclosure. | Dev | DPDP audit §1.3 | ⬜ |
| H2 | Build `export-user-data` Edge Function that returns all personal data as JSON (profiles, user_diet_rules, user_category_preferences, user_consent, never_list, suggestion_logs). Add **"Download my data"** button in Profile → Account section. DPDP Section 11 grants the right to access personal data. | Dev | DPDP audit §2 | ⬜ |
| H3 | Fix `recordConsent()` in `sign-up.tsx` — it omits `data_consent_version`. Either remove the duplicate local version and call only the shared function from `meal-prefs.repository.ts`, or add `data_consent_version: 'v1.0'` to the local call. | Dev | DPDP audit §1.4 | ⬜ |
| H4 | Add **Grievance Officer** name and contact email to the Privacy Policy and in-app (Profile → App Info). Under DPDP, a Grievance Officer must be named with a 30-day response commitment. Currently only `support@foofoo.app` appears in one error dialog. | Founder + Legal | DPDP audit §2 | ⬜ |
| H5 | Add **Right to Withdraw Consent** toggle for analytics (PostHog) in Profile settings. OneSignal push is already toggleable. Users must be able to withdraw optional consent independently of account deletion. | Dev | DPDP audit §2 | ⬜ |
| H6 | Fix `sign-up.tsx` consent recording — consent is recorded once at sign-up AND again at Step 7. Consolidate to one recording point (Step 7 is correct — it is after explicit user action). Remove the consent write from `sign-up.tsx`. | Dev | DPDP audit §1.5 | ⬜ |

### Security (Infrastructure / Config)

| # | Item | Owner | Source | Done? |
|---|------|-------|--------|-------|
| H7 | **Enable leaked password protection** in Supabase Dashboard → Auth → Sign In → Password protection. Cannot be set via SQL migration. | Manual | RLS audit | ⬜ |
| H8 | Add `RESEND_API_KEY` to Supabase Edge Function Secrets (not Vault). Daily analytics email is running but not sending — it will send once this key is present. | Manual | Sprint 6 carry-over | ⬜ |
| H9 | Confirm `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are in Supabase Edge Function Secrets. Morning notification function reads them; no devices have `onesignal_player_id` set yet so the path is untested end-to-end. | Manual | Sprint 6 carry-over | ⬜ |

---

## 🟡 MEDIUM — Good Practice (Pre-Launch or Early Post-Launch)

### Legal / Privacy

| # | Item | Owner | Source | Done? |
|---|------|-------|--------|-------|
| M1 | Sign **PostHog DPA** (posthog.com → Settings → DPA tab). Applicable under DPDP as a data processing agreement. | Founder | DPDP audit §4 | ⬜ |
| M2 | Sign **Supabase DPA** (supabase.com/dpa). Supabase is the primary data processor. | Founder | DPDP audit §4 | ⬜ |
| M3 | Publish Terms of Service at a live public URL. Profile → App Info currently shows a "coming soon" toast for the ToS link. Section outlines are in `foofoo-tests/reports/md/compliance-audit.md`. | Founder + Legal | DPDP audit | ⬜ |
| M4 | Add DPDP **children's data clause** to Privacy Policy — DPDP requires verifiable parental consent for users under 18. | Legal | DPDP audit | ⬜ |

### Dev — Data Minimisation

| # | Item | Owner | Source | Done? |
|---|------|-------|--------|-------|
| M5 | Remove `household_type` column from `profiles` table (or add an onboarding step that collects and uses it). It exists in the schema and `types/index.ts` but is never collected in onboarding and never used by the RE or any screen. | Dev | DPDP audit §3 | ⬜ |
| M6 | Remove `allowed_meats` column from `user_diet_rules` until the RE actually uses it. Column was added in migration but no UI collects it and no Edge Function reads it. Data minimisation principle. | Dev | DPDP audit §3 | ⬜ |
| M7 | Hash or omit `userId` from Logger meta objects that flow into Sentry `extra` context. Example: `logger.error('PROFILES', 'fetchProfile failed', { userId })` — the `userId` passes through to Sentry. Use a hashed variant or omit it. | Dev | DPDP audit §4 | ⬜ |
| M8 | Assess whether PostHog `identify()` should use a **hashed UUID** rather than the raw Supabase UUID. Currently `posthog.identify(userId, { food_pref, home_state, ... })` sends the raw UUID as the distinct ID. | Dev | DPDP audit §4 | ⬜ |

### Config / Infrastructure

| # | Item | Owner | Source | Done? |
|---|------|-------|--------|-------|
| M9 | Add `SUPABASE_PROJECT_REF = ufgfznpqixplcbhmsqqw` to **GitHub Repo Secrets** (Settings → Secrets → Actions). Required for the `deploy-edge-functions.yml` workflow to run. | Manual | Workflow audit | ⬜ |
| M10 | Add `RESEND_FROM` (sender address, e.g. `analytics@foofoo.app`) and `FOUNDER_EMAILS` (comma-separated founder emails for daily analytics) to Supabase Edge Function Secrets (not Vault). | Manual | Sprint 6 carry-over | ⬜ |
| M11 | Add `LOG_SAMPLE_RATE` to Supabase Edge Function Secrets if structured log sampling is desired in production. | Manual | Hygiene audit | ⬜ |

---

## 🟢 LOW — Deferred (Sprint 8 / Post-Launch)

| # | Item | Owner | Source | Done? |
|---|------|-------|--------|-------|
| L1 | Move `pg_trgm` extension out of the `public` schema into a dedicated `extensions` schema. Requires updating all GIN index definitions that depend on it. Schedule for Sprint 8 — safe in current form. | Dev | RLS audit | ⬜ |
| L2 | Consider a **24–48h soft-delete grace window** before permanent account deletion. Currently deletion is immediate on confirm. Assess whether "reasonable time" under DPDP is satisfied by immediate deletion (likely yes, but a grace window improves UX for accidental deletes). | Dev | DPDP audit §2 | ⬜ |
| L3 | **Delete stale GitHub branches** via GitHub UI: `claude/clever-cannon-RzIIH` (already merged). The `claude/optimistic-volta-Xgn39` branch was deleted on merge of PR #25. | Manual | Branch audit | ⬜ |
| L4 | uuid package CVE (GHSA-w5hq-g745-h8pq) — present in Expo build tooling, NOT in the APK bundle. Will be resolved when Expo SDK 57 ships. Monitor Expo SDK release notes. | Dev | Dependency audit | ⬜ |
| L5 | Name/username edit in Profile → Account section is not available post-onboarding. Users can only view, not change. Add edit flow for name and username. | Dev | DPDP audit §2 (Right to Correction) | ⬜ |

---

## 🔴 RE Data Gaps — Dish Database (Persona Validation · 2026-05-27)

> Source: `foofoo/reports/persona-validation-findings-2026-05-27.pdf`  
> The RE code is **working correctly** (auth + schema-cache bugs fixed). All 50 test-persona failures are **data gaps** in the dish database — no code changes required.

### Summary

| # | Issue | Table | Personas | Severity | Done? |
|---|-------|-------|----------|----------|-------|
| R1 | `meal_types` column is NULL / unpopulated on all dishes — slot filter (breakfast/lunch/dinner) eliminates every dish | `dishes` | P001–P043 (43) | 🔴 HIGH | ⬜ |
| R2 | No dishes tagged `diet_type = 'vegan'` — vegan personas get HTTP 422 "no eligible dishes" | `dishes` | P044–P050 (7) | 🔴 HIGH | ⬜ |
| R3 | ~25 cuisine codes referenced in persona definitions are absent from `cuisines_master` — cuisine boost silently skipped for these personas | `cuisines_master` | 20+ personas | 🟡 MEDIUM | ⬜ |

### Fix Actions

| # | Action | How | Impact |
|---|--------|-----|--------|
| R1 | Populate `meal_types` on all 818+ dishes | `UPDATE dishes SET meal_types = ARRAY['lunch','dinner'] WHERE ...` (group by dish type) | Unblocks 43 personas |
| R2 | Tag vegan-compatible veg dishes | `UPDATE dishes SET diet_type = 'vegan' WHERE ...` or run `derive-dish-attributes` Edge Fn | Unblocks 7 personas |
| R3 | Add missing cuisine codes then re-tag dishes | `INSERT INTO cuisines_master ...` for jain variants, vegan variants, regional South Indian, Bengali, Rajasthani, North East, Coastal/Goan, Central India codes | Improves RE personalisation quality |
| R4 | Re-run Persona Validation workflow | GitHub Actions → Persona Validation | Confirms all fixes green |

### Missing Cuisine Codes (R3 detail)

| Category | Missing codes |
|----------|---------------|
| Jain variants | `jain`, `rajasthani_jain`, `north_indian_jain`, `maharashtrian_jain`, `street_food_jain`, `gujarati_jain` |
| Vegan variants | `north_indian_vegan`, `continental_vegan`, `indo_chinese_vegan`, `street_food_vegan`, `bengali_vegan`, `tamil_vegan`, `kerala_vegan`, `maharashtrian_vegan` |
| Regional South Indian | `tamil_brahmin`, `telugu`, `kerala_vegan`, `south_indian_jain` |
| Regional Bengali | `bengali_veg`, `bengali_vegan` |
| Rajasthani / Marwari | `marwari`, `rajasthani_jain` |
| North East India | `north_east` |
| Coastal / Goan | `seafood`, `coastal`, `konkan`, `goan_vegetarian` |
| Central India | `madhya_pradeshi` |
| Mughlai / Awadhi | `mughlai_veg_egg`, `awadhi_veg` |
| Fusion / Other | `persian_influenced`, `all_others` |

---

### Cross-reference — Meal_Planning_RE_Engine Deep Recovery Audit

The R1–R4 data gaps above were found via persona validation testing against the **app-side legacy RE** (the `dishes`/`cuisines_master` tables and `generate-daily-plan` Edge Function scoring — see `foofoo-tests/reports/md/sync-audit.md`). They are **not** the same system as the standalone `Meal_Planning_RE_Engine/` module, which has its own independent data-gap tracking:

- `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/05_REPAIR_PLAN/MASTER_REPAIR_PLAN.md` + `BUILD_01_REPAIR_PLAN.md`–`BUILD_10_REPAIR_PLAN.md` — the RE module's own repair plan, written but gated behind founder approval at Gate G6 (per `00_CONTROL/02_AUDIT_STATUS_TRACKER.md`, status: "⛔ HALT: founder approval to start repairs").
- `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/06_REPAIR_LOGS/BUILD_02_REPAIR_LOG.md` and `BUILD_04_REPAIR_LOG.md` — repair work already executed/logged for those two builds (slightly ahead of the tracker's "halted, nothing started" framing — worth reconciling).
- `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/02_DB_AUDIT/DB_GAP_REGISTER.md` — RE module's DB-level gap register (0 blockers, separate from the R1–R4 dish-data gaps above).

If R1–R4 fixes (populating `meal_types`, vegan tagging, missing cuisine codes) are ever needed for the RE module's own dish-expansion logic (`class_dish_options` join), check whether the RE module's seed data (`Meal_Planning_RE_Engine/00_Implementation/seeds/`) has the equivalent gap before assuming R1–R4's fix actions transfer directly — the two systems use different table names and data sources (RE module derives from the canonical `Indian_Meal_Cohort_Persona_DB_v3.xlsx` workbook, not from manual `dishes` table tagging).

---

## Reminder Schedule

When starting a new sprint or session, check this file. Items to prioritise:

1. **Next session / Sprint 7 close:** C1, C2, C3 (Play Store blockers), H7, H8 (infra)
2. **Before first public user:** H1, H2, H3, H4, H5, H6 (DPDP legal)
3. **Before scale (1K+ users):** M1–M11 (DPAs, data minimisation, config)
4. **Sprint 8:** L1–L5 (deferred hygiene)

---

_Update this file at the end of every sprint. Mark items ✅ when complete._
