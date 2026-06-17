# WRONG_PATTERN_SCAN

> 20 canonical anti-patterns scanned across RE code (`foofoo/src/**`, `foofoo/app/**`, `re-engine/**`, repositories, migrations) + DB behaviour. Evidence = grep + DB checks + PACK 0–10 findings.

| # | Anti-pattern | Status | Evidence |
|---|---|---|---|
| 1 | cuisine→dish direct recommendation | ✅ clean | dish expansion only from selected class pool (`expandClassToDishes` keyed on `meal_class_code`) |
| 2 | dish plan generated before class plan | ✅ clean | `generateUserWeeklyPlan` writes class codes; dishes expanded later in `fetchTodayDishCandidates` |
| 3 | hardcoded dish lists outside seed | ✅ clean | dishes read from `re_class_dish_options`; no inline dish arrays found |
| 4 | hardcoded meal-class codes not from canonical | ✅ clean | class codes come from `re_weekly_class_plans`/`re_meal_classes` |
| 5 | add-on-only class entering primary plan | ✅ clean | DB check: 0 add-on-only classes used as primary across 20,664 rows |
| 6 | infant/elderly/etc as replacement main meal | ✅ clean | add-ons in separate `re_user_addon_plans`, `attached_to_primary_class`; never overwrite primary |
| 7 | home_state & current_city merged | ✅ clean | resolver reads both separately (`re-cohort-resolver.repository.ts:150`) |
| 8 | non-veg as simple boolean | ✅ clean | `re_nonveg_logic` (36 state rows) + `nonveg_mode`/`scheduled_nonveg_slot`; cohort/state sensitive |
| 9 | cook dependency ignored / as cuisine | 🟨 partial | `cook_dependency` captured + drives overlay persona; complexity-tuning of dishes not yet applied (no dish complexity metadata in v3) — backlog, not wrong |
| 10 | health overlay converts whole family to diet food | ✅ clean | health overlay scoped (`health_scope`); member overlays → add-ons, not family primary |
| 11 | Food DNA ignored in ranking | 🟨 N/A-by-data | v3 has no per-dish DNA (DOC-08 is a spec); `food_dna_match` omitted faithfully — backlog |
| 12 | scoring before hard constraints | ✅ clean | hard filters (diet/Never/cooldown) at expander lines 196–199 run before `computeDishScore` (211) |
| 13 | dish candidates not filtered by meal_class_code | ✅ clean | `.eq('meal_class_code', classCode)` (line 189) |
| 14 | weekly matrix ignored | ✅ clean | plan generation reads `re_weekly_class_plans` (the seeded matrix) |
| 15 | v3 source workbook ignored | ✅ clean | seed import (`import_workbook.py`) sources from `Indian_Meal_Cohort_Persona_DB_v3.xlsx`; DB == workbook (Phase 3) |
| 16 | API response missing class-first structure | ✅ clean | `RETodayView` returns dayPlan (classes) + dishes + addons separately |
| 17 | RE versioning missing / app calls a version directly | ✅ clean | grep: 0 direct version imports outside `re-engine/`; resolver dispatches by `re_engine_version` |
| 18 | feedback updates only dish likes, not class | ✅ clean (fixed PACK 7) | `CLASS_SIGNAL_WEIGHTS` → `re_user_class_affinity`; consumed in `computeDishScore` via `classAffinity` |
| 19 | tests pass on invented dummy data | 🟨 partial | unit tests use canonical IDs/fixtures; some integration tests gated on staging keys (skip without creds) — see test coverage audit |
| 20 | destructive / non-idempotent migrations | ✅ clean | grep: 0 DROP/TRUNCATE/DELETE in `migrations/up/`; all additive + idempotent + Down scripts |

## Summary
**17 clean, 3 partial (9, 11, 19), 0 wrong-architecture violations.** The 3 partials are data-driven backlog items (cook-complexity tuning & Food DNA need dish metadata v3 doesn't carry; integration tests need CI staging secrets), not architectural defects. No BLOCKER.
