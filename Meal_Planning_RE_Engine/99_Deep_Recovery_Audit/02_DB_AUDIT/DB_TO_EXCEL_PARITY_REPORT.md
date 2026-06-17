# DB_TO_EXCEL_PARITY_REPORT

> Compares `foofoo-staging` against the Tier-1 source workbook (`CANONICAL_DATA_LEDGER` + `CANONICAL_ID_REGISTRY`).
> Read-only. Captured via Supabase MCP.

## A. Row-count parity (reference/seed tables)

| Entity | DB table | Workbook | DB | Match |
|---|---|---|---|---|
| states/UTs | re_states | 36 | 36 | ✅ |
| city migration overlays | re_city_migration_overlays | 324 | 324 | ✅ |
| main cohorts | re_main_cohorts | 5 | 5 | ✅ |
| sub-cohorts | re_subcohorts | 41 | 41 | ✅ |
| personas | re_personas | 41 | 41 | ✅ |
| routing rules | re_routing_rules | 8 | 8 | ✅ |
| cohorts | re_cohorts | 2952 | 2952 | ✅ |
| meal classes | re_meal_classes | 131 | 131 | ✅ |
| meal-class overlap rules | re_meal_class_overlap_rules | 13 | 13 | ✅ |
| class-dish options | re_class_dish_options | 1050 | 1050 | ✅ |
| add-on classes | re_addon_classes | 24 | 24 | ✅ |
| add-on dish options | re_addon_dish_options | 142 | 142 | ✅ |
| weekly class-plan rows | re_weekly_class_plans | 20664 | 20664 | ✅ |
| household add-on plan rows | re_household_addon_plans | 7992 | 7992 | ✅ |
| non-veg logic | re_nonveg_logic | 36 | 36 | ✅ |

## B. ID-set parity (exact set equality, not just counts)

| Entity | Workbook set | DB set | Missing in DB | Extra in DB | Exact |
|---|---|---|---|---|---|
| persona_id (P01–P41) | 41 | 41 | — | — | ✅ |
| main_cohort_id (MC1–MC5) | 5 | 5 | — | — | ✅ |
| sub_cohort_id (SC1A–SC5P) | 41 | 41 | — | — | ✅ |
| addon_class_code (ADD_*) | 24 | 24 | — | — | ✅ |

## C. Referential integrity (live DB)

| Check | Result |
|---|---|
| distinct cohort_id in re_cohorts | 2952 |
| weekly-plan cohorts orphaned (not in re_cohorts) | 0 ✅ |
| class-dish options orphaned (class missing) | 0 ✅ |
| add-on dish options orphaned (addon class missing) | 0 ✅ |
| household-addon-plan orphaned (addon class missing) | 0 ✅ |
| add-on-only class used as PRIMARY in weekly plan | 0 ✅ |
| meal classes with zero dishes | 0 ✅ |
| dishes belonging to >1 class | 0 ✅ |

## D. Structural reconciliations (from conflict register)

- **DOC-12 (31,636-row matrix workbook)** vs `re_weekly_class_plans` (20,664): DB was seeded from the Tier-1 `Weekly_Class_Plan_v3` (20,664 = 2,952 cohorts × 7 days), which is the canonical normalized form. DOC-12 is a Tier-2 multi-sheet matrix spec in a different (wider/long) layout. **No DB gap** — Tier-1 governs the seed. (Deep cell-parity of DOC-12 vs the 20,664 rows recommended as a follow-up verification, not a blocker.)
- **DOC-07 dish catalog**: per-sheet `Class_Dish_Options_v3` = 1,050, matches DB. The 1,339 figure earlier was the sum across DOC-07's bundled sheets; not a conflict.

## Verdict
**DB→Excel parity: PASS.** All seed/reference tables match the Tier-1 workbook in both row count and exact ID set; zero orphan/integrity violations. Per-user tables are empty (no onboarded users yet) — expected. See `DB_GAP_REGISTER.md` for the (empty-of-blockers) gap list.
