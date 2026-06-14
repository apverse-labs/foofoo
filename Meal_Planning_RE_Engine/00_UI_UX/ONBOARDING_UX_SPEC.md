# ONBOARDING UX SPEC
### Foofoo — Dynamic, class-first household onboarding

> Companion to `UX_NORTH_STAR_AND_PRODUCT_PRINCIPLES.md` + `PRODUCT_EXPERIENCE_MAP.md`.
> Grounded in DOC-03/04/09/10/11/16/17/18/20 + the v3 workbook. Implements routing rules R01–R08,
> the DOC-10 18-field contract, and the DOC-03 §6 confidence model. **No UI built here.**

**Feel target:** quick as Netflix · dynamic as Duolingo · warm as Noom · swipe-light as Tinder ·
polished as Apple · food-familiar as Zomato/Tasty — **principles only, no trade dress copied.**

**Hard rules honored:** ≤5 user-facing cohorts (never the 41 personas) · dynamic branching · high-signal
only · class-level + household-reality capture · `home_state` ≠ `current_city` · cook dependency ·
health/lifecycle overlays · diet/religion/allergy as safe hard constraints · swipes over forms ·
skip allowed but confidence stored · "we understood your home" before first plan.

**Backend targets (real):** `re_user_household_profiles` (main_cohort_id, sub_cohort_id, persona_id,
overlay_persona_ids[], nonveg_mode, egg_allowed, fasting_pattern, cook_dependency, health_overlay_code,
health_scope, city_destination_group, city_tier, migration_overlay, weekday_time_pressure,
class_affinity_vector, confidence, routing_trace) · `profiles` (home_state, current_city, food_pref,
onboarding_step) · `user_diet_rules.excluded_ingredients` (int IDs) · `household_members`.
Repo fns: `saveREMainCohort/saveRESubcohort/saveREHouseholdMembers/saveRELocation/saveREDietPrefs/
saveRECookDependency/saveREHealthOverlay/saveREContractExtras/saveREClassAffinity/saveREOnboardingStep`
→ `runCohortAssignment` → `generateWeeklyPlan`.

---

## Confidence model (drives §5: fewer questions when already confident)
- **Base** on cohort+sub-cohort selected: 0.70.
- **+** explicit health/cook/diet/swipe answers raise it (≈+0.04..+0.10 each, per BUILD-03 logic).
- **−** each skipped high-signal screen lowers it (cold-start, DOC-20); never blocks.
- When running confidence ≥ ~0.85 after core screens, **optional screens (weekend, swipe) auto-collapse to a single "looks right?" confirm** — Netflix-fast for simple households.

---

## A / B. Screen-by-Screen Flow (covers all 14 required screens)

> Each screen lists: ID · purpose · title · subtitle · input · options · dynamic branch · backend fields ·
> confidence impact · skip behavior · error state · analytics event. Final microcopy is inline (satisfies §E).

### OB-00 · Welcome / promise
- **Purpose:** set expectation (short, respectful, Indian, food-first); no value-blocking sign-up.
- **Title:** "Let's sort your food, the way home does."
- **Subtitle:** "A daily plan for *your* family — your state, your city, your rules. About a minute."
- **Input:** single CTA + 3 auto/swipe promise micro-cards.
- **Options:** "Set up my kitchen" · (promise cards: "Your home food, daily" / "We respect your diet & family" / "Skip anything, anytime").
- **Branch:** → OB-01.
- **Backend:** none.
- **Confidence:** n/a. **Skip:** n/a (CTA required to proceed). **Error:** none.
- **Analytics:** `onboarding_started`.

### OB-01 · Who are we planning for? (R01 → R02)
- **Purpose:** main cohort, then sub-cohort → base persona. Never expose 41 personas.
- **Title:** "Who's eating at home?"
- **Subtitle:** "Pick what fits best — we'll fine-tune next."
- **Input:** 5 large cards (main cohort) → sub-cohort chips for the chosen card.
- **Options (cards, MC1–MC5):** "Just me / shared adults" · "Couple" · "Family with children" · "Joint family / elders / care" · "Special goal or kitchen style".
  Sub-chips drawn from `re_subcohorts` for the chosen MC (e.g. Family→ toddler / school kids / teens / picky eater / budget / home-maker).
- **Branch:** sub-cohort selection determines whether OB-03 (members), OB-08 (health) appear (see §D). `requiresMemberStep(subCohortId)` gates OB-03.
- **Backend:** `main_cohort_id` (R01), `sub_cohort_id` + derived `persona_id` (R02) → `saveREMainCohort`, `saveRESubcohort`.
- **Confidence:** +0.70 base (explicit sub-cohort).
- **Skip:** can't skip main cohort (it's the spine); sub-cohort defaults to the MC's safest persona if dismissed (lower confidence).
- **Error:** sub-cohorts fail to load → retry; never empty grid.
- **Analytics:** `ob_main_cohort_selected{mc}`, `ob_subcohort_selected{sc,persona}`.

### OB-02 · (folded into OB-01 sub-cohort step — kept as the R02 chip screen)
*Implementation note: OB-01 and OB-02 are one continuous card→chip motion; documented as the R01/R02 pair.*

### OB-03 · Household members  (R03 → member_segments[])
- **Purpose:** capture real members needing their own component (multi-member loop).
- **Title:** "Anyone with their own food needs?"
- **Subtitle:** "We'll add a little something for them — your main meal stays the family meal."
- **Input:** add-member chips + "add another" loop; each member picks segment (+ age band if relevant).
- **Options:** baby 6–18m · toddler · school child · teen · elderly · pregnant · postpartum · recovery · "just us adults".
- **Branch:** only shown if sub-cohort/main cohort implies dependents (R03); selecting diabetic/elderly/pregnant pre-arms OB-08.
- **Backend:** `household_members[]` (segment, age_band) → `saveREHouseholdMembers`; sets add-on requirement + overlay candidates.
- **Confidence:** +0.06 (each explicit member). **Skip:** "just us adults" → no add-ons (valid, full confidence for that fact).
- **Error:** none (local list).
- **Analytics:** `ob_member_added{segment}`, `ob_members_done{count}`.

### OB-04 · Home state  (R07a → native food identity)
- **Purpose:** `home_state` = regional staples/home-style classes. Kept separate from city.
- **Title:** "Where's home?"
- **Subtitle:** "The food you grew up with — your roots on the plate."
- **Input:** searchable state/UT picker (36 from `re_states`), recent/popular surfaced.
- **Options:** 36 states/UTs.
- **Branch:** none (always asked).
- **Backend:** `profiles.home_state` → `saveRELocation`; feeds `state_id` → cohort_id + region archetype.
- **Confidence:** +0.05. **Skip:** allowed → region defaults to national/cold-start prior (lower confidence).
- **Error:** no match → free-type + "we'll map it"; never block.
- **Analytics:** `ob_home_state_set{state_id}`.

### OB-05 · Current city  (R07b → lifestyle / migration overlay)
- **Purpose:** `current_city` = lifestyle, time-pressure, availability, migration blend. **Never merged with home_state.**
- **Title:** "And where do you live now?"
- **Subtitle:** "City life shapes weekday meals — we blend it with your home food."
- **Input:** searchable city picker (maps to destination group).
- **Options:** metro/tier groups (Mumbai-Pune, Delhi NCR, Bengaluru-Hyd-Chennai, Kolkata-East, Ahmedabad-Surat, Goa-coastal, home-state T1/T2, PG/hostel).
- **Branch:** if city ≠ home-state city → migration overlay (P28) armed; affirm "your food, where you live now."
- **Backend:** `profiles.current_city` → `city_destination_group`, `city_tier`, `migration_overlay` (resolved by `runCohortAssignment`/`resolveCityDestinationGroup`).
- **Confidence:** +0.05. **Skip:** allowed → home-state T2 baseline (DOC-13 failure handling).
- **Error:** unknown city → `PAN_INDIA_PG_HOSTEL` fallback (still ships).
- **Analytics:** `ob_current_city_set{group}`.

### OB-06 · Food constraints (R06 → diet/religion/allergy/fasting — SAFE hard constraints)
- **Purpose:** capture hard constraints correctly (DOC-18). Never guessed.
- **Title:** "Your food rules."
- **Subtitle:** "We'll never suggest anything that breaks these."
- **Input:** diet chips → conditional follow-ups (egg toggle, non-veg cadence + proteins, fasting pattern) → allergy chips + search.
- **Options:** Veg · Vegan · Jain · Egg-only · Non-veg | egg allowed? Y/N | fasting: none/weekly/seasonal | allergies: peanut, tree-nut, shellfish, gluten, soy, dairy, none + search.
- **Branch:** non-veg → cadence + protein-type follow-up (state prior pre-fills); Jain → no-root affirmation; fasting → pattern.
- **Backend:** `food_pref` + `user_diet_rules.excluded_ingredients[]` (int IDs) via `saveREDietPrefs`; `nonveg_mode` (`deriveNonvegMode`), `egg_allowed`, `fasting_pattern` via `saveREContractExtras`.
- **Confidence:** +0.10 (hard constraints are highest-value). **Skip:** diet **strongly encouraged**; if skipped → `MISSING_DIET_MODE` soft gate later (class preview ok, dish expansion deferred).
- **Error:** allergy search miss → free-add flagged for mapping.
- **Analytics:** `ob_diet_set{mode}`, `ob_allergies_set{count}`, `ob_fasting_set{pattern}`.

### OB-07 · Cook / kitchen reality (R05 → cook_capability)
- **Purpose:** execution complexity + who cooks (DOC-16). Not a cuisine preference.
- **Title:** "How does cooking happen at home?"
- **Subtitle:** "So we suggest meals you can actually make on a given day."
- **Input:** single-select chips.
- **Options:** I cook myself · skilled cook/maid · cook needs simple steps · tiffin/PG · mostly order in.
- **Branch:** cook-assisted → cook overlay persona (P22–P25); pairs with OB-09 time pressure.
- **Backend:** `cook_dependency` → `saveRECookDependency` (overlay candidate).
- **Confidence:** +0.04. **Skip:** default `self_cook` (medium confidence).
- **Error:** none.
- **Analytics:** `ob_cook_dependency_set{value}`.

### OB-08 · Health / lifestyle needs (R04 → health overlay + scope)
- **Purpose:** optional health overlay, **scoped** so it never converts the whole family to diet food (DOC-17).
- **Title:** "Any health focus we should respect?"
- **Subtitle:** "For one member or the whole home — your call. (Food suitability, not medical advice.)"
- **Input:** overlay chips + scope toggle (one member / whole household).
- **Options:** diabetic/low-GI · BP/heart · weight goal · fitness/protein · pregnancy · none.
- **Branch:** one-member → swap/add-on overlay (e.g. P15/P16); whole-household → health classes may enter primary rotation. Pre-armed if OB-03 had diabetic/elder/pregnant.
- **Backend:** `health_overlay_code` + `health_scope` → `saveREHealthOverlay`; adds to `overlay_persona_ids[]`.
- **Confidence:** +0.08. **Skip:** "none" is a valid full-confidence answer.
- **Error:** none.
- **Analytics:** `ob_health_overlay_set{code,scope}`.

### OB-09 · Weekday reality (→ weekday_time_pressure)
- **Purpose:** weekday time pressure (DOC-16) → quick vs elaborate weekday classes.
- **Title:** "Weekdays — how much time for cooking?"
- **Subtitle:** "Be honest, we won't judge a busy week."
- **Input:** 3-stop selector.
- **Options:** Relaxed · Busy · Very time-starved.
- **Branch:** very time-starved + cook-dependent → lean to quick/one-pot/tiffin classes.
- **Backend:** `weekday_time_pressure` → `saveREContractExtras`.
- **Confidence:** +0.04. **Skip:** default "Busy" (typical urban prior).
- **Error:** none. **Analytics:** `ob_time_pressure_set{value}`.

### OB-10 · Weekend pattern (→ weekend rhythm signal)
- **Purpose:** weekday/weekend differentiation (DOC-13/14): indulgent vs light weekends.
- **Title:** "Weekends — special or simple?"
- **Subtitle:** "Sunday biryani family or keep-it-light family?"
- **Input:** 2–3 chips.
- **Options:** Weekend specials/indulgence · About the same · Lighter on weekends.
- **Branch:** "specials" seeds positive affinity for weekend-special classes; "lighter" demotes them.
- **Backend:** seeds `class_affinity_vector` for weekend-special classes (no dedicated column → faithful soft-signal mapping); informs weekend pool selection.
- **Confidence:** +0.03. **Skip:** default "about the same" (cohort weekend pool unchanged).
- **Error:** none. **Analytics:** `ob_weekend_pattern_set{value}`.

### OB-11 · Swipe calibration (R08 → class_affinity_vector)
- **Purpose:** class-level taste calibration via meal-CLASS cards (not aspirational dishes). See §C.
- **Title:** "Quick taste check."
- **Subtitle:** "React to a few meal styles — this teaches Foofoo your rhythm."
- **Input:** card stack, swipe + tap.
- **Options/interactions:** see §C.
- **Branch:** optional; **auto-collapses to a single confirm if confidence already ≥ ~0.85**.
- **Backend:** `class_affinity_vector` (validated by `isValidClassAffinityVector`) → `saveREClassAffinity`.
- **Confidence:** +0.05 (and sharpens dish ranking via DOC-19 class_affinity term). **Skip:** allowed → cold-start neutral affinities.
- **Error:** none (local). **Analytics:** `ob_swipe_recorded{class,reaction}`, `ob_swipes_done{count}`.

### OB-12 · "Here's what we understood" (confirmation / reveal-before-plan)
- **Purpose:** mirror the profile back in plain words; cheap correction; trust.
- **Title:** "Here's your home, the way we understood it."
- **Subtitle:** "Tap anything to fix it."
- **Input:** read-only summary card with edit affordances + confidence meter.
- **Options:** confirm → generate · edit any line → jumps to that screen.
- **Branch:** none.
- **Backend:** reads `re_user_household_profiles` (+ derived overlays/confidence/routing_trace).
- **Confidence:** displayed honestly (high/medium/learning).
- **Skip:** confirm is the action; can't skip the mirror.
- **Error:** none. **Analytics:** `ob_summary_viewed{confidence}`, `ob_summary_edited{field}`.

### OB-13 · First plan generation (loading)
- **Purpose:** turn the wait into a confidence beat showing the real engine steps.
- **Title:** "Building your week…"
- **Subtitle:** rotating: "Reading your home flavours…" → "Planning 7 days of meals…" → "Adding bits for the little one / elders…".
- **Input:** none (progress).
- **Backend:** `completeREOnboarding` → `generateWeeklyPlan(userId, true)` → `runCohortAssignment` + `generateUserWeeklyPlan` + `generateUserAddonPlan`.
- **Confidence:** n/a. **Skip:** n/a.
- **Error:** generation fails → kind retry (PRODUCT_EXPERIENCE_MAP §G); cold-start still ships a safe week.
- **Analytics:** `ob_plan_generation_started`, `ob_plan_generation_succeeded{ms}` / `_failed`.

### OB-14 · First weekly plan reveal
- **Purpose:** the payoff — class-first 7-day plan, familiar classes leading, add-ons shown as care.
- **Title:** "Your week's sorted. 🌿"
- **Subtitle:** "Tap any meal to see options, lock favourites, or swap."
- **Input:** day view + inline teach (swap/lock/not-today/never).
- **Backend:** `getTodayView` / `fetchUserWeeklyPlan`; feedback via `submitFeedback` (signals in EXPERIENCE_MAP §F).
- **Confidence:** n/a. **Skip:** → Home.
- **Error:** empty class → class-only + "options coming soon" (NO_DISH_CANDIDATES).
- **Analytics:** `ob_completed`, `first_plan_revealed`, then home/feedback events.

---

## C. Swipe Calibration (class-level, not aspirational dishes)

A light card stack of **meal-CLASS examples** (the engine's unit), each with a one-line plain description
and a "tap for examples" peek. Reacting teaches `class_affinity_vector` keyed by `re_meal_classes` codes.

**Example cards (class → friendly label):**
| Card label | Backing class (example) |
|---|---|
| "Simple green sabzi + dal + roti" | LD_SIMPLE_GREEN_VEG_SABZI / LD_DAL_ROTI_SABZI |
| "Stuffed paratha breakfast" | BF_STUFFED_FLATBREAD |
| "Light khichdi dinner" | DN_KHICHDI_SOUP / LD_LIGHT_KHICHDI |
| "Weekend chicken curry" | LD_CHICKEN_HOME_CURRY (only if diet allows) |
| "Poha / upma weekday breakfast" | BF_POHA_CHIVDA_LIGHT / BF_UPMA_DALIA_SEVAI |
| "Paneer-rich restaurant-style meal" | LD_PANEER_RICH_GRAVY |

**Card selection rule:** only show classes valid for the user's diet/region so far (no chicken card to a
Jain user — respects hard constraints even during calibration). 5–8 cards max; weighted toward the
user's state pools + a couple of contrast cards to separate signal.

**Interactions → signal (seeds class_affinity_vector value in [−1, 1]):**
| Gesture | Meaning | Affinity delta |
|---|---|---|
| Swipe right / **Like** | "yes, us" | +0.6 |
| **More like this** (double-tap / up) | strong yes | +1.0 |
| **Sometimes** (tap middle) | occasional | +0.2 |
| Swipe left / **Not for us** | rarely | −0.4 |
| **Never** (long-press down) | exclude class from primary rotation | −1.0 (hard-ish; respects overlap guard) |
| **Tap for examples** | reveals 2–3 dish examples in a peek sheet | logs `VIEW`-like interest, no commitment |

Reactions are reversible; the deck is short and feels like play, never a quiz. Skipping the whole deck =
neutral affinities + cold-start (lower confidence, still ships).

---

## D. Dynamic Branching Examples

| # | Household | Screens shown | Key captures / overlays |
|---|---|---|---|
| 1 | **Single user** | OB-01(MC1)→04→05→06→07→09→11→12 | persona P01-P03/P37/P28/P39; no members, no health unless chosen; fast path |
| 2 | **Couple** | MC2 + 04→05→06→07→09→10→11 | DINK/newly-married persona; no add-ons |
| 3 | **Couple with infant** | MC2→SC2E/F, **OB-03 (baby_6_18m)** → 04→05→06→07→08→09→11 | infant add-on armed; lactation overlay if postpartum |
| 4 | **Family with toddler** | MC3→SC3A, **OB-03 (toddler)** → ... | toddler mild add-on; child-growth overlay optional |
| 5 | **Family with child + elderly** | MC4→SC4F (P41), **OB-03 (school_child + elderly)** → **OB-08** | two add-ons (child + elderly soft); composite persona + overlays |
| 6 | **Diabetic elder overlay** | MC4 + OB-03(elderly) → **OB-08 (diabetic, scope=one member)** | health add-on (P15), low-GI swap; family meal unchanged |
| 7 | **Pregnancy / postpartum** | MC2→SC2C/D + **OB-08 (pregnancy)** | pregnancy/postpartum add-on; safe-food hard flags |
| 8 | **Fitness-focused** | MC5→SC5B + OB-06(egg/protein) + **OB-08 (fitness)** | high-protein overlay (P18); protein-forward classes |
| 9 | **Cook-dependent working household** | + **OB-07 (skilled cook/maid)** + **OB-09 (very time-starved)** | cook overlay (P24/P25); batch/quick classes |
| 10 | **Non-veg household** | OB-06 → non-veg → cadence + proteins | `nonveg_mode=regular/occasional`; state-prior cadence (DOC-15) |
| 11 | **Jain household** | OB-06 → Jain | hard no-root/onion-garlic; calibration hides non-Jain cards |

Rule: **fewer screens when confidence is already high** — a simple single veg user in their home city
can reach OB-12 in ~6 taps; complex MC4 composite households branch through members + health without clutter.

---

## E. Copywriting (tone + microcopy)

**Voice:** warm, clear, Indian-household-aware, non-judgmental, slightly delightful, never childish.
Final per-screen titles/subtitles are inline in §A. Cross-cutting microcopy:

- **Skip:** "Skip for now — we'll learn this as we go." (never "you must")
- **Why-we-ask helper:** e.g. home_state → "Your home state decides the *familiar* flavours; your city decides the *daily* rhythm. That's why we ask both."
- **Diet reassurance:** "We'll never suggest anything outside your rules."
- **Health framing:** "Food suitability, not medical advice."
- **Add-on framing:** "A little something for [member] — your family meal stays the same."
- **Confidence (honest):** high → "We've got a great read on your home." · low → "We've made smart guesses — your swipes will sharpen this fast."
- **Reject-everything recovery:** "Let's recalibrate — react to a few more styles?"
- **Encouragement (Noom-like, no guilt):** "Nice — your taste profile is getting sharper."

---

## F. UI Components (inventory; design-system tokens, no copied trade dress)

| Component | Role | Used in |
|---|---|---|
| **Progress pill** | calm % / step dots; never punishing | all screens |
| **Card stack** | main-cohort cards; swipe calibration deck | OB-01, OB-11 |
| **Bottom sheet** | sub-cohort chips, follow-ups (non-veg cadence, examples peek), why-we-ask | OB-01/06/11 |
| **Selectable chips** | sub-cohort, diet, cook, health, time, weekend, allergies | OB-01/03/06/07/08/09/10 |
| **Swipe cards** | class calibration (like/not-for-us/sometimes/never/more) | OB-11 |
| **Family-member chips** | add/edit members + age band loop | OB-03 |
| **City/state search** | typeahead pickers (separate fields) | OB-04, OB-05 |
| **"Why we ask" helper** | tap-to-expand rationale, builds trust | OB-04/05/06/08 |
| **Confidence summary card** | the "we understood your home" mirror + honest confidence meter | OB-12 |

All meet accessibility (≥48dp targets, contrast, VoiceOver labels, reduced-motion) per north-star §10.

---

## G. Backend Mapping (every input → field / persona / overlay / affinity / add-on / constraint / confidence / event)

| Input (screen) | household_profile field | persona/cohort | overlay flag | class affinity | add-on req | hard constraint | confidence | analytics |
|---|---|---|---|---|---|---|---|---|
| Main cohort (OB-01) | main_cohort_id | base persona path | — | — | — | — | +base | ob_main_cohort_selected |
| Sub-cohort (OB-01) | sub_cohort_id, persona_id | base persona | — | — | maybe (member subcohorts) | — | +0 | ob_subcohort_selected |
| Members (OB-03) | (household_members) member_segments[] | — | — | — | **yes** (add-on) | — | +0.06 | ob_member_added |
| Home state (OB-04) | profiles.home_state→state_id | cohort_id state part | — | seeds region pool | — | — | +0.05 | ob_home_state_set |
| Current city (OB-05) | current_city, city_destination_group, city_tier, migration_overlay | cohort_id tier part | **P28 if migrated** | seeds city pool | — | — | +0.05 | ob_current_city_set |
| Diet/egg/fast (OB-06) | nonveg_mode, egg_allowed, fasting_pattern; user_diet_rules.excluded_ingredients[] | — | egg/nonveg/jain mode | — | — | **yes (diet, allergy, Jain, fasting)** | +0.10 | ob_diet_set / ob_allergies_set |
| Cook (OB-07) | cook_dependency | — | **cook overlay P22–25** | — | — | — | +0.04 | ob_cook_dependency_set |
| Health (OB-08) | health_overlay_code, health_scope | — | **health overlay P15/16/17/18** | — | maybe (member add-on) | scope-dependent | +0.08 | ob_health_overlay_set |
| Weekday (OB-09) | weekday_time_pressure | — | — | nudges quick classes | — | — | +0.04 | ob_time_pressure_set |
| Weekend (OB-10) | (→ class_affinity_vector) | — | — | weekend-special classes | — | — | +0.03 | ob_weekend_pattern_set |
| Swipes (OB-11) | class_affinity_vector | — | — | **direct** | — | — | +0.05 | ob_swipe_recorded |
| Confirm (OB-12) | confidence, routing_trace finalized | overlay_persona_ids[] resolved | — | — | — | — | computed | ob_summary_viewed |

`runCohortAssignment` then resolves cohort_id + overlay_persona_ids[] + confidence + routing_trace;
`generateWeeklyPlan` produces the plan + add-ons.

---

## H. Acceptance Criteria

1. **<2 min for simple households** — single/couple veg in home city reaches OB-14 in ~6–8 taps (optional screens auto-collapse at high confidence).
2. **Complex households branch without confusion** — MC4 child+elder+diabetic flows through members + health as guided steps, add-ons framed as care.
3. **User never sees 41 personas** — only 5 cards + relevant sub-cohort chips; personas/overlays stay backend.
4. **Skipped inputs still produce a cold-start profile** — every screen skippable; DOC-20 defaults fill gaps; confidence stored, never blocks.
5. **First plan generates immediately** — on OB-12 confirm, `generateWeeklyPlan` ships a 7-day class-first plan (safe fallback if data-thin).
6. **All required RE fields available or have fallback confidence** — the DOC-10 18-field contract is captured or defaulted; hard constraints (diet/allergy/Jain/fasting) are explicit or soft-gated (`MISSING_DIET_MODE`) before dish expansion; constraint-violation target = 0.
7. **Resume-safe** — `onboarding_step` persisted each screen; a killed session resumes in place.
8. **Class-first respected even in onboarding** — calibration is over classes, never loose dishes; calibration cards honor diet hard constraints.

---

*This spec is the source of truth for the onboarding screens. Implementation must wire each screen to its
§G backend mapping, honor §H acceptance, and never violate class-first / add-on-separation / home≠city /
hard-constraint rules from the north star.*
