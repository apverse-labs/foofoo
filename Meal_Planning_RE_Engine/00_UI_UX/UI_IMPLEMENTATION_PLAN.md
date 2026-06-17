# UI IMPLEMENTATION PLAN — Foofoo RE UI

> Turns the 7 UX specs into a buildable plan against the **actual** app. **No code here.**
> Note: `EXISTING_UI_UX_AUDIT.md` was never created → skipped (per prior instruction); existing state is
> inventoried below directly from the repo.

**Stack (real):** Expo SDK 56 / React 19 / RN 0.85 + RN-Web · Expo Router (file routes) · Zustand + TanStack
Query · Reanimated 3 + gesture-handler · Supabase (client-direct, `supabase-re`) · resolver service
(`re-engine.service`). Tokens in `src/config/constants.ts`.

**Big reuse win:** the RE onboarding flow, RE home components, week view, resolver, and all 10 repositories
already exist. This plan is **enhancement + targeted new components**, not greenfield.

---

## 1. Existing files to REUSE (as-is or as base)
- **Routes:** `app/(re-onboarding)/re-step-1..9` + `re-step-8-reveal`, `app/(tabs)/index.tsx` (home), `app/(tabs)/grocery.tsx`, `app/dish/[id].tsx`, `app/(dev)/logs.tsx` (debug surface), `app/index.tsx` (routing/resume).
- **Components:** `components/re/REPlanToday.tsx`, `REDishPick.tsx`, `PersonaCard.tsx`, `AcknowledgementBubble.tsx`; `components/planner/WeekView.tsx`; `components/shared/OnboardingLayout.tsx`, `BucketSelector.tsx`, `GestureTutorial.tsx`.
- **Services/repos:** `services/re-engine.service.ts` (resolver entry — **all** reads/writes go here), `supabase-re.ts`; all `repositories/re-*.ts` (onboarding/cohort/plan/addon/dish-expander/feedback/admin/analytics).
- **Config:** `config/constants.ts` (COLORS/SPACING/RADIUS/TIMING + `RE_FEATURE_FLAGS`), `re-city-constants.ts`, `re-region-constants.ts`.

## 2. Existing files to MODIFY
- `app/(re-onboarding)/re-step-*.tsx` — wire to the new capture fns (`saveREContractExtras`, `saveREClassAffinity`, `saveREHouseholdMembers` loop, `saveREOnboardingStep`); add the missing screens (allergy, swipe, weekday/weekend) per ONBOARDING_UX_SPEC OB-03/06/09/10/11.
- `app/(tabs)/index.tsx` — render the polished RE home (REMealCard timeline) for RE users.
- `app/index.tsx` — onboarding resume via persisted `onboarding_step`; canonical-flow decision (flag).
- `components/re/REDishPick.tsx` / `REPlanToday.tsx` — refactor into the spec's `REMealCard` + controls; route feedback via `submitFeedback` (already done in PACK 8).
- `components/planner/WeekView.tsx` — extend to RE weekly grid (friendly class labels, weekend accent, add-on pills).
- `config/constants.ts` — semantic color tokens (never/lock), dark-mode token scaffold.

## 3. New components to CREATE (`components/re/`)
Per UI_DESIGN_SYSTEM_AND_COMPONENT_SPEC §B: `REProgressHeader`, `REQuestionCard`, `REClassSwipeCard`,
`REMealCard` (+ `REMealControls`), `REWeekCell`, `REAddonSubCard`, `REReasonTag`, `REConfidenceTag`,
`REMemberChip`, `RELocationSelect`, `REDietSelect`, `RECookSelect`, `RESwapSheet`, `REDishCarousel`,
`REGroceryAction`, `RESkeleton`, `REEmptyState`, `REErrorState`, `RETracePanel` (dev).

## 4. New routes/screens
- Add onboarding screens to `(re-onboarding)`: allergy capture, class-swipe calibration, weekday, weekend (or fold into existing re-step files as sub-steps). Keep `re-step-8-reveal` as OB-12 confirm.
- `app/(tabs)/index.tsx` stays the home route (no new route); Day↔Week toggle renders weekly inline.
- `RETracePanel` mounted under `app/(dev)/` (build-flag gated), reuse existing `(dev)/logs` pattern.

## 5. API hooks / services
- Use `re-engine.service` (`getTodayView`, `generateWeeklyPlan`, `submitFeedback`) as the **only** UI entry.
- TanStack Query hooks (new, `src/modules/recommendation-engine/hooks/`): `useTodayView`, `useWeeklyPlan`, `useDishCandidates(slot)`, `useAddonPlan`, `useSubmitFeedback` (optimistic), `useOnboardingProfile`.
- Onboarding capture via existing `re-onboarding.repository` fns (wrapped in mutation hooks).

## 6. State management
- **Server state:** TanStack Query (cache + offline + optimistic feedback; invalidate on feedback/swap/lock).
- **Onboarding wizard state:** Zustand store (in-progress answers, step) + persist `onboarding_step` server-side each step.
- **Lock state:** depends on the additive `locked` field (see §13); until then a Zustand client-session set (flagged non-persistent).
- No raw SQL in components (CLAUDE.md rule 3); no business logic in screens.

## 7. Loading / error / empty states
Implement `RESkeleton` / `REEmptyState` / `REErrorState` mapped to DOC-23 codes + the state tables in
HOME §G and WEEKLY §J (no-plan, no-candidate, no-addon, skipped, MISSING_DIET_MODE, HARD_CONSTRAINT_BLOCK,
INVALID_TAXONOMY_VERSION, offline). Every state = a kind next step; constraint-safe fallback always.

## 8. Analytics instrumentation
Wire the event sets from EXPERIENCE_MAP §F + HOME §I + ONBOARDING §G via the existing PostHog service
(`PostHogService`). Feedback events double as RE signals (§D of data contract). Funnel: `onboarding_started`
→ per-step → `ob_completed` → `first_plan_revealed` → home/feedback events.

## 9. Accessibility implementation
≥48dp targets, dynamic type, contrast on imagery (scrims), VoiceOver/TalkBack labels per card/gesture/add-on,
web keyboard nav (RN-Web), reduced-motion fallbacks, color-blind-safe states (icon+label+shape). Reuse the
existing web-safe Haptics pattern. A11y is a per-component acceptance gate, not a final pass.

## 10. Test plan
- **Unit (Jest, the verifiable layer):** pure helpers + mappers (label maps, signal mappers, confidence/affinity math, swap-pool class-scoping) — extend the 386-test suite.
- **Component:** render + interaction (RN Testing Library) for each §3 component: emits correct signal, handles empty/error, a11y labels present.
- **Contract:** assert UI payloads never cross class (dish.meal_class_code === slot class); feedback envelope completeness (§D).
- **Integration (CI w/ staging key):** onboarding→profile→plan happy paths; golden households.
- **No falsely-passing tests** (canonical fixtures, not invented data).

## 11. Visual QA plan
Requires the Expo app running (web + Android Expo Go) — the part not verifiable in this sandbox.
Per-screen visual checklist: hierarchy, food-image/blurhash, weekend accent, add-on secondary-ness,
reason chip, motion + reduced-motion, dark-mode tokens, small/old-device layout. Screenshot diffs on key states.

## 12. Rollout plan
Behind `EXPO_PUBLIC_RE_ONBOARDING_ENABLED` (already exists). Stages: internal dev build → QA cohort (flag on
for testers) → beta cohort → flip default. Legacy `(onboarding)/step-*` stays as fallback until RE flow is
canonical. Web (Vercel) first for fast iteration, then EAS Android. **No production flip without explicit approval.**

## 13. Feature flag / experiment plan
- **Flag:** `RE_FEATURE_FLAGS.ONBOARDING_ENABLED` gates the whole RE UI path; add per-surface sub-flags if needed (`RE_HOME_ENABLED`, `RE_WEEKLY_ENABLED`).
- **Experiments (DOC-26):** onboarding 5-cards vs conversational; class-swipe images vs labels; city-overlay strength; add-on always-visible vs collapsed; randomization range — via existing `experiments`/`experiment_assignments`.
- **3 additive backend items** these UIs need (from data contract): `generation_run_id` column, `locked` slot field, component score breakdown — small migrations/pure-fn changes; schedule in UI-BUILD-01/07/08.

## 14. Order of implementation
UI-BUILD-01 (foundations + the 3 additive backend items) → 02 (onboarding UI) → 03 (onboarding→profile) →
04 (home UI) → 05 (home RE integration) → 06 (weekly UI) → 07 (weekly interactions) → 08 (feedback
instrumentation) → 09 (states) → 10 (polish/a11y) → 11 (QA + golden). 08/09/10 partly run in parallel with
04–07. Each build ships behind the flag, tests green, before the next.

---

## UI Builds

### UI-BUILD-01 · Design system foundations
- **Scope:** token additions (semantic colors, dark-mode scaffold) in `constants.ts`; base primitives (`RESkeleton`, `REReasonTag`, `REConfidenceTag`, chip/card primitives); land the **3 additive backend items** (migrations: `generation_run_id`, `locked`; scorer returns component map).
- **Files:** `config/constants.ts`; new `components/re/` primitives; migrations `up/down/*`; `re-dish-expander.repository.ts` (score breakdown); `re-plan.repository.ts` (run id/lock).
- **Dependencies:** none. **Tests:** token snapshot; scorer-breakdown unit tests; migration apply on staging (additive, Up+Down, registered).
- **Acceptance:** primitives render with tokens + a11y; scorer returns components summing to current scalar; migrations applied + in SYSTEM_STATE.
- **No-go:** no destructive migration; no production; no raw codes in non-debug primitives.

### UI-BUILD-02 · Onboarding UI
- **Scope:** all OB-00..OB-14 screens/components (`REProgressHeader`, `REQuestionCard`, `REMemberChip`, `RELocationSelect` ×2, `REDietSelect`, `RECookSelect`, `REClassSwipeCard`); add missing screens (allergy/swipe/weekday/weekend) to `(re-onboarding)`.
- **Files:** `app/(re-onboarding)/re-step-*.tsx` (modify + add); new components; Zustand wizard store.
- **Dependencies:** UI-BUILD-01. **Tests:** component render/interaction; branching logic (`requiresMemberStep`); a11y labels.
- **Acceptance:** ≤5 cohort cards (never 41 personas); dynamic branching; every screen skippable; home_state≠current_city as two screens; calibration over classes (diet-filtered).
- **No-go:** never expose persona list; never block on skip; calibration must not show diet-excluded classes.

### UI-BUILD-03 · Onboarding → profile integration
- **Scope:** wire screens to capture fns + `runCohortAssignment` + `generateWeeklyPlan`; persist `onboarding_step`; OB-12 reveal from real profile; OB-13 loading.
- **Files:** `re-step-*.tsx`, `re-onboarding.repository.ts` (built+tested), `re-cohort-resolver`, `re-engine.service`.
- **Dependencies:** UI-BUILD-02. **Tests:** integration (profile fields persisted; cold-start ships a plan); resume from `onboarding_step`.
- **Acceptance:** DOC-10 18-field contract captured/defaulted; first plan generates on confirm; resume-safe; hard constraints persisted (allergy as int IDs).
- **No-go:** no diet guessing; allergy never hardcoded `[]`; no version imported directly.

### UI-BUILD-04 · Home page UI
- **Scope:** `REMealCard` (hero/compact) + timeline + add-on strip + reason/confidence tags; Day↔Week toggle shell. Static/mock data.
- **Files:** `app/(tabs)/index.tsx`; new `REMealCard`, `REAddonSubCard`, `REMealControls`, `REGroceryAction`.
- **Dependencies:** UI-BUILD-01. **Tests:** card render variants; add-on secondary-ness; metadata-absent fields hidden.
- **Acceptance:** today understandable <5s; class shown as quiet sub-label; add-ons visually secondary.
- **No-go:** add-ons never primary-sized; no fake cook-time/Food-DNA.

### UI-BUILD-05 · Home page RE integration
- **Scope:** `useTodayView`/`useDishCandidates`/`useAddonPlan` hooks; bind `REMealCard` to `getTodayView`; live reason tags.
- **Files:** `modules/recommendation-engine/hooks/*`, `app/(tabs)/index.tsx`, `REPlanToday.tsx` refactor.
- **Dependencies:** 04. **Tests:** contract test (candidate.class === slot class); empty/error states.
- **Acceptance:** real plan renders; constraint-safe; engine_version carried.
- **No-go:** no class/dish mismatch; no direct version call.

### UI-BUILD-06 · Weekly meal plan UI
- **Scope:** `REWeekCell` grid, weekend accent, today anchor, friendly labels, add-on pills; 5 view modes shell (`WeekView` extended).
- **Files:** `components/planner/WeekView.tsx`, new `REWeekCell`; `app/(tabs)/index.tsx` (week mode).
- **Dependencies:** 01,04. **Tests:** weekend accent Sat/Sun; today ring; no raw class code; <10s scan layout.
- **Acceptance:** scan week <10s; weekend≠weekday; class-first internal.
- **No-go:** never render raw class codes (user mode).

### UI-BUILD-07 · Weekly interactions (swap/lock/not-today/never)
- **Scope:** `RESwapSheet` (class-first pool order), `REDishCarousel`, `REMealControls`; lock scopes (meal/day/weekend/add-on) using the `locked` field.
- **Files:** new sheet/carousel/controls; `re-plan`/`re-feedback` repos; `re-dish-expander`.
- **Dependencies:** 01(locked field),06. **Tests:** swap pool **never** offers out-of-class dish; diet filter pre-display; lock excludes from regenerate; signals emitted.
- **Acceptance:** swap <15s; same-style vs different-style separated; lock persists (post-additive).
- **No-go:** swap cannot create class/dish mismatch; Never requires confirm + reversible.

### UI-BUILD-08 · Feedback instrumentation
- **Scope:** all 12 events → `submitFeedback` + PostHog; canonical envelope (§D contract) incl. `generation_run_id`; optimistic updates + undo snackbars.
- **Files:** `useSubmitFeedback`, all interactive components, `PostHogService`.
- **Dependencies:** 01(run id),05,07. **Tests:** envelope completeness; optimistic + rollback; dish+class affinity both update.
- **Acceptance:** every interaction sends learning-sufficient signal; real-time affinity update.
- **No-go:** no silent signal drops; never block UI on write failure (queue + retry).

### UI-BUILD-09 · Empty/error/loading states
- **Scope:** `REEmptyState`/`REErrorState`/`RESkeleton` across onboarding/home/weekly; DOC-23 code mapping.
- **Files:** the three components + usage sites.
- **Dependencies:** 04,06. **Tests:** each kind/code renders kind next step; constraint errors never show excluded food.
- **Acceptance:** no dead ends; offline cached day; warm non-technical copy.
- **No-go:** no stack traces to users; no blank white.

### UI-BUILD-10 · Visual polish, animation, accessibility
- **Scope:** Reanimated swipe/lock springs + reduced-motion fallback; haptics; shared-element card→detail; full a11y pass; dark-mode tokens applied.
- **Files:** components broadly; motion utils.
- **Dependencies:** 02–09. **Tests:** reduced-motion path; a11y labels/contrast audit; 60fps check.
- **Acceptance:** polished, accessible, reduced-motion-safe; meets §H visual system.
- **No-go:** no info conveyed by motion/color alone.

### UI-BUILD-11 · QA & golden-household validation
- **Scope:** run the 15 golden households end-to-end through the UI (onboarding→plan→swap→feedback); visual QA checklist; experiment flags verified.
- **Files:** `foofoo-tests/**` (e2e/golden), QA docs.
- **Dependencies:** 01–10. **Tests:** golden e2e (CI staging key); contract invariants; funnel analytics fire.
- **Acceptance:** all golden households produce conforming, constraint-safe plans; metrics fire; visual QA signed off.
- **No-go:** any constraint violation or class/dish mismatch = blocker; no production flip without approval.

---

*Build order is the contract: 01 → 11, each behind the flag with tests green before the next. The only net-new
backend work is the 3 additive items in UI-BUILD-01; everything else composes existing repositories + the
resolver. Visual QA (UI-BUILD-11) requires the running Expo app — the one part not verifiable headless.*
