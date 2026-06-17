# UI-BUILD-06/07 LOG — Weekly Meal Plan UI + Interactions

## Files created
- **Components** (`foofoo/src/components/re/weekly/`): `REWeekCell` (compact grid cell; today/weekend
  accent; lock + add-on pill; friendly class label, never raw codes), `REDishCarousel` (ranked dish rail),
  `RESwapSheet` (class-first tabs: Same style / Try a different style / More options), `index.ts`.
- **Pure logic** (`utils/re-weekly.ts`): `friendlyClassLabel`, `buildSwapTiers` (class-first ordering),
  `isDishValidForTier` (no cross-class mismatch guard), `weeklyInsights` (DOC-14).
- **Tests**: `re-weekly.test.ts` (6).

## Class-first swap invariant
`buildSwapTiers(slotClass, secondary, tertiary)` → [same(slotClass) → different(secondary,tertiary) →
broader(null)]. `RESwapSheet` renders `candidatesByTier[tier.id]`, which the caller MUST fetch with
`.eq('meal_class_code', tier.classCode)` (broader = diet-valid cohort classes). `isDishValidForTier`
encodes the rule and is unit-tested → the UI cannot construct a class/dish mismatch.

## Verification
- `re-weekly` 6/6; app `tsc` exit 0.

## Acceptance (component/logic)
- [x] week scannable: compact `REWeekCell` grid, today/weekend accent
- [x] swap class-first; same vs different separated; mismatch structurally prevented
- [x] add-ons secondary (pill + sub-card)
- [x] weekend ≠ weekday (accent + insights)
- [x] non-veg cadence surfaced via insights (protein badge deferred — no v3 tag, P3)
- [x] friendly labels only; raw codes debug-only

## Pending (honest)
- Lock persistence needs additive `locked` field (B2) — client-session until then.
- Mounting weekly grid + swap into `app/(tabs)`/`WeekView` + live candidate fetch per tier = visual-QA-gated (UI-BUILD-11).

## Status: weekly component + logic layer COMPLETE (tsc/tests green); screen mount + visual QA pending app run.
