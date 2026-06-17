# RE Schema Version Registry

> Last updated: 2026-06-14  
> Source of truth: `SYSTEM_STATE.md` § DB Schema Registry  
> Supabase staging (RE): `kwypxyqxojauhiehuirz` (foofoo-staging, ap-south-1)  
> Supabase production (MVP): `ufgfznpqixplcbhmsqqw` (foofoo-mvp, ap-south-1)

---

## Schema Registry

| Schema ID | Date Applied | Description | Up Migration File | Down Available | RE Staging | MVP Prod |
|-----------|-------------|-------------|-------------------|----------------|------------|----------|
| SCHEMA-BASE-001 | pre-ledger | 42 MVP tables, baseline Supabase schema | (pre-existing / remote baseline) | ❌ (pre-ledger) | ✅ | ✅ |
| SCHEMA-RE-001 | 2026-06-14 | 19 RE tables + `household_members` + `profiles.re_engine_version` | `20260614_001_re_seed_tables.sql` | ✅ | ✅ | ❌ |
| SCHEMA-RE-002 | 2026-06-14 | `re_user_weekly_plans` — per-user 7-day class plan, RLS own-rows | `20260614_003_re_user_weekly_plans.sql` | ✅ | ✅ | ❌ |
| SCHEMA-RE-003 | 2026-06-14 | `re_user_addon_plans` — per-user member-specific add-on plan, RLS own-rows | `20260614_004_re_user_addon_plans.sql` | ✅ | ✅ | ❌ |
| SCHEMA-RE-004 | 2026-06-14 | `re_user_feedback`, `re_user_dish_affinity`, `re_user_class_affinity` — feedback + affinity tables | `20260614_005_re_user_feedback.sql` | ✅ | ✅ | ❌ |
| SCHEMA-RE-005 | 2026-06-14 | `re_taxonomy_releases` — taxonomy release audit log with QA gating | `20260614_006_re_taxonomy_releases.sql` | ✅ | ✅ | ❌ |
| SCHEMA-RE-006 | 2026-06-14 | Bug-fix: SELECT RLS policies on 16 RE reference/seed tables + own-row ALL policy on `re_user_engine_assignments` | `20260614_007_re_reference_table_rls_select.sql` | ✅ | ✅ | ❌ |

---

## Schema Detail Notes

### SCHEMA-BASE-001
- Pre-existing baseline; no migration file tracked in ledger (applied before SYSTEM_STATE.md was established).
- No down migration available.
- Present on both staging and production.

### SCHEMA-RE-001
- Introduces the core RE reference and seed tables (19 tables).
- Also adds `household_members` table and `re_engine_version` column to `profiles`.
- **RE staging only** — not yet promoted to MVP production.
- Down migration reverses all 19 RE tables + column additions.

### SCHEMA-RE-002
- Adds `re_user_weekly_plans` (17 columns): per-user, per-week class-level meal plan.
- RLS policy: `re_uwp_all_own` (users own their rows).
- Index: `idx_re_uwp_profile_week`.
- **RE staging only.**

### SCHEMA-RE-003
- Adds `re_user_addon_plans` (11 columns): per-user, per-member add-on plan.
- RLS policy: `re_uap_all_own`.
- Indexes: `(profile_week)`, `(profile_week_day)`.
- **RE staging only.**

### SCHEMA-RE-004
- Adds three feedback/affinity tables:
  - `re_user_feedback` (8 cols) — raw event log, RLS `re_uf_own`
  - `re_user_dish_affinity` (11 cols) — materialized dish scores, includes `is_never` + `not_today_until` flags, UNIQUE on `(profile, dish)`, RLS `re_uda_own`
  - `re_user_class_affinity` (6 cols) — class-level scores, UNIQUE on `(profile, class)`, RLS `re_uca_own`
- **RE staging only.**

### SCHEMA-RE-005
- Adds `re_taxonomy_releases` — governance/audit table for taxonomy version changes.
- Enforces `risk_level` CHECK constraint and `qa_status` CHECK constraint.
- `qa_report` stored as JSONB; `rollback_plan` text column.
- SELECT-only RLS for authenticated users; writes require service role.
- Index: `idx_re_tr_created`.
- **RE staging only.**

### SCHEMA-RE-006
- Bug-fix migration: 16 RE reference/seed tables had RLS enabled with zero policies (read blackout for all roles).
- Added `SELECT FOR authenticated USING (true)` to all 16 reference tables:
  `re_states`, `re_meal_classes`, `re_class_dish_options`, `re_addon_classes`, `re_addon_dish_options`, `re_cohorts`, `re_main_cohorts`, `re_subcohorts`, `re_personas`, `re_weekly_class_plans`, `re_household_addon_plans`, `re_city_migration_overlays`, `re_engine_versions`, `re_meal_class_overlap_rules`, `re_nonveg_logic`, `re_routing_rules`.
- Also added own-row ALL policy (`re_uea_all_own`) to `re_user_engine_assignments`.
- Post-fix: all 24 RE tables have exactly 1 RLS policy each.
- **RE staging only.**

---

## Promotion Status

| Schema group | RE Staging | MVP Prod | Promotion gate |
|---|---|---|---|
| SCHEMA-BASE-001 | ✅ live | ✅ live | N/A (pre-existing) |
| SCHEMA-RE-001 through RE-006 | ✅ live | ❌ not applied | Requires explicit approval + PR from `develop` → `main` |

> **Policy (Rule 4 / Deployment Gate):** No schema migrations are auto-promoted to production. Each must be approved explicitly in the current conversation turn before running `apply_migration` against the MVP prod project.
