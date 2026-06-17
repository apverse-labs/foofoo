# CODE_TO_DOC_TRACEABILITY

> Maps each build's canonical requirement source → code → DB → tests → status.

| Build | Requirement source (Tier 1/2) | Code | DB tables | Tests | Status |
|---|---|---|---|---|---|
| 01 Data/seed | workbook + DOC-02/05/07/08/12/22 | `import_workbook.py` | 15 reference tables | build01 seed_validation | ✅ implemented (exact parity) |
| 02 Onboarding | DOC-03/04/10/11/16/17/18/20 | `re-onboarding.repository.ts` + `re-step-*.tsx` | re_user_household_profiles | build02 re_onboarding | 🟨 schema complete (RE-008); UI capture for 5 fields = backlog |
| 03 Cohort/persona | DOC-03/09/11/15 | `re-cohort-resolver.repository.ts` | re_user_household_profiles | build03 re_cohort_resolver | ✅ implemented (confidence+routing_trace RE-009) |
| 04 Weekly plan | DOC-12/13/14/15/16 | `re-plan.repository.ts` | re_weekly_class_plans → re_user_weekly_plans | unit re-plan | ✅ implemented (nonveg slot RE-010); city-blend = backlog |
| 05 Add-on | DOC-04/06 | `re-addon.repository.ts` | re_household_addon_plans → re_user_addon_plans | unit re-addon | ✅ implemented (0 leaks) |
| 06 Dish expansion | DOC-07/08/19 | `re-dish-expander.repository.ts` | re_class_dish_options | unit re-dish-expander (30) | ✅ implemented; Food DNA/cook-fit = backlog (no v3 data) |
| 07 Feedback | DOC-19/21 | `re-feedback.repository.ts` | re_user_feedback/dish_affinity/class_affinity | unit re-feedback (19) | ✅ implemented (class loop closed PACK 7) |
| 08 API | DOC-23 | `re-engine.service.ts` + `re-engine/**` | (reads all) | unit re-engine-resolver (8) | ✅ implemented (boundary enforced PACK 8) |
| 09 Admin/gov | DOC-22/27/28 | `re-admin.repository.ts` + `re-governance.service.ts` | re_taxonomy_releases | unit re-admin+governance (28) | ✅ implemented (QA col bugs fixed PACK 9); CMS UI = backlog |
| 10 Analytics | DOC-25/26/28 | `re-analytics.repository.ts` | (reads feedback) | unit re-analytics | ✅ implemented; dashboards UI = backlog |

Status legend: ✅ implemented · 🟨 partial (backlog UI/data) · ❌ missing/wrong (none).

**No build is missing or architecturally wrong.** Partial items are forward UI/data builds, all logged.
