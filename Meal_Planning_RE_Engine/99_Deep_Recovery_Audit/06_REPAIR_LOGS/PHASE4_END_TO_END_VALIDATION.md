# Phase 4 — End-to-End Validation

Run against `foofoo-staging` (`kwypxyqxojauhiehuirz`), 2026-06-18.

**Caveat on method:** this session has DB access (Supabase MCP) but no Node/Expo runtime
wired to staging credentials, so the TypeScript repository functions
(`generateUserWeeklyPlan`, `generateUserAddonPlan`) were not invoked directly. Each test
below instead validates the underlying data path that the rewritten function now reads
from, with the same join/filter logic the function implements. TypeScript compiles with
zero errors (`npx tsc --noEmit`) for all three rewritten files.

## TEST A — persona P11 (used by cohort S13_T1_P11 / S13_T2_P11), state S13

- `re_persona_slot_plan` has exactly 28 rows for `persona_id='P11'` (7 days × 4 slots). PASS
- All `primary_class` values are real `re_meal_classes.meal_class_code` values (guaranteed
  by FK constraint + Gate 1 = 0). PASS
- Per-slot repeat counts for P11's source plan: Breakfast max 3, Lunch max 2, Snack max 2,
  Dinner max 2 — all within `VARIETY_LIMITS` (3/3/3/2) before the unchanged
  `enforceVarietyLimits()` guard even runs. PASS

## TEST B — `elderly_member` segment addon rule

- `re_segment_addon_rule` has 3 rows for `member_segment='elderly_member'`, all referencing
  valid `re_addon_classes.addon_class_code` values (Gate 2 = 0). PASS (rule data exists and
  is reachable via `.eq('member_segment', ...)` / `.in('member_segment', userSegments)`).
- **Not exercised live**: none of the 22 current staging profiles have non-empty
  `member_segments`, so `generateUserAddonPlan` cannot be observed end-to-end against a real
  user today. This is a pre-existing data gap, not a regression — the old
  `re_household_addon_plans` path was keyed by `persona_id`/cohort and had the same
  limitation for these users (0 addon rows would have resulted either way).

## TEST C — Jain / veg safety

- Gate 3 (joins `re_persona_slot_plan` → `re_meal_classes` → `re_personas`, filtering
  `diet_type='nonveg' AND allowed_as_weekly_primary=true AND nonveg_mode='veg'`) returned
  **0** rows. No veg-mode persona is assigned a nonveg primary class. PASS

## TEST D — state class affinity influencing breakfast (Kerala, `state_id='S12'`)

- Kerala has 5 `Breakfast` rows in `re_state_class_affinity`.
- For persona P11, all 7 days of `Breakfast` have a Kerala-affinity class present among
  `{primary_class, secondary_class, tertiary_class}` — confirming
  `buildRowsFromPersonaSlotPlan()`'s re-rank logic (promote the state's top-priority class to
  primary only when it's already one of the persona's own candidate classes) has real,
  non-trivial data to act on rather than being a no-op. PASS (logic verified against live
  data; not run through the live function due to the same runtime-access caveat as Test B).

## Known limitation carried into this rewrite

`re_persona_slot_plan` has no `scheduled_nonveg_slot` equivalent column (the old
`re_weekly_class_plans.scheduled_nonveg_slot` was cohort-keyed, not persona-keyed, in the
Excel source). `buildRowsFromPersonaSlotPlan()` sets this field to `null` for all rows;
nonveg scheduling falls back to whatever default downstream code does with a null value.
Flagged in the repair log as a follow-up item.
