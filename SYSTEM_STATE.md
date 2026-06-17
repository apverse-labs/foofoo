# SYSTEM STATE LEDGER (v2.0)
> Last updated: 2026-06-18 (SCHEMA-RE-017 applied to foofoo-staging — adds re_persona_slot_plan / re_segment_addon_rule / re_state_class_affinity, replacing cohort-keyed Excel-shaped reads in re-plan/re-addon/re-cohort-resolver repositories; SCHEMA-RE-016 dedup restore remains pending)
> Maintained by: Lead Systems & Release Architect (Claude)
> Rules: See CLAUDE.md § Architect Rules

---

## 📌 Active Checkpoints & Branches

| CKPT ID   | Branch    | Description                                                                 | DB Schema Version |
|-----------|-----------|-----------------------------------------------------------------------------|-------------------|
| CKPT-001  | main      | Baseline — React Native/Expo web + Supabase MVP + architect rules + deploy gate | SCHEMA-BASE-001 |

> **Checkpoint Naming:** `CKPT-NNN` (sequential, zero-padded)
> **Schema Naming:** `SCHEMA-<LABEL>-NNN` (e.g. BASE, AUTH, MENU, ORDER)

---

## 🚀 Active Cloud Deployments
> ⚠️ **Supabase Free Tier Limit: 2 active projects max**

### DEP-STAGING (Project A — Supabase Staging)
- **Vercel Project:** `foofoo-staging`
- **Project Ref:** `kwypxyqxojauhiehuirz` (foofoo-staging, ap-south-1)
- **Code Base / Checkpoint:** CKPT-001 + RE BUILD-01 (apverse-labs-RE)
- **Git Release Branch:** `develop` (+ Preview Deployments for feature/* and `apverse-labs-RE`) ← PROTECTED (NEVER DELETE)
- **Target Audience:** Internal QA / Beta Cohort — RE module validation
- **Status:** Active — RE BUILD-01 through BUILD-10 complete (2026-06-14). SCHEMA-RE-001 through SCHEMA-RE-010 live on staging. **RE Validation Campaign (PACK 0–10) complete 2026-06-14:** all 10 build series validated against canonical docs + v3 workbook; NORTH STAR reached — staging DB reproduces exact v3 science (41/131/2952/20664/1050/24/7992); DOC-25 automated checks 0 violations. See `Meal_Planning_RE_Engine/00_Implementation/RE_VALIDATION_LOG.md`. **Updated 2026-06-19:** SCHEMA-RE-017 applied — normalized planner tables (`re_persona_slot_plan`, `re_segment_addon_rule`, `re_state_class_affinity`) live and active, replacing the cohort-keyed Excel-shaped reads. SCHEMA-RE-012 (plan lock) and SCHEMA-RE-013 (Jain/allergen columns + Jain data enrichment, fixing the Jain-user-sees-0-dishes blocker) applied. `re_weekly_class_plans` and `re_household_addon_plans` archived under SCHEMA-RE-018 (renamed to `_archive`, RLS preserved, data intact). Remaining: BUILD-02 onboarding UI (5 screens), Food DNA data pipeline, `re_cohorts` cleanup (still blocked on inbound FK dependency from the two archive tables and `re_user_household_profiles.cohort_id`).

### DEP-PRODUCTION (Project B — Supabase Production)
- **Vercel Project:** `foofoo`
- **Project Ref:** `ufgfznpqixplcbhmsqqw` (foofoo-mvp, ap-south-1)
- **Code Base / Checkpoint:** CKPT-001
- **Git Release Branch:** `main` ← PROTECTED (NEVER DELETE)
- **Target Audience:** Live Production Users
- **Status:** Active — verified 2026-06-16 to build from `main` HEAD after a manual "promote" action had drifted production onto the unmerged `apverse-labs-RE` branch. Fixed via empty trigger commit `b089527` to `main`.

> **Guardrails added 2026-06-16:** `foofoo/scripts/verify-env-match.js` runs as part of `vercel.json`'s `buildCommand` and fails the build if `VERCEL_GIT_COMMIT_REF=main` but `EXPO_PUBLIC_SUPABASE_URL` isn't the prod ref (or vice versa for any other branch). `src/components/shared/EnvBadge.tsx` renders a visible "STAGING" tag in the UI whenever the Supabase URL isn't the prod ref.

---

## 🔀 Git Merge & Clean-up Constraints

### PROTECTED BRANCHES (Never Delete / Never Merge without Explicit Approval)
- `main` — tied to **DEP-PRODUCTION**
- `develop` — tied to **DEP-STAGING**
- `deploy-*` — any future release branch matching this prefix

### FEASIBLE MERGES CURRENTLY
- Feature branches → `develop` (for staging validation), then `develop` → `main` (for production release), with explicit approval at each step.

### BLOCKED MERGES
- *(none at this time)*

---

## 🗄️ DB Schema Registry

| Schema ID        | Migration File                              | Up Applied | Down Available | Notes                                                                    |
|------------------|---------------------------------------------|------------|----------------|--------------------------------------------------------------------------|
| SCHEMA-BASE-001  | (pre-existing / remote baseline)            | ✅          | ❌ (pre-ledger) | 42 MVP tables, ap-south-1                                                |
| SCHEMA-RE-001    | 20260614_001_re_seed_tables.sql             | ✅ staging  | ✅              | 19 RE tables + household_members + profiles.re_engine_version; foofoo-staging only; NOT yet on production |
| SCHEMA-RE-002    | 20260614_003_re_user_weekly_plans.sql       | ✅ staging  | ✅              | BUILD-04: `re_user_weekly_plans` (per-user 7-day class plan, RLS own-rows). Applied 2026-06-14 via Supabase MCP to foofoo-staging. 17 cols, 1 RLS policy (re_uwp_all_own), index idx_re_uwp_profile_week. NOT yet on production. |
| SCHEMA-RE-003    | 20260614_004_re_user_addon_plans.sql        | ✅ staging  | ✅              | BUILD-05: `re_user_addon_plans` (per-user member-specific add-on plan, RLS own-rows). Applied 2026-06-14 via Supabase MCP to foofoo-staging. 11 cols, 1 RLS policy (re_uap_all_own), 2 indexes (profile_week, profile_week_day). NOT yet on production. |
| SCHEMA-RE-004    | 20260614_005_re_user_feedback.sql           | ✅ staging  | ✅              | BUILD-07: 3 tables — `re_user_feedback` (raw event log, 8 cols, RLS re_uf_own), `re_user_dish_affinity` (materialized dish scores + is_never + not_today_until, 11 cols, UNIQUE profile+dish, RLS re_uda_own), `re_user_class_affinity` (class-level scores, 6 cols, UNIQUE profile+class, RLS re_uca_own). Applied 2026-06-14 via Supabase MCP to foofoo-staging. NOT yet on production. |
| SCHEMA-RE-005    | 20260614_006_re_taxonomy_releases.sql       | ✅ staging  | ✅              | BUILD-09: `re_taxonomy_releases` — taxonomy release audit log (taxonomy_version UNIQUE, version_from/to, changed_entities JSONB, risk_level CHECK, qa_status CHECK, qa_report JSONB, approved_by, release_notes, rollback_plan, released_at). SELECT-only RLS for authenticated users; writes require service role. Index: idx_re_tr_created. Applied 2026-06-14 via Supabase MCP to foofoo-staging. NOT yet on production. |
| SCHEMA-RE-008    | 20260614_009_re_household_profile_contract_columns.sql | ✅ staging  | ✅              | RE Validation PACK 2 fix: added 7 DOC-10 output-contract columns to re_user_household_profiles (city_tier, migration_overlay, nonveg_mode, egg_allowed, fasting_pattern, weekday_time_pressure, class_affinity_vector JSONB). Makes the household profile schema contract-complete so onboarding capture has a faithful target. Additive (nullable). Applied 2026-06-14 via Supabase MCP. NOT yet on production. |
| SCHEMA-RE-009    | 20260614_010_re_cohort_assignment_confidence.sql | ✅ staging  | ✅              | BUILD-03: added `confidence NUMERIC(4,3)` + `routing_trace TEXT[]` to re_user_household_profiles (DOC-03 §6/§8 contract). `runCohortAssignment()` now computes confidence (base 0.70 + overlays) and persists routing_trace. Additive (nullable). Applied 2026-06-14 via Supabase MCP. NOT yet on production. |
| SCHEMA-RE-010    | 20260614_011_re_user_weekly_plans_nonveg_slot.sql | ✅ staging  | ✅              | BUILD-04: added `nonveg_scheduled_slot TEXT` to re_user_weekly_plans (DOC-13/DOC-15 contract). `generateUserWeeklyPlan()` now fetches `scheduled_nonveg_slot` from re_weekly_class_plans and stores it per day row so BUILD-06 dish expander can activate nonveg candidates in the correct slot. Additive (nullable). Applied 2026-06-14 via Supabase MCP. NOT yet on production. |
| SCHEMA-RE-007    | 20260614_008_re_restore_overlap_class_dishes.sql | ✅ staging  | ✅              | RE Validation PACK 1 fix: restored 104 missing class-dish options (re_class_dish_options 946→1050; all 131 classes now have dishes) for the 13 member-specific (allowed_as_weekly_primary=FALSE) classes, and seeded the 13-row re_meal_class_overlap_rules guard table (was empty). Prior import_workbook.py wrongly excluded these dishes. Verified safe: those 13 classes appear as primary in 0/20664 weekly rows. import_workbook.py corrected for faithful re-run. Applied 2026-06-14 via Supabase MCP. NOT yet on production. |
| SCHEMA-RE-006    | 20260614_007_re_reference_table_rls_select.sql | ✅ staging  | ✅              | Bug-fix: 16 RE reference/seed tables had RLS enabled with zero policies (total read blackout for all roles). Added `SELECT FOR authenticated USING (true)` to: re_states, re_meal_classes, re_class_dish_options, re_addon_classes, re_addon_dish_options, re_cohorts, re_main_cohorts, re_subcohorts, re_personas, re_weekly_class_plans, re_household_addon_plans, re_city_migration_overlays, re_engine_versions, re_meal_class_overlap_rules, re_nonveg_logic, re_routing_rules. Also added own-row ALL policy (re_uea_all_own) to re_user_engine_assignments. All 24 RE tables now have exactly 1 policy. NOT yet on production. |
| SCHEMA-RE-011    | 20260615_001_re_generation_run_id.sql       | ✅ staging  | ✅              | B1: added `generation_run_id UUID DEFAULT gen_random_uuid()` to re_user_weekly_plans; `generation_run_id UUID` (FK nullable) to re_user_feedback. Links feedback events to exact plan generation run. Applied 2026-06-15 via Supabase MCP to foofoo-staging. NOT yet on production. |
| SCHEMA-RE-012    | 20260615_002_re_plan_lock.sql               | ✅ staging  | ✅              | B2: adds `locked BOOLEAN NOT NULL DEFAULT false` to re_user_weekly_plans and re_user_addon_plans, plus partial index idx_re_uwp_locked. Applied 2026-06-19 via Supabase MCP to foofoo-staging. NOT yet on production. |
| SCHEMA-RE-013    | 20260615_003_re_dish_safety_columns.sql     | ✅ staging  | ✅              | P0 BLOCKER FIX: adds `is_jain BOOLEAN NOT NULL DEFAULT false` + `allergen_ids INTEGER[] NOT NULL DEFAULT '{}'` to re_class_dish_options (+ 2 indexes). Applied 2026-06-19 via Supabase MCP to foofoo-staging. Data enrichment run same day: heuristic UPDATE set `is_jain=true` for all `diet_type='veg'` dishes not matching onion/garlic/potato/aloo/carrot/beetroot/turnip/pyaz/lahsun name patterns — 630 rows now `is_jain=true`; 36 veg dishes remain `is_jain=false` (named root-veg/onion/garlic dishes, correctly excluded). Fixes the Jain-user-sees-0-dishes blocker. NOT yet on production. |
| SCHEMA-RE-014    | 20260615_004_re_rename_household_members.sql | ⚠️ PENDING  | ✅              | W5: renames `household_members` → `re_household_members` to align with re_ prefix convention. Updates index + RLS policy name. SQL committed 2026-06-15. NOT yet applied to staging. |
| SCHEMA-RE-015    | 20260615_005_re_addon_plans_unique_constraint.sql | ✅ staging  | ✅              | Bug-fix: widened `re_user_addon_plans` UNIQUE constraint from (profile_id, plan_week_start, day_of_week, meal_slot, target_member_segment) to also include addon_class_code. Fixes "ON CONFLICT DO UPDATE command cannot affect row a second time" 500 error when a persona has multiple addon classes per slot. Applied 2026-06-15 to foofoo-staging. NOT yet on production. |
| SCHEMA-RE-016    | 20260615_006_re_household_addon_plans_unique.sql  | ⚠️ PARTIALLY REVERTED | ✅              | Bug-fix (REVERTED DATA PART): The UNIQUE constraint was added but the SQL DELETE was wrong — it collapsed 7,992 cohort-differentiated rows to 111 by ignoring cohort_id/state_ut/city_tier. UNIQUE constraint was dropped (2026-06-15). Data restore pending (SCHEMA-RE-016-RESTORE). Client-side Set dedup guard in generateUserAddonPlan remains. |
| SCHEMA-RE-016-RESTORE | 20260615_007_re_hacp_restore_all.sql       | ⚠️ PENDING  | ✅              | Re-seeds re_household_addon_plans with all 7,992 cohort-specific rows from the v3 workbook. Rows are unique by addon_plan_id (PK). ON CONFLICT DO NOTHING. Must be applied manually via Supabase SQL editor (file is 3.5MB). Down script deletes all rows. NOT yet applied to staging. |
| SCHEMA-BASE-002  | 20260617_001_staging_restore_mvp_baseline_up.sql / 20260617_002_staging_restore_mvp_baseline_down.sql | ✅ staging  | ✅              | Replicates 9 legacy MVP-baseline tables (audit_log, cuisine_groups, cuisines, dish_combos, ingredients, never_list, planner, suggestion_logs, user_inferred_prefs) onto foofoo-staging, since SCHEMA-BASE-001 was applied to production pre-ledger and was never captured/replicated to the newer staging project. Fixes CI failures in rls-security.test.ts / dpdp-compliance.test.ts (PGRST205/PGRST204/42703) caused by the staging schema gap. Columns, constraints, indexes, and RLS policies copied verbatim from production (ufgfznpqixplcbhmsqqw). Applied 2026-06-17 via Supabase MCP to foofoo-staging only. NOT applied to production (would be a no-op there since tables already exist). |
| SCHEMA-BASE-003  | 20260617_003_staging_restore_mvp_baseline_full_up.sql / 20260617_004_staging_restore_mvp_baseline_full_down.sql | ✅ staging  | ✅              | Follow-up to SCHEMA-BASE-002: closes the remaining gap to the full 42-table Doc #11A MVP baseline. Adds 27 tables (tags, dish_tags, dish_similar, dish_combo_items, meal_ingredients, term_synonyms, user_feedback, planner_carousel, user_recipe_affinity, recommendation_debug_log, user_dish_patterns, weather_cache, region_food_affinity, app_events, user_behavioral_profile, experiments, experiment_assignments, role_audit, etl_jobs, cache_metadata, mv_refresh_history, media_assets, migration_log, notification_log, recipes, recipe_steps, family_members), 3 columns on `dishes` (ingredient_ids, is_jain, derived_at), 2 columns on `user_category_preferences` (item_id, preference_bucket), and the `dish_popularity` materialized view. Fixes CI failures in schema-validation.test.ts / combo-architecture.test.ts. Columns, constraints, RLS policies, and the matview definition copied verbatim from production (ufgfznpqixplcbhmsqqw). Applied 2026-06-17 via Supabase MCP to foofoo-staging only. Verified via information_schema query: all 27 tables, 5 columns, and matview present. NOT applied to production (would be a no-op there since these already exist). |
| SCHEMA-BASE-004  | 20260617_005_staging_user_consent_columns_up.sql / 20260617_006_staging_user_consent_columns_down.sql | ✅ staging  | ✅              | CI re-run (3rd round) surfaced dpdp-compliance.test.ts failures: staging's `user_consent` table predated production's `data_consent_version` (text NOT NULL DEFAULT 'v1.0'), `marketing_consent` (boolean DEFAULT false), and `analytics_consent` (boolean DEFAULT true) columns. Missing `data_consent_version` caused the test helper's upsert to fail with PGRST204, cascading into 0-row / PGRST116 failures on dependent assertions. Columns copied verbatim from production (ufgfznpqixplcbhmsqqw). Applied 2026-06-17 via Supabase MCP to foofoo-staging only. Verified via information_schema query. NOT applied to production (no-op there). |
| SCHEMA-RE-017    | 20260618_001_normalized_planner_tables.sql / 20260618_002_populate_normalized_tables.sql | ✅ staging  | ❌ (additive add-only; no down — old tables untouched, see notes) | Replaces two cohort-keyed Excel-shaped reads with normalized, persona/segment/state-keyed tables: `re_persona_slot_plan` (1,148 rows, 41 personas, from `re_weekly_class_plans`), `re_segment_addon_rule` (46 rows, from `re_household_addon_plans`), `re_state_class_affinity` (890 rows, parsed from `re_states` pipe-delimited pool columns). `generateUserWeeklyPlan`, `generateUserAddonPlan`, and `runCohortAssignment` rewritten to read the new tables; `verifyCohortExists`/`re_cohorts` check removed (persona_id now authoritative). At the time this was applied, `re_weekly_class_plans` / `re_household_addon_plans` / `re_cohorts` were intentionally left unrenamed per Module Rule 9; `re_weekly_class_plans`/`re_household_addon_plans` were subsequently archived under SCHEMA-RE-018 (see below) per explicit user override of that rule. 3 safety gates (orphan class codes, orphan addon codes, Jain/veg safety) all returned 0. Applied 2026-06-18 via Supabase MCP to foofoo-staging only. NOT on production. Details: `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/06_REPAIR_LOGS/SCIENCE_CORRECT_RE_REPAIR_LOG.md`. |
| SCHEMA-RE-018    | 20260619_001_archive_excel_tables.sql / 20260619_001_archive_excel_tables_down.sql | ✅ staging  | ✅              | Renames `re_weekly_class_plans` → `re_weekly_class_plans_archive` (20,664 rows) and `re_household_addon_plans` → `re_household_addon_plans_archive` (7,992 rows); re-creates their SELECT RLS policies under new names. Verified beforehand that all FKs on these two tables point outward (to `re_cohorts`/`re_personas`/`re_meal_classes`/`re_addon_classes`) — nothing else references them as a foreign table, so the rename is safe. **Note:** this rename is a deliberate exception to Module Rule 9 (additive-only, no rename/drop) — Rule 9 was flagged to the user via AskUserQuestion before applying, and the user explicitly chose to override it for this cleanup since both tables had already been fully replaced by SCHEMA-RE-017 and confirmed unread by any application code. `re_cohorts` (2,952 rows) remains unrenamed — it still has active inbound FK references from `re_weekly_class_plans_archive.cohort_id` and `re_household_addon_plans_archive.cohort_id` (and from `re_user_household_profiles.cohort_id` for audit/display). Applied 2026-06-19 via Supabase MCP to foofoo-staging only. NOT on production. Details: `Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/06_REPAIR_LOGS/POST_SCHEMA_RE017_VALIDATION.md`. |

---

## ⚙️ Deployment Gate Policy

- **Auto-deploy:** DISABLED (Vercel `ignoreCommand: exit 1`)
- **Deploy trigger:** Manual only — explicit human approval required each time, per conversation turn
- **Staging flow:** feature branch → PR → `develop` → QA sign-off → PR → `main` → manual `vercel deploy`
