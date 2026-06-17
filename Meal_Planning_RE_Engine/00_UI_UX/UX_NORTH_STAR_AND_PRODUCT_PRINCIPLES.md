# UX NORTH STAR & PRODUCT PRINCIPLES
### Foofoo — Indian Household Meal Decision Assistant (class-first RE)

> Scope: the UI/UX layer over the existing class-first Recommendation Engine.
> This document is the design constitution. No screens are built here — it sets the rules every screen must obey.
> Grounded in the canonical v3 system: 5 main cohorts → 41 personas, 131 meal classes, class-first planning,
> member add-ons kept separate, `home_state` ≠ `current_city`, cold-start confidence, and the feedback learning loop.

---

## 1. UX Mission

**Remove the daily "what should we cook?" decision for an Indian household in under 10 seconds a day — and make that answer feel like it was made by someone who knows the family.**

The product's value is the **decision**, not the recipe. Every screen must move the user from *uncertainty* → *a confident, familiar, family-fitting choice*. The RE does the thinking; the UI makes that thinking feel effortless, warm, and trustworthy. If a screen adds cognitive load without adding decision confidence, it does not ship.

---

## 2. Target Emotional Response

In priority order, the user should feel:

1. **"This gets my family."** — recognition: the plan reflects our state, our city life, our kids/elders, our diet rules.
2. **"I don't have to think."** — relief: the hard choice is already made; I'm just confirming or nudging.
3. **"This is food I actually eat."** — familiarity before novelty: dal-roti-sabzi Tuesday, not an aspirational stranger.
4. **"It's learning me."** — quiet competence: my swipes and locks visibly shape tomorrow.
5. **"This is mine, and it's calm."** — a daily ritual that feels personal and unhurried, never a dashboard to manage.

Anti-emotions to avoid: *overwhelm* (too many options), *judgment* (diet-policing/calorie-shaming), *foreignness* (a generic Western meal app), *distrust* (recommendations that ignore stated rules).

---

## 3. Design Principles

1. **Decision-first, not catalog-first.** Default view = one clear suggestion per slot, browsable — never a wall of search results.
2. **Class before dish, visibly.** The week is a rhythm of *meal classes* (the engine's truth); dishes are instances revealed inside a class. The UI must never imply dishes were picked from thin air.
3. **Familiarity is the hook; novelty is the reward.** Lead with high-acceptance, home-style choices; introduce variety gently and earn the right to surprise.
4. **One primary action per screen.** Apple-style restraint: a clear hierarchy, generous space, one obvious next step.
5. **Low-pressure inputs.** Every onboarding/feedback choice is skippable, reversible, and never punishes the user (Duolingo/Netflix calibration, not a form).
6. **Show the "why" softly.** Lightweight reason chips ("A taste of home", "Quick for a busy day") build trust without exposing machinery.
7. **Food is the hero.** Warm, appetite-driven imagery; UI chrome supports, never competes. Never blank boxes — always a graceful placeholder.
8. **Motion with meaning.** Transitions confirm decisions and teach the model (swipe, lock); animation is feedback, not decoration.
9. **Family-shaped, not single-user-shaped.** The model accommodates multiple members and needs; the UI must make "the family meal + a small thing for the little one/elder" feel obvious.
10. **Honest confidence.** When the engine is unsure (cold start, skipped answers), the UI says so gently and offers easy ways to teach it — never fakes certainty.

---

## 4. What Each Inspiration Contributes (principles only)

| Source | Principle we borrow | How it shows up in Foofoo |
|---|---|---|
| **Noom** | Psychology, motivation, gentle framing | Encouraging microcopy; progress framed as "your taste profile is getting sharper", never guilt |
| **Tasty** | Appetite appeal, simple cards | Warm food-forward cards; the dish image dominates; minimal text to decide |
| **Zomato** | Indian cultural familiarity, city/local energy | State/regional vocabulary, city-aware tone, food-first warmth that feels local |
| **Tinder** | Swipe = lightweight preference | Class/dish swipes that feel like a flick, not a form; instant, reversible, low-stakes |
| **Netflix** | Fast taste calibration, recommendation confidence | A few swipes seed a confident first week; "Because you keep dal-sabzi" style framing |
| **Duolingo** | Dynamic onboarding, friendly low-pressure progress | Branching questions, progress feel, "skip for now" always available |
| **Apple** | Simplicity, hierarchy, restraint, motion, a11y | One action per screen; calm spacing; polished, accessible defaults |
| **Instagram** | Visual cards, daily "moment" interactions | The daily plan as a light, glanceable moment; quick taps/swipes |

---

## 5. What Must NOT Be Copied

- **No** replication of any source's exact layout, navigation pattern, component shapes, iconography, color palettes, typography, animations, or trade dress.
- **No** Tinder-style card-stack visual identity, Netflix row/billboard chrome, Duolingo mascot/character, Zomato/Tasty brand marks, or Instagram story-ring styling.
- **No** copying microcopy/voice verbatim from any product.
- We borrow **principles and emotional intent only.** Foofoo's visual identity uses its own design system (deep green `#2D6A4F`, warm orange `#FF6B35`, Inter, the SPACING/RADIUS tokens in `constants.ts`) and must be visually distinct.

---

## 6. How UI Must Respect Class-First RE Logic

The engine's non-negotiable order is: **generate meal classes → expand to dishes → rank by Food DNA.** The UI must mirror this and never invert it.

- **The week is shown as classes first.** A day's plan presents the *class* per slot (e.g. "Lunch: Dal–Roti–Sabzi"), with dishes revealed on tap/expand. Dishes are always presented as *"options within this class"*, never as the unit of planning.
- **Dishes never cross classes in the UI.** When a user opens a slot, every candidate belongs to that one `meal_class_code` (mirrors the DB invariant: 0 dishes in >1 class). The UI must not surface a "similar dishes" rail that mixes classes inside a planned slot.
- **Swapping respects the hierarchy.** "Show me another" inside a slot reranks dishes *within the class*; "change the meal type" is a separate, clearly-different action that swaps the *class* (and re-expands).
- **Reason chips reference class/region/behavior, never raw cuisine→dish shortcuts.** Trust copy reflects the real scoring signals (region affinity, day/slot fit, your history, class affinity).
- **Locking a dish** freezes that slot; **swiping** teaches dish- and class-level affinity (the feedback loop). The UI must make the difference between "not today" (temporary) and "never" (permanent) unmistakable and reversible.

---

## 7. How UI Should Expose Add-ons Without Confusing Users

Add-ons are **member-specific components attached to the family meal — never a replacement.** The UI must make this architecturally-true relationship feel natural.

- **Primary meal is the headline; add-ons are a quiet attached line.** e.g. *"Dinner: Dal–Roti–Sabzi · + soft khichdi for baby · + low-oil lauki for Dadaji."* The family meal never visually competes with or is replaced by the add-on.
- **Add-ons are framed as care, not complexity.** Language: "a little something for…", tied to the member ("for your 1-yr-old", "for the diabetic plan"), so it reads as thoughtfulness, not extra chores.
- **Collapsible by default.** Households with no special members never see add-on UI. When present, add-ons are a secondary, expandable layer — visible enough to reassure, quiet enough not to clutter.
- **Never imply the family must eat the add-on**, and never imply the member is excluded from the main meal — both are shown, clearly separate.
- **Whole-household exception handled gracefully:** if the household *is* the special segment (e.g. elderly-only), soft/elderly classes legitimately become primary — the UI shows them as the main meal, not as an add-on.

---

## 8. How UI Should Make `home_state` / `current_city` Feel Natural

These are two distinct signals (native food identity vs current lifestyle) and must never collapse into one "location" field.

- **Ask them as two warm, human questions, not a form:** "Where's home?" (food identity) and "Where do you live now?" (daily life) — phrased so the user *understands why both matter*.
- **Make the blend felt, not explained.** An MP family in Mumbai sees their home-style dal-sabzi most days *and* Mumbai-life quick lunches midweek — surfaced through reason chips ("A taste of home" vs "Easy for a Mumbai weekday"), not a settings toggle.
- **Migration is identity, not a bug.** Never normalize a migrant household into "generic Mumbai" or "generic MP" — the UI tone should affirm "your food, where you live now."
- **City relevance shows up as lifestyle**, not just geography: time-pressure, eating-out influence, availability — reflected in *which* classes appear on weekdays vs weekends.

---

## 9. How UI Should Collect High-Signal Onboarding Inputs Without Bounce

Target: a **confident first week in under ~90 seconds**, every step skippable, branching to relevance (the DOC-10 18-field contract delivered without feeling like a survey).

- **Start with one warm cohort question** (5 cards, not 41 personas). Narrow to sub-cohort chips. Never expose the backend taxonomy.
- **Branch dynamically** (Duolingo/Netflix): only ask member/health/cook/diet/swipe questions relevant to the chosen path. Routing rules R01–R08 drive the sequence; the user just answers natural questions.
- **Swipe to calibrate, don't type.** Class-level swipes (R08) seed `class_affinity_vector` and feel like play. Diet/allergy/fasting are quick chips, not free-text where avoidable.
- **Every skip lowers confidence, never blocks** (cold-start safe assumptions, DOC-20). A skipped answer = a gentle "we'll learn this as you go", and the first plan still ships.
- **Mirror back what we understood** (the reveal step) before generating — builds trust and lets the user correct cheaply.
- **Hard constraints are never guessed** (diet, allergy, Jain/fasting): these are explicitly captured because they are safety/cultural, and the UI treats them with appropriate seriousness.
- **Persist progress** so a killed session resumes where it left off (no "start over" punishment).

---

## 10. Accessibility & Indian Household Considerations

- **Bharat-scale device reality:** budget Android, small/older screens, intermittent connectivity (the app already has offline plan caching). Design for low-end first; graceful offline daily view.
- **Multi-member, multi-generational:** one account often serves the whole family; the UI must make capturing infant/child/elder/diabetic/pregnant members feel caring and quick, and let the cook (often a working woman managing a helper) act fast.
- **Language & familiarity:** dish/class names use familiar Indian terms; tone is warm and respectful across regions; avoid Western-defaults (no "entrée/sides" framing). Plan for future multilingual/transliteration even if v1 is English.
- **Diet/religion sensitivity:** veg/Jain/vegan/egg/fasting are treated as respected identity, never as restrictions to "work around". Non-veg is cohort/state/persona-sensitive, never a crude on/off.
- **Standard a11y:** ≥48dp touch targets, sufficient contrast on warm imagery, screen-reader labels on every interactive element, captions/text not conveyed by color alone, reduced-motion respect, dynamic type.
- **Trust & data dignity:** clear, calm consent; never feel surveilled; explain why we ask for state/city/members in human terms.

---

## 11. Success Metrics

Tie every screen to a measurable outcome (DOC-26 analytics). Targets are directional north stars, to be calibrated with real cohort data.

### Onboarding
| Metric | Direction | Why |
|---|---|---|
| Onboarding completion rate | ↑ (target ≥ 80%) | low bounce = relevance + low pressure |
| Time-to-first-plan | ↓ (target ≤ 90s) | speed = perceived effortlessness |
| Steps skipped without abandon | monitor | skips OK if plan still ships (cold start) |
| Profile confidence at completion | ↑ | high-signal capture without bounce |
| Hard-constraint capture rate (diet/allergy) | ↑ (≈100% of relevant) | safety/cultural correctness |

### Home (daily moment)
| Metric | Direction | Why |
|---|---|---|
| Daily first-suggestion acceptance (kept/locked) | ↑ | the core "don't make me think" win |
| Carousel depth to accept | ↓ | first answer is good enough |
| Time-to-decision | ↓ | < ~10s glance-and-go |
| Never-rate | ↓ | recommendations respect the user |
| Not-Today-rate | monitor | healthy temporal control, not rejection |
| Add-on acceptance by target member | ↑ | care framing lands, not confusion |

### Weekly meal plan
| Metric | Direction | Why |
|---|---|---|
| First-week plan acceptance | ↑ | calibration worked |
| Class-level acceptance (per cohort) | ↑ | class-first plan fits the household |
| Weekday/weekend differentiation felt (engagement delta) | present | rhythm feels real |
| Plan-acceptance for migrated households | ↑ | home/city blend works |
| Repeat satisfaction (variety guard not annoying) | ↑ | familiar-but-fresh balance |
| Constraint-violation count | **0** | non-negotiable: never serve excluded/unsafe food |
| Class/dish mismatch count | **0** | class-first integrity holds in UI |

---

*Every screen reviews against §3 principles and §11 metrics before it ships. If it doesn't increase decision confidence or respect class-first/add-on/home-city/constraint truth, it doesn't belong in Foofoo.*
