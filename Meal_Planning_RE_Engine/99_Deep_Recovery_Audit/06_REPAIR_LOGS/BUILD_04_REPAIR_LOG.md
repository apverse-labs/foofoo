# BUILD_04_REPAIR_LOG — Weekly class-first plan (city-overlay blend)

## DOC-12 verification (CONF-001 closure) — NO REPAIR NEEDED
Cell-diffed DOC-12 workbook vs source workbook (via extracted artifacts):
`Cohort_Matrix_v3` (2952), `Weekly_Class_Plan_v3` (20664), `Household_Addon_Component_Plan` (7992)
are **CELL-IDENTICAL** (headers + every row). DOC-12's "31,636" was the sum of its bundled sheets,
not a larger matrix. CONF-001 → **resolved, no conflict**. DB seed (from these) is in exact parity.

## City-overlay weight blending (DOC-09 / DOC-13) — REPAIR APPLIED
**Gap:** `generateUserWeeklyPlan` set only the `city_overlay_applied` boolean; the DOC-09 overlay
(blend current-city lifestyle classes for migrated users) was never actually applied.

**Fix (code-only, no migration):** in `re-plan.repository.ts`:
- `bucketOverlayClasses()` — buckets `overlay_meal_classes` by slot prefix (BF/LD/SN/DN).
- `pickOverlaySlots(weekdayCount, cityWeight)` — deterministic, evenly-spaced selection sized by
  `current_city_lifestyle_weight`; applied to **weekday lunch/dinner only** (breakfast, snack, and
  weekend-special stay home-state dominant, per DOC-09 worked example).
- `generateUserWeeklyPlan` now, for migrated users, looks up the `(home_state_ut, destination_group)`
  row in `re_city_migration_overlays`, buckets its classes, and substitutes the chosen weekday
  lunch/dinner slots — keeping the home-state primary on the majority of days.

**Faithfulness guards:** deterministic (no RNG → reproducible per DOC-13); home-state remains majority
(city weight 0.30 → ~2 of 5 weekdays); overlay classes resolve display names via the same map; no
schema change; only migrated users (`city_destination_group` not HOME_STATE_*) are affected.

**Tests:** `re-plan.test.ts` — 15 pass (bucketing prefix/whitespace/null; slot sizing/determinism/range). `tsc` 0 errors.

**Status:** PASS. City-overlay backlog item closed.
