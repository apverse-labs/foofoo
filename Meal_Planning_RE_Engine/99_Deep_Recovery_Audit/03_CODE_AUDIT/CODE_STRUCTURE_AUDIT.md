# CODE_STRUCTURE_AUDIT

> RE implementation surface, mapped by build. Sources: `foofoo/src/**`, `foofoo/app/(re-onboarding)/**`, `re-engine/**`, `00_Implementation/**`.

## Stable interface & resolver (BUILD-08)
- `foofoo/src/re-engine/interface/MealPlanningREEngine.ts` — contract: `generateWeeklyPlan`, `getTodayView`, `recordFeedback`.
- `foofoo/src/re-engine/resolver/engineResolver.ts` — `resolveEngineVersion`, `createEngine`.
- `foofoo/src/re-engine/versions/RE_V1/index.ts` — `REV1Engine` (cold-start, class-first).
- `foofoo/src/services/re-engine.service.ts` — app entry; reads `re_engine_version`, dispatches.

## Repositories (domain logic)
| Build | File | Role |
|---|---|---|
| 01 | `00_Implementation/seeds/import_workbook.py` | seed import from v3 workbook |
| 02 | `repositories/re-onboarding.repository.ts` + `app/(re-onboarding)/re-step-1..9.tsx` | onboarding/profile |
| 03 | `repositories/re-cohort-resolver.repository.ts` | cohort/persona + overlays + confidence |
| 04 | `repositories/re-plan.repository.ts` | weekly class-first plan |
| 05 | `repositories/re-addon.repository.ts` | member add-on plan |
| 06 | `repositories/re-dish-expander.repository.ts` | class→dish expansion + scoring |
| 07 | `repositories/re-feedback.repository.ts` | feedback + affinity learning |
| 08 | `services/re-engine.service.ts` + `re-engine/**` | API/integration |
| 09 | `repositories/re-admin.repository.ts` + `services/re-governance.service.ts` | admin QA + versioning |
| 10 | `repositories/re-analytics.repository.ts` | acceptance/quality metrics |

## Config / constants
`config/re-city-constants.ts`, `config/re-region-constants.ts`, `services/supabase-re.ts`.

## Tests
`foofoo-tests/unit/**` (16 suites, 609 passing logic tests), `foofoo-tests/integration/**` (staging-key gated), `00_Implementation/__tests__/build01..03/**`.

## Observations
- Folder structure differs from the *aspirational* layout in module `CLAUDE.md` (which puts engine under `00_Implementation/versions/…`); the **actual** engine lives under `foofoo/src/re-engine/` (correct for app integration). Documented divergence, not a defect.
- All builds present and wired; no missing build module.
