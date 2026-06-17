# PRODUCT EXPERIENCE MAP
### Foofoo — Indian Household Meal Decision Assistant (class-first RE)

> Companion to `UX_NORTH_STAR_AND_PRODUCT_PRINCIPLES.md`. Defines the end-to-end experience and ties
> every interaction to the real RE backend (DOC-10/11 onboarding, DOC-13 plan, DOC-19 scoring, DOC-21
> feedback, DOC-23 API, v3 workbook). No UI implemented — this is the experience blueprint.

**Engine chain reminder:** few answers → household profile → cohort/persona + overlays → 7-day
class-first plan → member add-ons → class→dish expansion → Food DNA ranking → feedback loop.
Routing rules R01–R08 drive onboarding; the user only ever answers natural questions.

---

## A. First-Time User Journey

| # | Stage | What the user sees / does | Backend wired | Emotional goal |
|---|---|---|---|---|
| A1 | **Welcome** | One warm full-bleed food moment + a single line of promise. One CTA: "Let's set up your kitchen." No sign-up wall in the way of the value pitch. | — | curiosity, warmth |
| A2 | **Trust promise (fast)** | 3 micro-cards swiped/auto: *"Your home food, sorted daily" · "We respect your diet & family" · "~1 minute, skip anything."* Sets expectation: short, respectful, Indian. | — | safety, low-pressure |
| A3 | **Household identification** | 5 main-cohort cards (R01 → `main_cohort_id`), then sub-cohort chips (R02 → `persona_id`). Never the 41 backend personas. | `saveREMainCohort`, `saveRESubcohort` (→ `re_user_household_profiles`) | "this is about *my* setup" |
| A4 | **Dynamic questions** | Only relevant branches appear (R03 members, R04 health scope, R05 cook+time-pressure, R06 diet/egg/fasting, R07 home_state+current_city). Duolingo-style branching; each skippable. | `saveREHouseholdMembers`, `saveREHealthOverlay`, `saveRECookDependency`, `saveREContractExtras`, `saveRELocation`; `saveREOnboardingStep` after each | "they only ask what matters" |
| A5 | **Preference calibration (swipe)** | ~5 class-level swipes (R08 → `class_affinity_vector`), Tinder-light flicks on meal *classes* (not dishes). Optional. | `saveREClassAffinity` (validated) | playful, effortless |
| A6 | **"We understood your home"** | Read-only mirror: cohort, base persona + overlays, members, diet, avoid-list, home→city, confidence. Edit anything cheaply. | reads `re_user_household_profiles` | recognition, control |
| A7 | **First weekly plan reveal** | Processing beat ("building your week…" showing the real steps) → 7-day class-first plan. Familiar classes lead. | `generateWeeklyPlan(userId, true)` → resolver → `runCohortAssignment` + `generateUserWeeklyPlan` + `generateUserAddonPlan` | "whoa, it's ready & it's *us*" |
| A8 | **Swipe / adjust** | Inline teach: swap-within-class, lock, not-today, never — all reversible, all teaching the model. | `submitFeedback(...)` signals (see §F) | "I can shape this" |
| A9 | **Home handoff** | "Today is sorted" → land on Home day view. Onboarding marked complete. | `completeREOnboarding` (sets `re_engine_version`, audit row) | relief, ritual begins |

Cold-start (DOC-20): any skipped answer lowers confidence, never blocks — A7 still ships a safe, familiar week.

---

## B. Returning User Journey

| # | Stage | Experience | Backend wired |
|---|---|---|---|
| B1 | **Today's plan** | Glanceable day card: Breakfast / Lunch / Snack / Dinner as **classes**, each with the top-ranked dish surfaced + reason chip. <10s to read. | `getTodayView(userId)` → `fetchUserWeeklyPlan` + `fetchTodayDishCandidates` + `fetchTodayAddons` |
| B2 | **Quick swap** | "Show another" reranks dishes **within the same class**; a separate, clearly-different action swaps the *class*. | rerank = `fetchTodayDishCandidates`; swap logs signal |
| B3 | **Lock meal** | Tap lock → slot frozen, no re-suggestion; strongest positive signal. | `LOCK` (+0.40 dish, +0.20 class) |
| B4 | **Add-on visibility** | Primary family meal headline + quiet attached add-on line ("+ soft khichdi for baby"). Collapsible; absent if no special members. | `fetchTodayAddons` / `re_user_addon_plans` |
| B5 | **Weekly overview** | 7×4 grid; weekday vs weekend rhythm visible; locks persisted; tap any cell → that day's slot. | `fetchUserWeeklyPlan` |
| B6 | **Feedback loop** | Every gesture (swipe/lock/not-today/never/tap/grocery) updates affinities in real time; tomorrow reflects it. | `recordFeedback` → `re_user_feedback` + `re_user_dish_affinity` + `re_user_class_affinity` |
| B7 | **Learning indicators** | Soft, honest signals: "Because you keep dal-sabzi", "Getting to know your taste", confidence rising. Never fabricated certainty. | derived from `re_user_class_affinity` / acceptance metrics |

---

## C. Onboarding Emotion (rules)

- **Reduce guilt:** no calorie/weight framing; health overlays are "food suitability", never judgment (DOC-17 scope). Diet is *identity*, not restriction.
- **Avoid "diet app" feeling:** lead with appetite + family, not macros. Health is one optional branch, never the spine.
- **Avoid long forms:** chips/cards/swipes over typing; dynamic branching (R01–R08) so no one sees irrelevant questions; target ≤ ~90s.
- **Make user feel understood:** the A6 mirror reflects *their* state/city/members/diet back in plain words; corrections are one tap.
- **Make Indian household complexity feel easy:** multi-member + diet + region + cook-helper captured through a few warm questions; the engine carries the 41-persona/overlay complexity invisibly.

## D. Home Page Emotion (rules)

- **"Today is sorted."** — one confident answer per slot, decision pre-made; browsing is optional.
- **"This app understands my family."** — add-ons for the baby/elder shown as care; reason chips reflect home/city/history.
- **"I can change things quickly."** — swap/lock/skip are one gesture, instant, reversible; never a settings detour.

## E. Weekly Plan Emotion (rules)

- **"The whole week is under control."** — a calm, readable 7-day rhythm, not a planning chore.
- **"Weekday/weekend rhythm feels realistic."** — weekday quick/home-style, weekend specials/regional — mirrors DOC-13/DOC-14 cadence and the v3 weekday/weekend matrix split.
- **"I can swap without thinking."** — in-class swaps keep coherence; the week never feels fragile to touch.

---

## F. RE Data-Collection Moments (UI interaction → backend signal)

Signals + weights are the real `RE_SIGNAL_WEIGHTS` (DOC-19 history range −0.30..+0.40); class-level deltas
propagate for LOCK/ACCEPT/VIEW/SWIPE_PAST (DOC-21 §10). All via `submitFeedback` → resolver → engine.

| UI interaction | Signal | Dish effect | Class effect | Persistence / behavior |
|---|---|---|---|---|
| Swipe ▶ keep / accept slot | `ACCEPT` | +0.25 | +0.10 | event + affinity; counts as "seen" for variety guard |
| Lock meal | `LOCK` | +0.40 | +0.20 | slot frozen; strongest positive; repeat-tolerance signal |
| Add to grocery | `ADD_TO_GROCERY` | +0.35 | — | strong cooking-intent signal |
| Tap dish → detail | `TAP_RECIPE` | +0.15 | — | interest |
| Dish shown (impression) | `VIEW` | +0.05 | +0.02 | mild positive; impression log |
| Swipe past / skip option | `SWIPE_PAST` | −0.15 | −0.05 | mild reject; decays |
| Not Today | `NOT_TODAY` | −0.30 | — | 3-day cooldown (`not_today_until`); excluded today, returns after |
| Never | `NEVER` | hard | — | `is_never=true`; permanently excluded until removed |
| Undo Never | `NEVER_REMOVE` | clears | — | `is_never=false`, clears cooldown |
| Search / add a dish | (explicit intent) | strong + | + | can override repeat guard (DOC-21 §5) — *backlog signal* |
| Swap (within class) | rerank | — | — | reads candidates; the chosen/declined items emit ACCEPT/SWIPE_PAST |
| Add-on accepted (member) | `ACCEPT` (add-on) | + | — | add-on relevance metric by `target_member_segment` |
| Add-on rejected | `SWIPE_PAST` (add-on) | − | — | demotes that add-on for the member |

Variety guard: dishes accepted/locked within `VARIETY_WINDOW_DAYS` (3) get −0.30 next time, so the week
stays familiar-but-fresh. Cold-start = empty affinity maps → pure base + region/day scoring.

---

## G. Empty / Loading / Error States

Mapped to real engine outcomes + DOC-23 validation codes. Principle: **never a dead end, always a safe, kind next step.**

| State | Trigger | What the user sees | System behavior |
|---|---|---|---|
| **Onboarding incomplete** | user left mid-flow | Resume card: "Pick up where you left off — step N." | `onboarding_step` persisted (`saveREOnboardingStep`); deep-link back |
| **Recommendation generation failed** | `generateWeeklyPlan` throws | Gentle "Couldn't build your week — tap to retry." Never a stack trace. | retry; log to Sentry; keep last good plan if any |
| **No dishes for a class** | `NO_DISH_CANDIDATES` (200 + fallback flag) | Slot shows the **class** with "options coming soon" + a safe fallback dish; flags data gap to admin. | DOC-13 failure handling: class-only + admin CMS flag |
| **Hard-constraint blocks all candidates** | `HARD_CONSTRAINT_BLOCK` (200 + safe fallback) | A guaranteed-safe simple class (khichdi/dal-rice) with "kept it safe for your diet." | never serve excluded/unsafe food (constraint-violation = 0) |
| **DB seed missing / unknown class** | `UNKNOWN_MEAL_CLASS` / no cohort rows | Calm "Setting things up…" + retry; no broken grid. | log; do not render garbage; alert ops |
| **Missing diet mode** | `MISSING_DIET_MODE` (422) | Soft prompt to confirm diet (1 chip) before dishes expand — class preview still allowed. | DOC-23: blocks dish expansion, not class preview |
| **Stale taxonomy version** | `INVALID_TAXONOMY_VERSION` (409) | Silent refresh to active taxonomy; if unrecoverable, "Update Foofoo." | resolver re-fetches active version |
| **User skips many questions** | low confidence (DOC-20) | Plan still ships + "We'll sharpen this as you go" + easy teach prompts. | cold-start safe assumptions; confidence shown honestly |
| **User rejects everything** | many NEVER/SWIPE_PAST | "Let's recalibrate" → quick re-swipe; widen pool, lean harder on state/home priors. | reranking; avoid empty carousels; never blame the user |
| **Offline** | no connectivity | Cached daily plan + offline banner; feedback queued. | existing offline cache + `syncPendingActions` |
| **Loading (normal)** | plan/dishes fetching | Warm skeletons with food-shaped placeholders + blurhash — never blank white. | — |

---

## H. Accessibility (non-negotiable)

- **Large touch targets:** ≥48dp on every interactive element (cards, chips, swap/lock/skip).
- **Readable text:** Inter, dynamic-type aware; no critical info below comfortable sizes; never tiny gray-on-warm.
- **Low cognitive load:** one primary action per screen; classes before dishes; no more than the day's 4 slots at a glance.
- **Clear contrast:** verified ratios on warm food imagery (scrims behind text); info never conveyed by color alone (Never/Not-Today also use icon+label).
- **VoiceOver/TalkBack labels:** every gesture target labeled ("Lock lunch: Dal-Roti-Sabzi"; "Add-on for baby: soft khichdi"); meaningful reading order; state announced (locked/skipped).
- **Reduced-motion fallback:** swipe/lock confirmations degrade to instant state changes; no essential info conveyed only via animation.
- **Bharat reality:** low-end Android, small screens, intermittent network — graceful offline day view; light assets.

---

*Every screen must trace to a stage here, wire its interactions to §F signals, handle its §G states, and meet §H. If an interaction collects no signal and aids no decision, cut it.*
