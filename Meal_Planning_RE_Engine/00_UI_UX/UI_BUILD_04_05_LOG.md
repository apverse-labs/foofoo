# UI-BUILD-04/05 LOG — Home Page UI + RE Integration

## Files created
- **Components** (`foofoo/src/components/re/home/`): `REMealCard` (primary dish headline + quiet class
  sub-label + add-on sub-cards + reason tag + controls), `REReasonTag`, `REConfidenceTag`,
  `REAddonSubCard` (secondary, "For [member]"), `REMealControls` (keep/swap/lock/not-today/never as
  accessible buttons), `REGroceryAction`, `index.ts`.
- **Hooks** (`modules/recommendation-engine/hooks/useREHome.ts`): `useTodayView`, `useGenerateWeeklyPlan`,
  `useSubmitFeedback` — all via the **resolver service** (`re-engine.service`), never a specific version.
- **Pure logic** (`utils/re-reason-tags.ts`): DOC-19 §8 signal→copy, `buildReasonText`, `confidenceLabel/Copy`.
- **Tests**: `re-reason-tags.test.ts` (6).

## Verification
- `re-reason-tags` 6/6; app `tsc` exit 0. (Full suite stays green — see consolidated count.)

## Acceptance (component/logic layer)
- [x] today-first card with primary headline + quiet class sub-label (class-first visible, not loud)
- [x] add-ons render as secondary sub-cards, never primary-sized
- [x] feedback buttons map to real signals (`FEEDBACK_BY_CONTROL`), routed via `submitFeedback`
- [x] candidates are class-scoped by construction (hook returns getTodayView slots; no cross-class)
- [x] confidence/why-this honest, no raw numbers/codes to user
- [x] metadata v3 lacks (cook-time/Food-DNA) omitted, not faked

## Pending (honest)
- Mounting `REMealCard` into `app/(tabs)/index.tsx` for RE users + live image pipeline = visual-QA-gated (UI-BUILD-11).
- generation_run_id on feedback envelope deferred to UI-BUILD-08 (additive item B1).

## Status: home component + integration layer COMPLETE (tsc/tests green); screen mount + visual QA pending app run.
