# SYSTEM STATE LEDGER (v2.0)
> Last updated: 2026-06-14
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
- **Status:** Active — RE BUILD-01 through BUILD-10 complete (2026-06-14). SCHEMA-RE-001/002/003/004/005 live on staging.

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
| SCHEMA-RE-006    | 20260614_007_re_reference_table_rls_select.sql | ✅ staging  | ✅              | Bug-fix: 16 RE reference/seed tables had RLS enabled with zero policies (total read blackout for all roles). Added `SELECT FOR authenticated USING (true)` to: re_states, re_meal_classes, re_class_dish_options, re_addon_classes, re_addon_dish_options, re_cohorts, re_main_cohorts, re_subcohorts, re_personas, re_weekly_class_plans, re_household_addon_plans, re_city_migration_overlays, re_engine_versions, re_meal_class_overlap_rules, re_nonveg_logic, re_routing_rules. Also added own-row ALL policy (re_uea_all_own) to re_user_engine_assignments. All 24 RE tables now have exactly 1 policy. NOT yet on production. |

---

## ⚙️ Deployment Gate Policy

- **Auto-deploy:** DISABLED (Vercel `ignoreCommand: exit 1`)
- **Deploy trigger:** Manual only — explicit human approval required each time, per conversation turn
- **Staging flow:** feature branch → PR → `develop` → QA sign-off → PR → `main` → manual `vercel deploy`
