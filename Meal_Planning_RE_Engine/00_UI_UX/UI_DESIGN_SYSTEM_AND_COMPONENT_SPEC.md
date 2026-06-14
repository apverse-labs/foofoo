# UI DESIGN SYSTEM & COMPONENT SPEC
### Foofoo RE — premium, warm, Indian, food-first, calm, trustworthy

> Capstone of the UX set (north-star → experience-map → onboarding → home → weekly → **this**).
> Built on the existing app design tokens (`foofoo/src/config/constants.ts`) + RN/Expo/Reanimated stack.
> **No UI implemented here.** Section F (engineering handoff) is folded into each §B component entry.
> Inspirations are **principles only** — no exact UI/brand/trade-dress copied.

---

## A. Visual Language

1. **Brand mood** — *warm Indian kitchen, calmly organised.* Premium restraint (Apple) + appetite (Tasty/Zomato) + light daily rhythm (Instagram). Food is the hero; chrome recedes. Trust over flash.
2. **Color principles** — tokens from `constants.ts`:
   - `primary #2D6A4F` (deep green) = trust/calm, structure, primary affordances.
   - `accent #FF6B35` (warm orange) = appetite/energy, used **sparingly** for the single primary action.
   - `background #FAFAF8`, `surface #FFFFFF`, `textPrimary #1A1A1A`, `textSecondary #6B6B6B`.
   - Semantic (add): success/lock = primary-tint; caution/never = warm red `#C0392B`; info = muted.
   - **Rule:** state never conveyed by color alone (always icon+label). Imagery carries warmth, not loud gradients.
3. **Typography hierarchy** — Inter (system fallback). Display 24/semibold (greeting) · Title 18/semibold (dish name = hero) · Body 15/regular · Sub-label 13/regular `textSecondary` (class phrase) · Chip/caption 12. Dynamic-type aware; never below ~12.
4. **Spacing scale** — SPACING `xs4 · sm8 · md16 · lg24 · xl32 · xxl48`. Card padding md16; inter-card gap lg24; section gap xl32. Generous breathing room.
5. **Radius / elevation** — BORDER_RADIUS `sm8 · md16 · lg24 · full`. Cards md16; chips/pills full; sheets lg24 top corners. Elevation = soft low shadows on surface, no hard borders; one elevation step for hero vs compact.
6. **Imagery style** — warm natural-light food, top-down or 45°; appetite-forward. 16:9 / 4:3 hero, 1:1 thumb. **Blurhash placeholder always** (never blank white). Bottom scrim for text legibility. Indian dish framing, real home food > studio gloss.
7. **Icon style** — single-weight line icons, rounded joins, 24dp grid; minimal, legible at small size; paired with labels (a11y). Custom set, not copied from any product.
8. **Motion style** — TIMING `ANIMATION_NORMAL 350ms`, `LONG_PRESS_MS 300`. Reanimated 3 springs for swipe/lock confirmations; 60fps; motion = *feedback* (confirms a decision/teaches the model), never decoration. Shared-element transition card→detail.
9. **Haptics (mobile)** — light impact on swipe-commit/lock; success notification on plan-ready; warning on Never-confirm. Web-safe no-op fallback (existing `Haptics web-safe` pattern). Respect system haptic settings.
10. **Dark mode** — token-based theming so a warm dark palette (deep charcoal canvas, lifted surfaces, same green/orange accents at adjusted luminance) is a later switch, not a rewrite. Food imagery stays vivid; maintain contrast ratios both modes. (Design tokens now; dark theme = future flag.)

---

## B. Component Library (with §F engineering handoff per component)

> Per-component block: **Props · States · Data source · Events emitted · Analytics · Error states · Tests.**
> RE components live under `foofoo/src/components/re/`; reuse existing `shared/` (OnboardingLayout, BucketSelector) where noted. Types from `src/types` (REMealClassRef, REDishCandidate, REAddonComponent, RESlotAddons, REWeeklyPlan…).

### B1. App shell (`REAppShell`)
- **Props:** `activeTab`, `children`. **States:** loading / ready / offline (banner).
- **Data:** session + `re_engine_version` (resolver). **Events:** `tabChange`. **Analytics:** `home_viewed` on home tab.
- **Errors:** offline banner; session-expired → auth gate. **Tests:** renders tabs; offline banner toggles on `useNetworkStatus`.

### B2. Progress header (`REProgressHeader`)
- **Props:** `step`, `total`, `onBack`, `showSkip`. **States:** default / first-step (no back) / last.
- **Data:** onboarding step. **Events:** `back`, `skip`. **Analytics:** `ob_step_viewed{step}`.
- **Errors:** none. **Tests:** pill width = step/total; back hidden on step 1; skip emits.

### B3. Onboarding question card (`REQuestionCard`)
- **Props:** `title`, `subtitle`, `inputSlot`, `whyWeAsk?`, `skippable`. **States:** default / answered / skipped.
- **Data:** screen config (ONBOARDING_UX_SPEC §A). **Events:** `answer(payload)`, `skip`, `whyOpen`.
- **Analytics:** per-screen event (e.g. `ob_diet_set`). **Errors:** input-specific. **Tests:** skip lowers confidence path; why-sheet opens.

### B4. Swipe preference card (`REClassSwipeCard`)
- **Props:** `classCode`, `friendlyLabel`, `examples[]`. **States:** idle / dragging / committed(like/sometimes/not/never).
- **Data:** calibration deck (diet-filtered classes). **Events:** `react(classCode, value∈[-1,1])`, `peekExamples`.
- **Analytics:** `ob_swipe_recorded{class,reaction}`. **Errors:** none (local). **Tests:** each gesture→correct affinity delta; Jain user never gets non-veg card; reduced-motion → button commit.

### B5. Meal card (`REMealCard`)
- **Props:** `slot`, `classRef:REMealClassRef`, `topDish:REDishCandidate`, `addons:REAddonComponent[]`, `reasonTag`, `locked`, `variant:hero|compact`. **States:** loading / ready / locked / skipped / no-candidate / never-confirm.
- **Data:** `getTodayView` slice. **Events:** `keep`, `notToday`, `never`, `lock`, `details`, `grocery`, `swap`.
- **Analytics:** `meal_card_seen`, `meal_swiped_keep`, `meal_swiped_not_today`, `meal_never`, `meal_locked`, `meal_details_opened`, `grocery_added`.
- **Errors:** no-candidate → class-only + "options coming soon"; image fail → blurhash/seed fallback.
- **Tests:** actions emit correct `submitFeedback` signal; cook-time/difficulty hidden when metadata absent; add-on pill count correct.

### B6. Weekly meal cell (`REWeekCell`)
- **Props:** `day`, `slot`, `dishName`, `friendlyClass`, `addonCount`, `isToday`, `isWeekend`, `locked`. **States:** default / today / weekend / locked / empty.
- **Data:** `fetchUserWeeklyPlan` row. **Events:** `openDay`, `quickSwap`, `quickLock`.
- **Analytics:** `week_cell_seen`. **Errors:** empty slot → "tap to add". **Tests:** weekend accent applies Sat/Sun; today ring; never renders raw class code (friendly label).

### B7. Add-on sub-card (`REAddonSubCard`)
- **Props:** `component:REAddonComponent` (segment, className, attachedToPrimaryClass). **States:** default / accepted / rejected / unavailable(class-only).
- **Data:** `re_user_addon_plans`. **Events:** `acceptAddon(segment)`, `rejectAddon(segment)`.
- **Analytics:** `addon_seen`, `addon_accepted`, `addon_rejected`. **Errors:** no dish → class label only.
- **Tests:** visually secondary (smaller/muted) vs primary; "For [member]" prefix; never replaces primary.

### B8. Reason tag (`REReasonTag`)
- **Props:** `topSignal`, `supporting?[]`. **States:** chip / expanded sheet. **Data:** DOC-19 §8 signal.
- **Events:** `whyOpen`. **Analytics:** `why_this_opened{slot,top_signal}`. **Errors:** none (always a fallback "Chef pick for today").
- **Tests:** maps signal→copy; Food-DNA signal suppressed when metadata absent.

### B9. Confidence tag (`REConfidenceTag`)
- **Props:** `confidence:number`. **States:** high / medium / learning. **Data:** `re_user_household_profiles.confidence`.
- **Events:** none. **Analytics:** rendered with `ob_summary_viewed{confidence}`. **Errors:** none.
- **Tests:** thresholds map to honest copy; never shows a raw number to user (debug only).

### B10. Member chip (`REMemberChip`)
- **Props:** `segment`, `ageBand?`, `editable`. **States:** default / selected / add-new. **Data:** `household_members`.
- **Events:** `addMember`, `editMember`, `removeMember`. **Analytics:** `ob_member_added{segment}`.
- **Errors:** none. **Tests:** loop add/remove; segment→friendly label.

### B11. State/city selector (`RELocationSelect`)
- **Props:** `mode:home_state|current_city`, `value`, `onSelect`. **States:** idle / searching / no-match / selected.
- **Data:** `re_states` (home) / city→destination-group map (current). **Events:** `select(value)`.
- **Analytics:** `ob_home_state_set` / `ob_current_city_set`. **Errors:** no-match → free-type + "we'll map it" / PG-hostel fallback.
- **Tests:** **two distinct instances** (home_state ≠ current_city never merged); fallback paths.

### B12. Diet / allergy selector (`REDietSelect`)
- **Props:** `dietValue`, `eggAllowed`, `fastingPattern`, `allergenIds:number[]`, `nonvegCadence?`. **States:** default / non-veg-followup / jain / searching-allergens.
- **Data:** `user_diet_rules`, `re_user_household_profiles`. **Events:** `setDiet`, `setEgg`, `setFasting`, `setAllergens`, `setCadence`.
- **Analytics:** `ob_diet_set`, `ob_allergies_set`, `ob_fasting_set`. **Errors:** allergen search miss → free-add flagged.
- **Tests:** allergens stored as **integer IDs**; non-veg shows cadence; Jain/veg gate non-veg everywhere (hard constraint).

### B13. Cook capability selector (`RECookSelect`)
- **Props:** `value:CookDependency`, `timePressure`. **States:** default / selected. **Data:** `re_user_household_profiles`.
- **Events:** `setCook`, `setTimePressure`. **Analytics:** `ob_cook_dependency_set`, `ob_time_pressure_set`.
- **Errors:** none. **Tests:** maps to cook overlay persona candidate; default `self_cook`.

### B14. Swap bottom sheet (`RESwapSheet`)
- **Props:** `slot`, `classCode`, `secondaryClass?`, `tertiaryClass?`. **States:** loading / same-style tab / different-style tab / broader / empty.
- **Data:** within-class dishes (`re_class_dish_options`) → secondary/tertiary classes (`re_weekly_class_plans`). **Events:** `selectDish`, `selectClass`.
- **Analytics:** `meal_swapped{from,to,tier}`, emits `ACCEPT`/`SWIPE_PAST`. **Errors:** empty pool → class-only + safe fallback.
- **Tests:** **never offers a dish outside the chosen class** (class-first invariant); diet filter applied before display; "same style" vs "different style" separation.

### B15. Dish candidate carousel (`REDishCarousel`)
- **Props:** `slot`, `candidates:REDishCandidate[]`, `topN`. **States:** loading / ready / end-of-list.
- **Data:** `fetchTodayDishCandidates`. **Events:** `accept`, `swipePast`, `details`.
- **Analytics:** `meal_card_seen` per impression. **Errors:** empty → "options coming soon".
- **Tests:** ranked order preserved; all candidates share `meal_class_code`; variety penalty reflected.

### B16. Lock / Not-today / Never controls (`REMealControls`)
- **Props:** `slot`, `locked`, `onLock/onNotToday/onNever`. **States:** default / locked / cooldown(not-today) / never-confirm.
- **Data:** feedback state. **Events:** `LOCK`, `NOT_TODAY`, `NEVER`, `NEVER_REMOVE` (via `submitFeedback`).
- **Analytics:** `meal_locked`, `meal_swiped_not_today`, `meal_never`. **Errors:** signal write fail → undo snackbar + retry.
- **Tests:** Never requires confirm + is reversible; Not-Today sets 3-day cooldown; button fallback for every gesture.

### B17. Grocery action (`REGroceryAction`)
- **Props:** `dishOptionId`, `inList`. **States:** add / added. **Data:** grocery list. **Events:** `addToGrocery` (`ADD_TO_GROCERY` +0.35).
- **Analytics:** `grocery_added`. **Errors:** offline → queue. **Tests:** toggles state; emits signal once.

### B18. Loading skeleton (`RESkeleton`)
- **Props:** `variant:card|cell|deck`. **States:** shimmering. **Data:** none. **Events:** none. **Analytics:** none.
- **Errors:** n/a. **Tests:** food-shaped placeholders, never blank white; reduced-motion → static placeholder.

### B19. Empty state (`REEmptyState`)
- **Props:** `kind:no-plan|no-candidate|no-addon|skipped`. **States:** per kind. **Data:** context. **Events:** primary CTA (e.g. `generatePlan`).
- **Analytics:** `empty_state_shown{kind}`. **Errors:** n/a. **Tests:** each kind shows a kind next step, never a dead end.

### B20. Error state (`REErrorState`)
- **Props:** `code` (DOC-23: MISSING_DIET_MODE / NO_DISH_CANDIDATES / HARD_CONSTRAINT_BLOCK / INVALID_TAXONOMY_VERSION / generation-failed / offline). **States:** per code.
- **Data:** error envelope. **Events:** `retry`, `fixConstraint`. **Analytics:** `error_shown{code}`.
- **Errors:** self. **Tests:** constraint errors **never render excluded food**; retry path; warm non-technical copy.

### B21. Debug RE trace panel (`RETracePanel`) — dev/internal only
- **Props:** `userId`, `enabled:boolean` (build flag). **States:** collapsed / expanded. **Data:** cohort_id, persona_id, overlay_persona_ids, routing_trace, confidence, raw `meal_class_code`s, dish scores.
- **Events:** none (read-only). **Analytics:** none (never in prod). **Errors:** hidden if disabled.
- **Tests:** **never renders in production builds**; only place raw codes/scores are shown.

---

## C. Interaction Rules

1. **Tap** — primary select / open detail; one primary action per surface.
2. **Swipe** — right = keep/accept, left = not-today (meal cards & deck); horizontal rails for browse (carousel/week).
3. **Long press** (`LONG_PRESS_MS 300`) — Never (with confirm), and the dev trace toggle in debug.
4. **Drag** — reorder is **not** offered (class-first plan is engine-owned); drag reserved for sheet dismiss only.
5. **Bottom sheets** — for follow-ups, swap, why-this, examples; lg24 top radius; swipe-down to dismiss; backdrop tap closes.
6. **Undo snackbars** — every destructive/strong action (Never, lock, swap) gets a 5s undo; failed signal writes surface a retry snackbar.
7. **Reduced-motion fallback** — all swipe/lock/spring confirmations degrade to instant state change; no information conveyed only by motion.

Every gesture has a **visible button equivalent** (accessibility-first; nothing gesture-only).

---

## D. Copy Style

1. **Short** — one idea per line; titles ≤ ~6 words.
2. **Warm** — "Let's sort your food, the way home does."
3. **Non-judgmental** — never diet-police or calorie-shame.
4. **Indian household-aware** — familiar dish/meal vocabulary; respects regions, diets, family roles.
5. **No guilt** — skips/rejects are fine; "We'll learn this as we go."
6. **No overpromising** — honest confidence ("smart guesses, your swipes sharpen this"), never fake certainty.
7. **No raw technical terms** (cohort/persona/class codes/scores) in user UI — only in §B21 debug panel.

---

## E. Accessibility (non-negotiable, applies to every component)

1. **Touch size** — ≥48dp all interactive targets (matches existing min).
2. **Contrast** — WCAG AA text on imagery (scrims); accents meet contrast on canvas; verified both light/dark.
3. **Text scaling** — dynamic type; layouts reflow, no clipping; no critical info in tiny fixed sizes.
4. **Screen reader labels** — every card/gesture/add-on/control labeled with state ("Lock lunch, Dal-Roti-Sabzi, locked"); logical reading order; live-region for plan-ready/feedback.
5. **Keyboard navigation (web)** — full tab order, focus rings, Enter/Space activate, Esc closes sheets (RN Web).
6. **Reduced motion** — respect OS setting; instant fallbacks (§C7).
7. **Color-blind-safe states** — locked/never/not-today/weekend differentiated by **icon + label + shape**, never color alone.

---

## F. Engineering Handoff

Folded into each §B entry (Props · States · Data source · Events · Analytics · Error states · Tests). Global handoff rules:
- **Pure-logic first:** label maps, signal mappers, confidence/affinity math live in repositories/utils with **unit tests** (the verifiable layer); components stay presentational.
- **No raw SQL in components** (CLAUDE.md rule 3); all data via `src/repositories/**` and the RE service/resolver (never a specific engine version).
- **Signals only via `submitFeedback`** → resolver (never call a version directly).
- **TypeScript strict**, ≤300 lines/file, structured logs `[RE-UI]`.
- **Two flagged schema/data dependencies** (from weekly spec, carried here): lock-state persistence (additive `locked`) and per-dish protein/Food-DNA tags — components handle their absence gracefully (hide, never fake).

---

*This is the source of truth for RE UI components. Each must use §A tokens, obey §C/§E rules, ship §D copy,
expose the §B/§F handoff contract, and never break class-first / add-on-separation / hard-constraint /
home≠city invariants. Raw RE internals appear only in §B21 debug panel.*
