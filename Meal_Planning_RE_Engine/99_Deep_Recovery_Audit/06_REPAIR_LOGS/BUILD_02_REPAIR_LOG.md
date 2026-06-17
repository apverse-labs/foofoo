# BUILD_02_REPAIR_LOG — Onboarding & household profile (capture layer)

## Repository capture layer — REPAIR APPLIED (durable, tested)
Added the missing DOC-10 contract-field persistence (SCHEMA-RE-008 columns already exist):
- `saveREContractExtras()` — `egg_allowed`, `nonveg_mode`, `fasting_pattern`, `weekday_time_pressure`.
- `saveREClassAffinity()` — `class_affinity_vector` (validated by `isValidClassAffinityVector`).
- `saveREOnboardingStep()` — persists `onboarding_step` so a killed RE session resumes (resume-bug fix).
- Pure helpers: `deriveNonvegMode(foodPref, mealsPerWeek)` (DOC-15/18), `isValidClassAffinityVector` guard.

**Note on allergy capture:** `saveREDietPrefs` already writes `excluded_ingredients` (int IDs) to
`user_diet_rules` — the persistence path was never the gap; the gap was the **screen** sending `[]`.

**Tests:** new `foofoo-tests/unit/re-onboarding.test.ts` — 9 pass (nonveg-mode mapping, affinity-vector
validation, member-step routing). `tsc` 0 errors.

## Remaining UI work (screen wiring — not unit-verifiable here)
The data layer + validation are complete and tested. The RN screens must now CALL these functions:
1. Allergy screen → pass real `excluded_ingredients` to `saveREDietPrefs` (stop hardcoding `[]`).
2. Class-swipe step → `saveREClassAffinity(vector)`.
3. Multi-member loop → `saveREHouseholdMembers([...])` (function already supports an array).
4. Diet/cook steps → `saveREContractExtras({eggAllowed, nonvegMode: deriveNonvegMode(...), fastingPattern, weekdayTimePressure})`.
5. Each step → `saveREOnboardingStep(step)`; flip `EXPO_PUBLIC_RE_ONBOARDING_ENABLED` to make RE flow canonical.
The HTML proposal (`00_Implementation/proposals/re_onboarding_flow_proposal.html`) is the screen spec.
Screen rendering requires the Expo app to verify visually → tracked as UI build, not closed here.

**Status:** capture layer PASS (tested); screen wiring = remaining UI build (functions ready to call).
