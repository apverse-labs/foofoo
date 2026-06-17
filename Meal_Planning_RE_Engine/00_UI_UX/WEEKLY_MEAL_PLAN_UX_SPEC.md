# WEEKLY MEAL PLAN UX SPEC
### Foofoo — the "whole week handled, still in control" view (class-first RE)

> Companion to north-star + experience-map + onboarding + home specs. Grounded in DOC-05/06/12/13/14/15/16/17/18/19/23
> + v3 workbook. **No UI built here.**

**Felt goal:** *"The full week is handled, but I'm still in control."*
**Inspiration (principles only, no trade dress):** Netflix rails/discovery · Apple clean overview ·
Instagram visual rhythm · Tasty appetite cards · Tinder quick swap · Noom weekly-habit framing · Zomato familiarity.

**Data source:** `fetchUserWeeklyPlan(userId)` → 7 day rows from `re_user_weekly_plans`
(`day_of_week`, `weekday_weekend`, `breakfast/lunch/snack/dinner_class` + `*_display`, `nonveg_scheduled_slot`,
`cohort_id`, `engine_version`). Per-slot dishes on demand via `fetchTodayDishCandidates`/expansion. Swap pool:
within-class dishes (`re_class_dish_options` by `meal_class_code`) → secondary/tertiary **classes**
(`re_weekly_class_plans.*_secondary_class/*_tertiary_class`). Feedback via `submitFeedback`.

> **Honesty notes (from the parity audit):**
> 1. **Lock state has no DB column yet.** `re_user_weekly_plans` stores no per-slot lock flag (only
>    `re_user_dish_affinity.lock_count` exists at dish level). Full lock UX (§G) needs an **additive**
>    `locked` representation (per-slot column or a small lock table) — flagged as a design dependency, not faked.
> 2. **Protein-type differentiation (fish/chicken/egg) is name-only.** `nonveg_scheduled_slot` says *when*
>    a non-veg/egg slot is scheduled; the specific protein is filtered by diet but not tagged per dish in v3.
>    Visual fish/chicken/egg badges (§I) need a protein tag — degrade gracefully until the DOC-27 tagging pipeline lands.

---

## A. Weekly Overview

1. **Mon → Sun**, ordered, today anchored. Source: 7 `re_user_weekly_plans` rows for the IST week.
2. **B / L / S / D per day** — each cell = the slot's **class** + its top dish (friendly phrasing, §D).
3. **Weekday vs weekend visual difference** — weekend columns (Sat/Sun) get a warmer accent + "special" affordance; reflects DOC-13/14 weekday-quick vs weekend-special cadence (`weekday_weekend` field drives it). Weekdays read calm/efficient, weekends read indulgent.
4. **Today highlighted** — current day column emphasized (subtle ring/elevation), scroll-anchored on open.
5. **Locked meals visible** — lock badge on locked slots; excluded from regenerate (needs lock-state, see honesty note 1).
6. **Add-ons visible but secondary** — a small "+N" pill on cells with member add-ons; never competes with the primary (§H).
7. **Meal-class rhythm preserved internally** — the grid is built from classes; DOC-14 rotation (e.g. same primary class ≤3×/week) is honored by the engine and *felt* as variety, not exposed as rules.

---

## B. View Modes

| Mode | Purpose | Layout | Source |
|---|---|---|---|
| **1. Compact week grid** | 10-second scan of the whole week | 7 columns × 4 slot rows (or 7 rows × 4 on mobile); dish + friendly class micro-label per cell; today + weekend accented | `fetchUserWeeklyPlan` |
| **2. Day detail** | act on one day | the Home day view (HOME_PAGE_UX_SPEC) for the selected day | day slice |
| **3. Meal-slot carousel** | browse one slot across days, or alternatives within a slot | horizontal rail (Netflix-light) of dish options for a slot, within-class first | `fetchTodayDishCandidates` |
| **4. Grocery-prep view** | shop/prep for the week | ingredients aggregated across the week's selected dishes, grouped; ties to `ADD_TO_GROCERY` | grocery aggregation |
| **5. Family member / add-on view** | see the week through a member's lens | filter to one member → their add-on components across the week | `re_user_addon_plans` |

Default = compact week grid; one tap into day detail; swap opens the slot carousel.

---

## C. Card / Cell Hierarchy

Each grid cell (compact) and slot card (day detail) shows, in priority:
- **Dish name** (top candidate) — the headline.
- **Friendly class label** (§D) — quiet sub-label ("Simple green sabzi lunch").
- **Primary / add-on separation** — primary is the cell; add-ons are a muted "+N for family" pill (§H).
- **"Why this week" reason** — one chip (DOC-19 §8): "Weekday quick", "Weekend special", "Your regular".
- **Quick actions** — swap · lock · details · grocery (gesture + button fallback). Compact cell shows swap+lock; full set in day detail.

Class shown as a friendly phrase, never a raw code (default). Class-first is *structurally* present (swap respects it) but never loud.

---

## D. Meal-Class Phrasing (raw codes hidden by default)

Friendly labels come from `re_user_weekly_plans.*_display` (stored at generation) or `deriveMealClassDisplayName()`
(strips BF_/LD_/SN_/DN_ prefix, title-cases). A curated friendly-phrase map refines the auto-derived label.

| Raw class (example) | Friendly label |
|---|---|
| `LD_SIMPLE_GREEN_VEG_SABZI` | "Simple green sabzi lunch" |
| `BF_STUFFED_FLATBREAD` | "Stuffed paratha-style breakfast" |
| `DN_KHICHDI_SOUP` / `LD_LIGHT_KHICHDI` | "Light khichdi dinner" |
| `LD_CHICKEN_HOME_CURRY` | "Home-style chicken curry lunch" |
| `ADD_INFANT_6M_DAL_KHICHDI` | "Soft baby meal add-on" |

**Rule:** raw `meal_class_code` appears only in a hidden **dev/debug** overlay (e.g. long-press in debug build),
never in the default user UI. A friendly-phrase lookup table is maintained alongside `re_meal_classes`
(governed via DOC-27) so labels stay canonical and human.

---

## E. Weekly Balance Explanation (lightweight insights)

A small "Your week at a glance" strip — a few earned, plain-language insights derived from the week's classes
+ DOC-14/15 patterns. Noom-style encouragement, never lecturing:

- "2 light dinners this week 🌙" (count of light-dinner classes)
- "Weekend special planned 🎉" (weekend-special class present)
- "Fish twice, as your family likes" (from `nonveg_scheduled_slot` + non-veg cadence prior — protein label only when taggable, honesty note 2)
- "Baby-friendly sides added on weekdays" (add-on presence)
- "Kept it cook-friendly Mon–Fri" (cook_dependency + weekday_time_pressure → quick classes)

Insights are read-only, derived, dismissible; max ~3; never imply the user must change anything.

---

## F. Swap UX (class-first, cannot create mismatch)

Tapping **Swap** on a slot opens the slot carousel with a strict, class-respecting order:

1. **Same style (within class)** — dishes from the slot's `meal_class_code` (`re_class_dish_options`), reranked by DOC-19. *Default tab.* (e.g. swap bhindi → lauki, both in "Simple green sabzi".)
2. **Similar style (secondary/tertiary class)** — the slot's `*_secondary_class` / `*_tertiary_class` from the weekly matrix → expand those to dishes. Labeled "Try a different style". Still canonical classes, never arbitrary.
3. **Broader alternatives** — other diet-valid classes for that slot from the cohort's pool, last and clearly separated.
4. **Never mixes class incorrectly** — every option carries its class; selecting a dish always sets a valid (dish ∈ class) pair. UI cannot construct a dish from a class it doesn't belong to (mirrors DB invariant: 0 dishes in >1 class).
5. **Two clear intents:** "**Same style**" (stay in class, vary the dish) vs "**Try different style**" (change the class) — presented as distinct tabs/sections so the user always knows whether they're changing the dish or the meal type.

Selecting emits `ACCEPT` for the chosen + `SWIPE_PAST` for skipped (feedback loop). Hard constraints (diet/allergy/Jain/fasting) filter the pool *before* display — excluded items never appear.

---

## G. Lock UX

User can lock at increasing scope (each lock excludes that scope from regenerate/rerank):
- **Single meal** — one slot on one day.
- **Full day** — all 4 slots of a day.
- **Weekend plan** — Sat+Sun.
- **Child / elder add-on** — lock a member's add-on independently of the primary.

Locked items show a clear lock badge + easy unlock. **Design dependency (honesty note 1):** persisting lock
state needs an additive representation — recommended: a `locked` boolean per slot on `re_user_weekly_plans`
(+ a parallel flag on `re_user_addon_plans`), or a lightweight `re_user_plan_locks` table; chosen at
implementation via additive migration (Up+Down, registered). Until then, lock can be client-session only,
which loses cross-device persistence — flagged, not silently shipped.

---

## H. Add-on UX (attached sub-cards, secondary)

Add-ons render as **attached sub-cards beneath the primary**, member-named, muted, framed as care
(consistent with HOME_PAGE_UX_SPEC §E):
- "For baby" · "For diabetic elder" · "For fitness goal" · "For postpartum recovery"
- Source `re_user_addon_plans` (`target_member_segment`, `addon_class_name`, `attached_to_primary_class`).
- In the compact grid: a "+N" pill; in day detail / member view: full attached sub-cards.
- Accept/reject per add-on → add-on relevance metric by member.
- Never replaces the family meal; whole-household exception (elderly-only) → soft class is primary, no add-on framing.

---

## I. Non-Veg UX

For non-veg households (DOC-15 cadence, state-prior), keep it natural and non-judgmental:
- **Cadence shown naturally** — the week simply *contains* the household's non-veg rhythm (from `nonveg_scheduled_slot` + cohort cadence); no "non-veg counter" or quota UI.
- **Weekend indulgence visible** — Sunday chicken/mutton special surfaces as a weekend highlight (warm accent), matching the family's real pattern.
- **Fish / chicken / egg differentiated** — via small protein affordances **when a protein tag exists** (honesty note 2: not in v3 seed yet → until then, differentiation rides on dish name; no fake badges).
- **Veg days never feel like "missing meals"** — veg days are full, appetizing meals in their own right (Tasty visuals), framed positively ("a lighter veg day"), never as the absence of non-veg.
- **Diet hard constraints absolute** — veg/Jain/egg households never see non-veg, regardless of state prior.

---

## J. Empty / Error States

| State | Trigger | Experience | System |
|---|---|---|---|
| **No weekly plan** | no rows for week | "Let's build this week" CTA | `generateWeeklyPlan` |
| **Missing meal slot** | a slot null in a day row | show the day with that slot as "—, tap to add"; never a broken grid | flag |
| **No dish candidate for class** | `NO_DISH_CANDIDATES` | cell shows friendly **class label** + "options coming soon" + safe fallback | admin CMS flag |
| **Add-on unavailable** | add-on dish pool empty | add-on sub-card shows class label only ("soft option for baby"), no specific dish; primary unaffected | flag |
| **User rejects too many meals** | many NEVER/SWIPE_PAST in week | "Let's recalibrate your week" → quick re-swipe; widen pool, lean on home/state priors; never empty week | rerank |
| **Conflict with diet/allergy** | `HARD_CONSTRAINT_BLOCK` | guaranteed-safe simple class fills the slot ("kept it safe for your diet"); never show excluded food | safe fallback |
| **Offline** | no network | cached week (read-only) + offline banner; swaps/locks queue | offline cache + sync |

Every state keeps the week scannable and constraint-safe; no dead ends.

---

## K. Acceptance Criteria

1. **Class-first internally** — the week is generated and swapped via classes; dish∈class always holds; class/dish mismatch is structurally impossible in the UI.
2. **Scan the week in < 10 seconds** — compact grid: 7 days × 4 slots, today + weekend accented, dish + friendly class micro-label legible at a glance.
3. **Swap one meal in < 15 seconds** — tap swap → "same style" pool default → pick → done; 2–3 taps, reversible.
4. **Add-ons attached but secondary** — never primary-sized; member-named; collapsible to "+N".
5. **Weekend feels different from weekdays** — visual accent + weekend-special classes vs weekday quick/home-style (DOC-13/14 cadence visible).
6. **UI cannot create class/dish mismatch** — swap always carries the class; pool is class-scoped; hard constraints filter before display (violation target = 0).
7. **Accessible** — ≥48dp targets, contrast on imagery + weekend accents (not color-only), VoiceOver labels per cell/swap/lock/add-on, reduced-motion fallback, offline read.

---

*Every weekly element traces to an §A/§B region or §C field, routes swaps through §F's class-first order,
handles its §J state, and meets §K. Two implementation dependencies are flagged honestly: lock-state
persistence (§G / note 1) and protein-type tagging (§I / note 2) — neither is faked in this spec.*
