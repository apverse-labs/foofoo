# RE Module — Implementation Build Tracker

> Branch: `apverse-labs-RE`
> Last updated: 2026-06-14
> Source of build sequence: `Meal_Planning_RE_Technical_Docs_v1/README_IMPLEMENTATION_WALKTHROUGH_FOR_CLAUDE_v1.0.md`

---

## Build Status Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Complete — committed to `apverse-labs-RE` |
| ❌ | Blocked — see notes |

---

## Build Tracker

| Build ID | Name | Status | Primary Docs | Notes |
|----------|------|--------|--------------|-------|
| BUILD-00A | RE Module Guardrails Setup | ✅ | DOC-00, README_WALKTHROUGH | `Meal_Planning_RE_Engine/CLAUDE.md` + this tracker created. Root `CLAUDE.md` updated with Rule 6 and RE module section. |
| BUILD-00B | Existing Project Integration Audit | ✅ | — | Full 17-section audit written to `BUILD-00B_Existing_Project_Integration_Audit.md`. Key finding: existing RE scores dishes directly (no class concept). 10 open questions logged for founder. No code written. |
| BUILD-01 | RE Data Model & Seed Import | ✅ | DOC-05, DOC-07, DOC-08, DOC-22 | Migration + seed import verified complete on foofoo-staging (2026-06-14). 20 tables created. Seed: 36 states, 41 personas, 131 meal classes, 946 primary dish options (104 addon-only dishes excluded per VAL-03), 2952 cohorts, 20664 weekly plans, 7992 addon plans. 19/19 validation checks passing (VAL-01–VAL-15 + VAL-13 idempotency). foofoo-mvp (production) untouched. See `BUILD-01_README.md`. |
| BUILD-02 | Onboarding & Household Profile Builder | ✅ | DOC-03, DOC-04, DOC-10, DOC-11, DOC-16, DOC-17, DOC-18, DOC-20 | 8 RE onboarding screens (re-step-1 through re-step-8), RE Supabase client, re-onboarding repository, RE types, feature flag routing. Committed e0fa22e. |
| BUILD-03 | Cohort / Persona Assignment Engine | ✅ | DOC-03, DOC-09, DOC-11, DOC-15, DOC-20 | City resolver (home-state T1/T2 + 7 cross-state metro groups), cohort_id builder (stateId_tierCode_personaId), overlay persona builder (migration P28 + health P07/P15-P19 + cook P22/P23/P25). Committed to apverse-labs-RE. |
| BUILD-04 | Weekly Class-First Plan Engine | ✅ | DOC-12, DOC-13, DOC-14 | 7-day meal-class plan persisted to new `re_user_weekly_plans` table (migration `20260614_003`, up+down written; staging-only, NOT yet applied — the RE-tables Supabase project is not reachable via the current MCP connection, which points at production). `re-plan.repository.ts`: `generateUserWeeklyPlan` (cohort → 7 weekly class rows → primary-with-secondary-fallback class codes → display-name resolution → IST week-start upsert) + `fetchUserWeeklyPlan`. City overlay flag set when destination group is non-home-state. Home screen shows today's class plan for `classfirst_v1` users via `REPlanToday`. Plan generated right after onboarding completion. Unit tests for `deriveMealClassDisplayName` + `getWeekStartMondayIST` (8 passing). Committed to apverse-labs-RE. |
| BUILD-05 | Member-Specific Add-on Engine | ✅ | DOC-04, DOC-06, DOC-17 | `re_user_addon_plans` table (SCHEMA-RE-003, up+down written, applied to staging 2026-06-14). `re-addon.repository.ts`: `generateUserAddonPlan` (persona → re_household_addon_plans → re_user_addon_plans upsert) + `fetchUserAddonPlan` + `fetchTodayAddons`. `re-plan.repository.ts` updated to call addon generation after weekly plan. `REPlanToday.tsx` shows per-slot addon badges with segment emoji+label. Types added: `REAddonComponent`, `RESlotAddons`, `REDayAddonPlan`, `REWeeklyAddonPlan`. 14 unit tests passing. Committed to apverse-labs-RE. |
| BUILD-06 | Dish Expansion & Food DNA Ranking | ✅ | DOC-07, DOC-08, DOC-18, DOC-19 | No new migration (query-time expansion from existing re_class_dish_options seed). `re-dish-expander.repository.ts`: pure fns `parseStateIdFromCohort`, `regionAffinityScore`, `isDietCompatible`, `computeDishScore` + DB ops `expandClassToDishes`, `fetchTodayDishCandidates`. `re-region-constants.ts`: static STATE_REGION_ARCHETYPE map (36 states) + REGION_ARCHETYPE_KEYWORDS. RE_V1 scoring: base 1.0 + region affinity (0..0.20) + weekend boost (0..0.05) + randomisation (0..0.10). Hard filter: diet_type compatibility. Types: `REDishCandidate`, `RESlotDishCandidates`, `REDayDishCandidates`. REPlanToday shows top-3 dish names per slot as italic picks. 26 unit tests passing. Committed to apverse-labs-RE. |
| BUILD-07 | Feedback Learning Loop | ✅ | DOC-19, DOC-21 | SCHEMA-RE-004 (re_user_feedback + re_user_dish_affinity + re_user_class_affinity) applied to staging. `re-feedback.repository.ts`: RE_SIGNAL_WEIGHTS, CLASS_SIGNAL_WEIGHTS, pure helpers (clampHistoryModifier, computeVarietyPenalty, computeNotTodayExpiry, isOnCooldown), DB ops (recordFeedback 3-table upsert chain, fetchDishAffinities, fetchClassAffinities, fetchRecentAcceptDates). `re-dish-expander.repository.ts` updated: hard filters (isNever, NotToday cooldown), history+variety score modifiers, pre-loaded affinity maps. `REDishPick.tsx`: Lock/Skip/More gestures with inline confirmed states + bottom-sheet Never modal. `REPlanToday.tsx`: replaces italic dish text with REDishPick rows. Types: REFeedbackSignal, REDishAffinityState, REDishAffinityMap, REClassAffinityMap. 19 unit tests passing. |
| BUILD-08 | API / App Integration | ✅ | DOC-23, DOC-25 | Stable TypeScript service interface (no new DB migration). `re-engine/interface/MealPlanningREEngine.ts`: MealPlanningREEngine interface + RETodayView composite type. `re-engine/versions/RE_V1/index.ts`: REV1Engine class. `re-engine/resolver/engineResolver.ts`: pure resolveEngineVersion + createEngine (testable). `services/re-engine.service.ts`: single app entry point — reads re_engine_version, resolves engine, delegates. REPlanToday.tsx simplified to one getTodayView() call. 104 RE unit tests passing (8 new resolver tests). |
| BUILD-09 | Admin / Data Operations | ⬜ | DOC-27, DOC-28 | CMS workflows for class, dish, add-on, Food DNA tag maintenance. Data QA and release management. |
| BUILD-10 | Analytics, QA, Experimentation & Governance | ⬜ | DOC-25, DOC-26, DOC-28 | Funnel tracking, plan quality metrics, A/B experiments, taxonomy change governance. |

---

## Completion Gates (must pass before moving to next build)

- Every build must have unit tests before the next build begins (per DOC-00 Claude implementation instruction).
- Every DB migration must have both Up and Down scripts registered in `SYSTEM_STATE.md` before it is applied.
- No production deployment without explicit user approval in the current conversation turn.
- All builds stay on `apverse-labs-RE` until merged through `develop` → `main` with explicit approval.

---

## MVP Phases (from DOC-00)

| Phase | Builds | Output |
|-------|--------|--------|
| MVP-1 | BUILD-00 through BUILD-04 | Onboarding → household profile → cohort assignment → 7-day primary class plan |
| MVP-2 | BUILD-05 + BUILD-06 | Member-specific add-ons + dish candidates under each class |
| MVP-3 | BUILD-07 | Feedback learning, class affinity updates, dish-level ranking |
| MVP-4 | BUILD-08 | Production-grade endpoints and app integration contracts |
| Ops-1 | BUILD-09 + BUILD-10 | Admin CMS, QA dashboards, experimentation, governance |

---

## Missing Files Log

| File | Expected Location | Status | Action |
|------|------------------|--------|--------|
| `RE_V2_Summary.md` | `Meal_Planning_RE_Engine/` | NOT FOUND on `apverse-labs-RE` | Recreate in a future session or confirm if it was only on a previous branch |

---

## Notes

- BUILD-00A is complete. `Meal_Planning_RE_Engine/CLAUDE.md` confirmed present and complete on this branch.
- BUILD-00B is complete. Audit document at `00_Implementation/BUILD-00B_Existing_Project_Integration_Audit.md`. 10 open questions answered by founder (see BUILD-01 prompt context).
- BUILD-01 is complete (2026-06-14). DDL migration applied to foofoo-staging only. All 33,452 seed rows loaded and verified. 19/19 validation checks passing. One deviation from plan: 104 dishes for addon-only classes removed from re_class_dish_options per VAL-03; seed script updated to exclude them on future runs. Open item for BUILD-05: decide storage for addon-only class dish options (currently excluded from both primary and addon_dish pools).
- BUILD-02 is complete (2026-06-14). 15 files: 8 screens, repository, RE client, types, constants, routing gate. TypeScript clean. Legacy onboarding untouched. Feature flag `EXPO_PUBLIC_RE_ONBOARDING_ENABLED=true` required to activate RE flow for new signups. Open item: set `EXPO_PUBLIC_SUPABASE_RE_URL` + `EXPO_PUBLIC_SUPABASE_RE_ANON_KEY` env vars pointing to staging anon key (service role key must NOT be used in app).
- BUILD-03 is complete (2026-06-14). 3 new files: `src/config/re-city-constants.ts` (static city/overlay maps derived from workbook), `src/repositories/re-cohort-resolver.repository.ts` (city→destination_group, cohort_id builder, overlay persona builder, DB-backed runCohortAssignment), `__tests__/build03/re_cohort_resolver.test.ts`. re-step-8.tsx updated to call runCohortAssignment before completeREOnboarding. foofoo-tests jest.config.ts updated with RE tests root + mocks. 36/36 unit tests passing. 7 integration tests skipped (need SUPABASE_STAGING_ANON_KEY).
- BUILD-05 is complete (2026-06-14). SCHEMA-RE-003 live on staging. 5 files: `re-addon.repository.ts`, `re-plan.repository.ts` (addon call integrated), `REPlanToday.tsx` (addon badges), `types/index.ts` (4 new types), `foofoo-tests/unit/re-addon.test.ts` (14 tests passing).
- BUILD-06 is complete (2026-06-14). No new migration. 3 new files: `re-dish-expander.repository.ts`, `re-region-constants.ts`, `re-dish-expander.test.ts`. Updated: `types/index.ts` (3 new types), `REPlanToday.tsx` (dish picks), `re-dish-expander.test.ts` (26 tests passing).
- Next: BUILD-07 (Feedback Learning Loop).
