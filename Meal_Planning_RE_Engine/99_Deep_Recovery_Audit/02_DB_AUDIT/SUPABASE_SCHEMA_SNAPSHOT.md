# SUPABASE_SCHEMA_SNAPSHOT (read-only)

> Target: `foofoo-staging` (project ref `kwypxyqxojauhiehuirz`, ap-south-1). Production never touched.
> Captured via Supabase MCP `execute_sql` (read-only). No secrets exposed.

## RE tables (24) — `public` schema, `re_` prefix

| Table | Cols | Group |
|---|---|---|
| re_states | 16 | reference (Tier-1 seed) |
| re_city_migration_overlays | 11 | reference |
| re_main_cohorts | 6 | reference |
| re_subcohorts | 9 | reference |
| re_personas | 23 | reference |
| re_routing_rules | 7 | reference |
| re_cohorts | 37 | reference |
| re_meal_classes | 24 | reference |
| re_meal_class_overlap_rules | 6 | reference (guard) |
| re_class_dish_options | 12 | reference |
| re_addon_classes | 9 | reference |
| re_addon_dish_options | 9 | reference |
| re_weekly_class_plans | 24 | reference (cohort weekly matrix) |
| re_household_addon_plans | 16 | reference (add-on matrix) |
| re_nonveg_logic | 8 | reference |
| re_engine_versions | 5 | config (RE versioning) |
| re_taxonomy_releases | 13 | governance (audit log) |
| re_user_household_profiles | 24 | per-user (onboarding output) |
| re_user_engine_assignments | 5 | per-user (version assignment) |
| re_user_weekly_plans | 18 | per-user (generated plan) |
| re_user_addon_plans | 11 | per-user (generated add-ons) |
| re_user_feedback | 8 | per-user (event log) |
| re_user_dish_affinity | 11 | per-user (materialized) |
| re_user_class_affinity | 6 | per-user (materialized) |

15 reference/seed tables + 1 version config + 1 governance + 7 per-user.
Detailed column lists captured per table during PACK validation; schema registry SCHEMA-RE-001…010 in `SYSTEM_STATE.md`.
