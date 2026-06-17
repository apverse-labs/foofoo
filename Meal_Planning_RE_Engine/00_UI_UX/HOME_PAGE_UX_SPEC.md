# HOME PAGE UX SPEC
### Foofoo — the daily "today is sorted" moment (class-first RE)

> Companion to north-star + experience-map + onboarding specs. Grounded in DOC-13 (weekday/weekend plan),
> DOC-19 (scoring + explanation tags), DOC-21 (feedback), DOC-23 (`getTodayView`), DOC-26 (analytics),
> v3 workbook. **No UI built here.**

**Felt goal:** *"Today is sorted. This app understands my home. I can change anything quickly."*
**Inspiration (principles only, no trade dress):** Tasty appetite + simple cards · Zomato Indian food energy +
local relevance · Instagram visual hierarchy + light daily moment · Apple calm/polish · Noom supportive nudges.

**Data source:** `getTodayView(userId)` → `{ dayPlan (classes per slot), dishes (ranked candidates per slot),
addons (per-slot member components), weekStart, engineVersion }`. Feedback via `submitFeedback` (signals per
EXPERIENCE_MAP §F). Reason tags from DOC-19 §8.

> **Honesty note (carried from the parity audit):** RE dishes are name-only — the v3 seed has **no per-dish
> cook-time / prep-difficulty / Food DNA**. Card fields that need that metadata are marked **[needs dish
> metadata — not in v3 seed]** and must degrade gracefully (hidden until the DOC-27 tagging pipeline lands),
> never faked. `family_fit` and `why-this` use signals we *do* have (diet, region, cohort, history, class affinity).

---

## A. Today-First Layout (top → bottom)

1. **Greeting + context band** — time-aware, warm: "Good morning, Ankit ☀️" + one context line (city/day/weather if available). e.g. "Tuesday in Mumbai · a busy weekday, kept simple." Sets the "we know your home" tone. *(weather only if `weather_cache` available; else omit, never fake.)*
2. **Today's meal timeline** — a slim horizontal rail of the day's 4 slots (Breakfast · Lunch · Snack · Dinner) with the current/next slot emphasized (Instagram-light "where am I in the day"). Tap a slot → scrolls to its card.
3. **Slot cards (B/L/S/D)** — one card per slot, the day stacked vertically; the *upcoming* slot is hero-sized, others compact. (See §B.)
4. **Primary household meal** — the headline of each card: the **class** + its top-ranked dish (e.g. "Lunch · Dal–Roti–Sabzi → *Bhindi sabzi, dal, roti*").
5. **Add-on components** — a quiet attached strip under the primary, per member (see §E). Absent when no special members.
6. **Reason tag** — one short trust chip per card (DOC-19 §8), e.g. "MP-style, Mumbai weekday pace" / "Quick for a busy day" / "One of your regulars". (See §D.)
7. **Quick actions** — per card: keep/swap/lock/not-today/never/recipe/grocery (gesture + visible button fallback). Global: pull-to-refresh (regenerate unlocked slots), Day↔Week toggle.

Default scroll depth to understand the day = the 4 cards. No feed below; the page **ends** at the day (anti-recipe-feed, §J).

---

## B. Meal Card Design

Each slot card, hero (upcoming) or compact (rest):

| Element | Source | Notes |
|---|---|---|
| **Image / visual area** | dish image (Cloudinary) | Tasty-style appetite; blurhash placeholder, never blank; scrim for text contrast |
| **Meal slot** | slot (B/L/S/D) | small label, top-left |
| **Selected dish** | top `REDishCandidate.dishName` | the headline choice |
| **Underlying meal class** | `dayPlan[slot].display` (class) | shown as a subtle sub-label ("in *Dal–Roti–Sabzi*") — class-first visible but not loud |
| **Prep difficulty** | **[needs dish metadata — not in v3 seed]** | hidden until tagging pipeline; never guessed |
| **Cook-time** | **[needs dish metadata — not in v3 seed]** | hidden until available; could later derive from cook_dependency context |
| **Family fit** | derived: diet-compatible + matches cohort/persona | e.g. "Fits your veg family" — uses signals we have |
| **Add-on badge** | `addons[slot].length > 0` | small "+2 for family" pill → expands §E strip |
| **Confidence / why-this tag** | DOC-19 top signal | one chip; tap → §D sheet |
| **Swipe / replace** | rerank within class | "Show another" / swipe (see §C) → `fetchTodayDishCandidates` next candidate |
| **Lock** | `LOCK` | freezes slot; strongest + signal (+0.40) |
| **Not today** | `NOT_TODAY` | 3-day cooldown; temporary |
| **Never** | `NEVER` | permanent exclude (confirm) |
| **View recipe** | `TAP_RECIPE` | opens detail (+0.15) |
| **Add to grocery** | `ADD_TO_GROCERY` | strong intent (+0.35) |

Compact cards show: image thumb, slot, dish, class sub-label, add-on pill, one action (expand). Hero card shows all.

---

## C. Swipe Interaction (Tinder-light, for meal decisions)

| Gesture | Action | Signal | Result |
|---|---|---|---|
| **Swipe right / Keep** | accept this dish for the slot | `ACCEPT` (+0.25 dish / +0.10 class) | slot confirmed, counts toward variety guard |
| **Swipe left / Not today** | skip just today | `NOT_TODAY` (−0.30, 3-day cooldown) | next candidate slides in |
| **Long-press / Never** | never suggest this dish | `NEVER` (is_never=true) | confirm step ("Remove [dish] for good?"), reversible later |
| **Tap / Details** | open dish detail | `TAP_RECIPE` (+0.15) | recipe/ingredients/why-this |
| **Button fallback** | every gesture has a visible button | same signals | **accessibility-first**: nothing is gesture-only |

**Reconciliation note (existing app):** the MVP gesture map uses long-press-**up**=Not Today / long-press-**down**=Never. The RE home consolidates to **swipe-left=Not Today + long-press=Never** to reduce cognitive load (north-star §3 "one primary action"). This is a deliberate harmonization to flag for review, not a silent divergence. Reanimated transitions confirm the decision (motion = feedback), with reduced-motion fallback to instant state change.

---

## D. "Why this?" Explanation (RE-signal-backed, short, trust-building)

A tap on the reason chip opens a small sheet with **1 headline reason + up to 2 supporting**, drawn from real scoring components (DOC-19). Never machinery, never long.

| Signal | Example copy |
|---|---|
| home_state | "A taste of home — MP-style" |
| current_city | "Easy for a Mumbai weekday" |
| weekday/weekend | "Quick for a busy day" / "Weekend family special" |
| cook capability | "Simple to make today" |
| household member need | "Soft option added for your little one" |
| class preference (affinity) | "You keep coming back to dal-sabzi" |
| Food DNA | **[needs dish metadata]** — omitted until tagging lands |
| weather (if `weather_cache`) | "Warm & comforting for the rain" |
| previous behavior | "One of your regulars" |

Composite example (MP family in Mumbai, Tuesday lunch): **"MP-style lunch with a Mumbai weekday pace"** + "You usually keep dal-sabzi." Headline first; supporting only if it adds trust.

---

## E. Add-on Display (visible, never confusing)

Add-ons render as a **quiet attached strip beneath the primary**, clearly secondary, member-named, framed as care. The family meal is always the headline and is never replaced.

```
DINNER · Dal–Roti–Sabzi
  Dal · Bhindi · Roti                         [primary — full card]
  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  + For Aarav (1 yr): soft dal-rice mash       [add-on chip — muted]
  + For Papa: low-oil lauki side               [add-on chip — muted]
```

- Distinct visual weight: smaller, muted, indented, "+ For [name/segment]" prefix. Never image-dominant like the primary.
- Source: `addons[slot]` (`REAddonComponent`: addonClassName, targetMemberSegment, attachedToPrimaryClass).
- Accept/reject per add-on (small ✓ / ✕) → `ACCEPT` / `SWIPE_PAST` tagged to the member (add-on relevance metric).
- Collapsed by default to a "+2 for family" pill on compact cards; expanded on the hero card.
- Whole-household exception: if the household *is* the segment (elderly-only), the soft class is the **primary** card, no add-on framing.

---

## F. Learning Feedback (subtle, not overdone)

Occasional, earned nudges — **max ~1 per session**, never after every gesture (Noom-supportive, not chatty):

- After a pattern forms: "Learning that your family likes light dinners. 🌙"
- After repeated demotes: "Noted — less paneer-heavy on weekdays."
- On Not-Today: "We'll skip this for now." · On Never: "Got it — removed for good."
- On confidence rising: "Your taste profile's getting sharper."

Rules: derived from `re_user_class_affinity` / acceptance trends; only surface when there's a *real* shift; never guilt, never numbers-shaming; dismissible; never blocks the plan.

---

## G. Home States

| State | Trigger | Experience | System |
|---|---|---|---|
| **Loading recommendations** | `getTodayView` in flight | warm food-shaped skeletons + blurhash; greeting renders first | — |
| **No plan yet** | no `re_user_weekly_plans` for week | "Let's build your week" CTA → onboarding/generate | `generateWeeklyPlan` |
| **Plan generation failed** | engine throws | "Couldn't load today — tap to retry"; keep last good plan if cached | retry + Sentry |
| **Skipped onboarding** | low confidence profile | plan still shows + gentle "Help us sharpen this" teach prompt | cold-start (DOC-20) |
| **No dish candidates for class** | `NO_DISH_CANDIDATES` | card shows the **class** + "great options coming soon" + 1 safe fallback dish | admin CMS flag |
| **Add-on unavailable** | add-on dish pool empty | show add-on class label only ("soft option for baby") without a specific dish; never block primary | flag |
| **Network failure** | offline | cached day plan + offline banner; feedback queued | offline cache + `syncPendingActions` |
| **Locked meal** | user locked slot | lock badge; slot excluded from refresh/rerank; calm "locked" affordance to unlock | — |
| **Refreshing unlocked meals** | pull-to-refresh | locked slots stay; unlocked slots rerank with a soft shimmer | `fetchTodayDishCandidates` per unlocked slot |

Principle: every state is a kind next step, never a dead end; constraint-safe fallback always available.

---

## H. Visual System (tokens from `src/config/constants.ts`)

- **Layout grid:** single-column, content-max width; 4 stacked slot cards; hero (upcoming) ~1.4× compact height. Day↔Week toggle in header. Safe-area + bottom tab aware.
- **Spacing:** SPACING scale — xs4 / sm8 / md16 / lg24 / xl32 / xxl48. Card padding md16; inter-card gap lg24; generous breathing room (Apple calm).
- **Type hierarchy:** Inter. Greeting ~22–24 semibold; dish name ~18 semibold (the hero); class sub-label ~13 regular textSecondary; reason chip ~12; add-on ~13 muted. Dynamic-type aware.
- **Image style:** food-forward, warm, natural light (Tasty/Zomato energy); 16:9 or 4:3 hero, square thumb on compact; blurhash placeholder; subtle bottom scrim for legibility; never blank white.
- **Chip style:** pill, BORDER_RADIUS.full; reason chip = soft green-tint (primary @ low alpha); add-on chip = neutral/muted; status chips (locked/skipped) use icon+label (not color alone).
- **Card shape:** BORDER_RADIUS.md16, surface #FFFFFF on background #FAFAF8, soft shadow (low elevation), no harsh borders.
- **Animation:** TIMING — 300ms long-press, ~350ms normal; swipe/lock spring confirmations via Reanimated; pull-to-refresh shimmer; 60fps; **reduced-motion → instant**.
- **Color mood:** deep green #2D6A4F (trust/calm primary), warm orange #FF6B35 (appetite accent, used sparingly for primary actions), warm off-white canvas. Indian warmth via imagery + language, **not** clutter or loud gradients.

---

## I. Analytics (DOC-26)

`home_viewed` · `meal_card_seen{slot,class,dish}` (impression = VIEW) · `meal_locked{dish}` · `meal_swiped_keep{dish}` · `meal_swiped_not_today{dish}` · `meal_never{dish}` · `meal_details_opened{dish}` · `grocery_added{dish}` · `why_this_opened{slot,top_signal}` · `addon_seen{segment,class}` · `addon_accepted{segment}` · `addon_rejected{segment}`.

Plus quality metrics they feed (EXPERIENCE_MAP §11): daily first-suggestion acceptance, carousel depth to accept, time-to-decision, never/not-today rates, add-on acceptance by member.

---

## J. Acceptance Criteria

1. **Understand today in < 5 seconds** — greeting + 4 slot cards, upcoming slot hero, dish + class + reason readable at a glance; no scrolling required to grasp the day.
2. **Replace any meal in one gesture** — swipe-left (not today) or "show another" reranks within class instantly; lock/never one tap; all with button fallback.
3. **Add-ons never look like primary meals** — muted, indented, "+ For [member]", smaller; primary always the visual headline.
4. **Class-first visible but not overwhelming** — class shown as a quiet sub-label / swap unit; the user feels "a sensible meal", not a taxonomy.
5. **Not a recipe feed** — the page ends at the day's 4 slots; discovery/search lives elsewhere; home stays a calm decision surface, not an infinite scroll.
6. **Constraint-safe always** — no slot ever shows food violating diet/allergy/Jain/fasting; fallback states keep this invariant (violation target = 0).
7. **Accessible** — ≥48dp targets, contrast on imagery, VoiceOver labels per card/gesture/add-on, reduced-motion fallback, offline day view.

---

*Every home element traces to a §B card field or §A region, wires gestures to §C/§F signals, handles its §G state, and meets §H + §J. If an element neither aids today's decision nor teaches the model, cut it.*
