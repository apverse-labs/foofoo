# SUPABASE_DATA_SNAPSHOT (read-only)

> `foofoo-staging`. Row counts, distinct IDs, integrity. Captured via Supabase MCP.

## Reference/seed table row counts
36 states · 324 city overlays · 5 main cohorts · 41 sub-cohorts · 41 personas · 8 routing rules ·
2952 cohorts · 131 meal classes · 13 overlap rules · 1050 class-dish options · 24 add-on classes ·
142 add-on dish options · 20664 weekly class-plan rows · 7992 household add-on plan rows · 36 non-veg logic rows.

## Config / governance
- `re_engine_versions`: 6 rows (2 legacy + 4 classfirst lineage; `classfirst_v1` active).
- `re_taxonomy_releases`: governance audit log (SELECT-only RLS for authenticated; service-role writes).

## Per-user tables (expected empty pre-launch)
`re_user_household_profiles`, `re_user_engine_assignments`, `re_user_weekly_plans`, `re_user_addon_plans`,
`re_user_feedback`, `re_user_dish_affinity`, `re_user_class_affinity` — 0 rows (no onboarded staging users).
These populate at onboarding (`generateUserWeeklyPlan` / `generateUserAddonPlan`) and via feedback.

## Integrity sweep (all 0 = clean)
weekly-orphan-cohorts 0 · dish-orphan-class 0 · addondish-orphan-class 0 · hap-orphan-class 0 ·
addon-only-as-primary 0 · classes-no-dishes 0 · dishes-multi-class 0.

## Duplicate / null check
All canonical ID columns 0-duplicate (see `CANONICAL_ID_REGISTRY`); reference tables fully populated
(row count == distinct ID count for every keyed seed table).

## Seed version markers
Migrations SCHEMA-RE-001…010 applied (registry in `SYSTEM_STATE.md`); RE-007/008/009/010 added during PACK 0–10.
