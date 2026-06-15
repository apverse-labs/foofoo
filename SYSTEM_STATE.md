# SYSTEM STATE LEDGER (v2.0)
> Last updated: 2026-06-15 (SCHEMA-RE-015 applied + home screen RE user fix)
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
- **Project Ref:** `kwypxyqxojauhiehuirz` (foofoo-staging, ap-south-1)
- **Code Base / Checkpoint:** CKPT-001 + RE BUILD-01 (apverse-labs-RE)
- **Git Release Branch:** `develop` ← PROTECTED (NEVER DELETE)
- **Target Audience:** Internal QA / Beta Cohort — RE module validation
- **Status:** Active — RE BUILD-01 through BUILD-10 complete (2026-06-14). SCHEMA-RE-001 through SCHEMA-RE-010 live on staging. **RE Validation Campaign (PACK 0–10) complete 2026-06-14:** all 10 build series validated against canonical docs + v3 workbook; NORTH STAR reached — staging DB reproduces exact v3 science (41/131/2952/20664/1050/24/7992); DOC-25 automated checks 0 violations. See `Meal_Planning_RE_Engine/00_Implementation/RE_VALIDATION_LOG.md`.

### DEP-PRODUCTION (Project B — Supabase Production)
- **Project Ref:** `ufgfznpqixplcbhmsqqw` (foofoo-mvp, ap-south-1)
- **Code Base / Checkpoint:** CKPT-001
- **Git Release Branch:** `main` ← PROTECTED (NEVER DELETE)
- **Target Audience:** Live Production Users
- **Status:** Active

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
| SCHEMA-RE-012    | 20260615_002_re_plan_lock.sql               | ⚠️ PENDING  | ✅              | B2: adds `locked BOOLEAN NOT NULL DEFAULT false` to re_user_weekly_plans and re_user_addon_plans. SQL files committed. Apply manually: `supabase db push` or via MCP with explicit permission. NOT yet applied to staging. |
| SCHEMA-RE-013    | 20260615_003_re_dish_safety_columns.sql     | ⚠️ PENDING  | ✅              | P0: adds `is_jain BOOLEAN NOT NULL DEFAULT false` + `allergen_ids INTEGER[] NOT NULL DEFAULT '{}'` to re_class_dish_options. Enables allergen + Jain hard-filters in dish expander. SQL committed 2026-06-15. NOT yet applied to staging. Data enrichment (populating rows) is a separate manual seed task. |
| SCHEMA-RE-014    | 20260615_004_re_rename_household_members.sql | ⚠️ PENDING  | ✅              | W5: renames `household_members` → `re_household_members` to align with re_ prefix convention. Updates index + RLS policy name. SQL committed 2026-06-15. NOT yet applied to staging. |
| SCHEMA-RE-015    | 20260615_005_re_addon_plans_unique_constraint.sql | ✅ staging  | ✅              | Bug-fix: widened `re_user_addon_plans` UNIQUE constraint from (profile_id, plan_week_start, day_of_week, meal_slot, target_member_segment) to also include addon_class_code. Fixes "ON CONFLICT DO UPDATE command cannot affect row a second time" 500 error when a persona has multiple addon classes per slot. Applied 2026-06-15 to foofoo-staging. NOT yet on production. |

---

## ⚙️ Deployment Gate Policy

- **Auto-deploy:** DISABLED (Vercel `ignoreCommand: exit 1`)
- **Deploy trigger:** Manual only — explicit human approval required each time, per conversation turn
- **Staging flow:** feature branch → PR → `develop` → QA sign-off → PR → `main` → manual `vercel deploy`
