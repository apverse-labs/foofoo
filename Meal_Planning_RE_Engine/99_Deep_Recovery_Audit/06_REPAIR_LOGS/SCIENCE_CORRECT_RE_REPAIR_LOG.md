# RE Planner — Excel-Shaped Table Repair Log

Branch: `apverse-labs-RE`. Target DB: `foofoo-staging` (`kwypxyqxojauhiehuirz`) only.
`foofoo-mvp` (`ufgfznpqixplcbhmsqqw`) and `main` were never touched.

## 1. Files changed

- `foofoo/src/repositories/re-plan.repository.ts` — `generateUserWeeklyPlan` rewritten to
  read `re_persona_slot_plan` (keyed by `persona_id`) + `re_state_class_affinity` instead of
  `re_weekly_class_plans` (keyed by cohort_id). Added `buildRowsFromPersonaSlotPlan()`.
  Everything from `enforceVarietyLimits()` onward (cook-complexity swap, variety guard,
  upsert) is unchanged.
- `foofoo/src/repositories/re-addon.repository.ts` — `generateUserAddonPlan` rewritten to
  read `re_user_household_profiles.member_segments` (JSONB) + `re_segment_addon_rule`
  instead of `re_household_addon_plans` keyed by `persona_id`. Removed now-dead
  `expandDayCode` / `SHORT_TO_FULL_DAY` / `HouseholdAddonPlanRow` (no longer referenced once
  the short-day-code source table is no longer read).
- `foofoo/src/repositories/re-cohort-resolver.repository.ts` — `runCohortAssignment` no
  longer calls `verifyCohortExists` (queried `re_cohorts`, a 2,952-row Cartesian product);
  `cohortExists` is now `true` unconditionally, and the `confidence -= 0.10` penalty tied to
  it was removed. `cohort_id` is still built and persisted to
  `re_user_household_profiles.cohort_id` for audit/display and for the (optional)
  state-affinity lookup in `re-plan.repository.ts`.

## 2. Tables created (additive only)

| Table | Rows after populate |
|---|---|
| `re_persona_slot_plan` | 1,148 |
| `re_segment_addon_rule` | 46 |
| `re_state_class_affinity` | 890 |

Migrations: `Meal_Planning_RE_Engine/00_Implementation/migrations/up/20260618_001_normalized_planner_tables.sql`,
`..._002_populate_normalized_tables.sql`.

## 3. Tables archived

**None.** Phase 5 (renaming `re_weekly_class_plans` / `re_household_addon_plans` to
`_archive`) was **not executed**. `Meal_Planning_RE_Engine/CLAUDE.md` Rule 9 mandates
additive-only migrations — no dropping or renaming production tables/columns — and the user
confirmed mid-task to honor that rule over the task's Phase 5 instruction. Both tables
remain in place, unrenamed, with their original row counts (20,664 / 7,992); the app simply
no longer reads them.

## 4. The two DB reads that were replaced

1. `re-plan.repository.ts` — `.from('re_weekly_class_plans').eq('cohort_id', cohortId)` →
   `.from('re_persona_slot_plan').eq('persona_id', personaId)`, with an additional
   `.from('re_state_class_affinity').eq('state_id', stateId)` lookup used to re-rank (never
   inject) classes by state preference.
2. `re-addon.repository.ts` — `.from('re_household_addon_plans').eq('persona_id', personaId)`
   → `.from('re_segment_addon_rule').in('member_segment', userSegments)`, expanded to 7 days
   per rule in code (the rule table itself is day-agnostic).

`re-cohort-resolver.repository.ts`'s `.from('re_cohorts').eq('cohort_id', cohortId)`
existence check (Problem 3) was removed rather than replaced — `persona_id` is now the
authoritative planning key, so verifying the Excel-shaped composite `cohort_id` no longer
gates anything.

## 5. What stayed unchanged and why

- `re-dish-expander.repository.ts`, `re-feedback.repository.ts`,
  `re-onboarding-flow.ts`, `re-onboarding.repository.ts`, `re-engine.service.ts`,
  `engineResolver.ts`, `MealPlanningREEngine.ts` — explicitly out of scope; not touched.
- `re_user_weekly_plans` / `re_user_addon_plans` output schema and upsert `onConflict` keys
  — unchanged; this was a read-path fix, not an output-contract change.
- Cook-complexity swap, `enforceVarietyLimits()`, DOC-09 city-migration overlay (lunch/dinner
  blend from `re_city_migration_overlays`) — unchanged logic, just fed by the new candidate
  rows.

## 6. Gate results

See `NORMALIZED_TABLES_GATE_RESULTS.md`. All three gates (orphan class codes, orphan addon
codes, Jain/veg safety) returned **0**.

## 7. End-to-end test results

See `PHASE4_END_TO_END_VALIDATION.md`. Tests A, C, D verified against live staging data;
Test B verified against rule data only (no current staging user has non-empty
`member_segments` to exercise the addon path live — pre-existing data gap, not a regression).

## 8. Known remaining items

- `re_cohorts` (2,952-row Cartesian product) is still active; not archived, since its only
  remaining reader (`verifyCohortExists`) was deleted but the table itself was left in place
  per the additive-only constraint. Next step: decide whether to keep it as a reference table
  or formally deprecate it through the module's normal additive-migration process.
- `re_weekly_class_plans` (20,664 rows) and `re_household_addon_plans` (7,992 rows) remain
  unrenamed and unread by application code — candidates for a future, explicitly-approved
  cleanup migration if the team decides to revisit Rule 9 for this case.
- `re_persona_slot_plan` has no equivalent of `re_weekly_class_plans.scheduled_nonveg_slot`
  (that field was cohort-keyed in the Excel source, not persona-keyed); it's now always
  `null` in generated plans. Needs a follow-up to source nonveg slot scheduling from
  `re_nonveg_logic` / `re_personas` if this field is actually consumed downstream.
