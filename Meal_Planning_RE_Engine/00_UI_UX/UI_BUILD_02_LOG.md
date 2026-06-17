# UI-BUILD-02 LOG — Onboarding UI

> Scope: onboarding component library + dynamic-branching/confidence logic on the UI-BUILD-01 foundation.
> No DB, no recommendation-logic change. Capture uses the already-built+tested `re-onboarding.repository` fns.

## 1. Files created
**Components (`foofoo/src/components/re/onboarding/`):** `REProgressHeader`, `REQuestionCard`,
`RESelectableGroup` (backs diet/cook/health/weekday/weekend/sub-cohort selection), `REMemberChip`
(multi-member loop + add), `REClassSwipeCard` (class-level calibration), `index.ts`.
**Pure logic:** `foofoo/src/utils/re-onboarding-flow.ts` — `buildScreenFlow` (dynamic branching),
`computeOnboardingConfidence` (DOC-03 §6 weights + cold-start), `shouldAutoCollapseOptional`
(high-confidence fast path), `REACTION_AFFINITY` (swipe → class_affinity_vector ∈ [-1,1]).
**Tests:** `foofoo-tests/unit/re-onboarding-flow.test.ts` (9).

## 2. Data shape produced by onboarding (target)
Flows into `re_user_household_profiles` (+ `household_members`, `user_diet_rules`) via existing repo fns:
`main_cohort_id, sub_cohort_id, persona_id, member_segments[], home_state, current_city,
city_destination_group/city_tier/migration_overlay (resolver), nonveg_mode, egg_allowed, fasting_pattern,
excluded_ingredients[] (int IDs), cook_dependency, health_overlay_code/scope, weekday_time_pressure,
class_affinity_vector, confidence, routing_trace` → then `generateWeeklyPlan`.

## 3. Tests / typecheck
- `re-onboarding-flow.test.ts` 9/9; full suite **404/404 (20 suites)**; app `tsc` **exit 0**.
- Fixed a test-import issue: moved pure `REACTION_AFFINITY`/`SwipeReaction` into the pure flow module so tests don't pull RN.

## 4. Acceptance
- [x] ≤5 cohort cards (never 41 personas) — `RESelectableGroup`/cohort cards; persona resolved backend.
- [x] dynamic branching — `buildScreenFlow` shows members/health only when relevant (tested: single vs toddler vs SC4F).
- [x] home_state & current_city separate — two screens enforced (tested).
- [x] add-on needs captured separately — `REMemberChip` loop → `member_segments[]`.
- [x] class-level calibration — `REClassSwipeCard` over classes, affinity ∈ [-1,1].
- [x] confidence stored for skips — `computeOnboardingConfidence` (cold-start safe).
- [x] output feeds profile builder — maps to existing repo capture fns.

## 5. Pending (honest — see UI_BUILD_DECISIONS_AND_TODO)
- **Screen wiring:** the 9 existing `(re-onboarding)/re-step-*.tsx` screens must mount these components + call the
  capture fns + `saveREOnboardingStep`. Done as a **visual-QA-gated** step (UI-BUILD-11) — not blindly rewriting
  working screens I can't run headless. Components + logic + capture fns are complete and tsc-clean.
- D1 canonical-flow flip (founder), D2 gesture map (founder).

## Status: **UI-BUILD-02 component + logic layer COMPLETE** (tsc/tests green). Screen mount + visual QA pending app run.
