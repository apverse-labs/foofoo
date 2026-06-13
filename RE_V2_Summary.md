# RE V2 Summary — Meal Planning Recommendation Engine
> Generated: 2026-06-13 | Branch: `apverse-labs-RE` | Source: `Meal_Planning_RE_Engine/` folder

---

## 1. Overview

### What is this trying to solve vs the current version?

**Current (v1 — `main` branch):**
The existing RE is a **cuisine-first, dish-centric** engine. Onboarding asks users to sort cuisines (e.g., North Indian, South Indian) into F/O/N (Frequent/Occasional/Never) buckets, then scores individual dishes using static weights for cuisine match, variety penalty, weather, weekday/weekend, and home-state affinity. The plan is generated **per-day** (not per-week), and the unit of output is a list of ranked dishes per meal slot. There is no concept of household composition — every user is effectively treated as a single adult.

**Planned (v2 RE engine — `apverse-labs-RE` branch):**
The new engine is a **household-profile-first, meal-class-first** system designed specifically for Indian multi-member households. Rather than ranking dishes directly, it generates a **7-day weekly plan of meal classes** (abstract categories like `BF_LIGHT_GRAIN`, `LU_DAL_SABZI_ROTI`) and then expands each class into dish candidates. The engine understands household composition (infants, elders, diabetics, pregnancy, etc.) and generates **member-specific add-on components** separately from the primary family meal. It is driven by 28 canonical documents and a v3 source workbook covering 36 Indian states, 41 backend personas, and a multi-layer cohort/overlay system.

**Key problems the new RE solves:**
- V1 treats all users identically (no household structure, no member segments).
- V1 recommends dishes directly from cuisine — mixing dishes across classes (the `BF_STUFFED_FLATBREAD` / `BF_FRIED_FESTIVE` mismatch bug documented in DOC-00).
- V1 has no concept of home state vs. current city as separate signals.
- V1 has no weekday/weekend rhythm or cook-capability modulation.
- V1 has no family lifecycle handling — no infant/elderly/pregnancy add-ons.
- V1 generates day-by-day; v2 generates a consistent 7-day class matrix first.
- V1 personalization is shallow (cuisine buckets only); v2 builds a Food DNA vector and feedback learning loop.

---

## 2. DB Schema Changes

### New Tables (additive — do not exist in v1)

| Table Name | Primary Key | Purpose | Key Columns |
|---|---|---|---|
| `states` | `state_id` | 36 state/UT food signatures | `state_ut`, `region_archetype`, `staple_base`, `nonveg_intensity` |
| `city_migration_overlays` | `overlay_id` | Origin-state × current-city blending | `origin_state_ut`, `destination_group_code`, `home_state_signature_weight`, `current_city_lifestyle_weight` |
| `main_cohorts` | `main_cohort_id` | 5 user-facing onboarding cohort cards | `main_cohort_label`, `subcohort_screen_copy` |
| `personas` | `persona_id` | 41 detailed backend personas | `persona_name`, `age_band`, `household_stage`, `cook_dependency`, `nonveg_mode`, `dependent_addon_default` |
| `subcohorts` | `sub_cohort_id` | Dynamic onboarding routing layer | `main_cohort_id`, `maps_to_persona_id`, `ask_next` |
| `routing_rules` | *(from `Routing_Rules_v3`)* | Onboarding dynamic branching logic | Question → answer → next screen routing |
| `meal_classes` | `meal_class_code` | Class-first planning taxonomy | `slot_group`, `category`, `diet_type`, `weekday_fit`, `weekend_fit`, `complexity`, `planning_role_v3`, `allowed_as_weekly_primary_v3` |
| `meal_class_overlap_rules` | — | Governance for which classes are MAIN vs ADDON | Classes removed from weekly primary plan and why |
| `class_dish_options` | `dish_option_id` | Exhaustive dish candidate pool keyed by class | `meal_class_code`, `dish_name`, `diet_type`, `region_relevance`, `slot_group` |
| `addon_classes` | `addon_class_code` | Member-specific add-on class master | `target_member_segment`, `addon_class_name`, `diet_type` |
| `addon_dish_options` | `addon_dish_option_id` | Dish/component pool per add-on class | `addon_class_code`, `dish_or_component_name` |
| `cohorts` | `cohort_id` | State × city-tier × persona cohort matrix | `state_id`, `city_tier_code`, `main_cohort_id`, `sub_cohort_id`, `persona_id` |
| `weekly_class_plans` | `plan_day_id` | 7-day class plan rows per cohort | `cohort_id`, `day_of_week`, `breakfast_primary_class`, `lunch_primary_class`, `dinner_primary_class`, secondary/tertiary class columns, add-on columns |
| `household_addon_component_plans` | `addon_plan_id` | Normalized add-on schedule per cohort/member | `cohort_id`, `persona_id`, `day`, `meal_slot`, `target_member_segment`, `addon_class_code` |
| `nonveg_logic` | `state_ut` | State/persona non-veg frequency priors | `default_nonveg_count`, `regular_nonveg_count`, `preferred_classes` |
| `user_household_profiles` | `household_profile_id` | Runtime household profile built from onboarding | `user_id`, `home_state`, `current_city`, `diet_mode`, `cook_capability`, `member_segments` (JSON) |
| `user_persona_assignments` | — | Assigned persona IDs + confidence per user | `household_profile_id`, `main_cohort_id`, `sub_cohort_id`, `backend_persona_ids`, `overlay_persona_ids`, `confidence_score` |
| `user_meal_plans` | `plan_id` | Generated 7-day class-first plan per user/week | `household_profile_id`, `start_date`, `generation_mode`, `status` |
| `user_meal_plan_items` | `plan_item_id` | Per-day/slot output with class codes and dish candidates | `plan_id`, `day`, `meal_slot`, `primary_class_code`, `dish_candidates` (JSON), `addon_components` (JSON) |
| `user_feedback_events` | `event_id` | Revealed behavior events for learning loop | `user_id`, `meal_class_code`, `dish_id`, `event_type`, `timestamp` |
| `user_preference_vectors` | — | Learned class/Food DNA/cook/repeat preferences | Updated incrementally from feedback events |

### Modified Tables (additive columns only — v1 tables must not be broken)

| Table | New Columns Needed | Notes |
|---|---|---|
| `profiles` | `home_state`, `current_city`, `household_members` (JSON), `re_version_assignment` | Household identity fields; `re_version_assignment` enables routing users to v1 vs v2 engine |
| `user_diet_rules` | `cook_capability`, `weekday_time_pressure`, `city_tier_code`, `jain_mode`, `fasting_days` | Extended constraint capture for new RE |

### Dropped Tables
**None.** The RE engine is additive. All v1 tables (`user_diet_rules`, `user_category_preferences`, `cuisines_master`, `dishes`, `planner`, `planner_carousel`, `region_food_affinity`, etc.) are preserved unchanged.

### Source Data Import Order (BUILD-01)
States → city_migration_overlays → main_cohorts → personas → subcohorts → routing_rules → meal_classes → meal_class_overlap_rules → class_dish_options → addon_classes → addon_dish_options → cohorts → weekly_class_plans → household_addon_component_plans → nonveg_logic → sources → qa_checks

---

## 3. Onboarding Flow Changes

### Current v1 Onboarding (7 steps)

| Step | Screen | Data Captured |
|---|---|---|
| 1 | Food preference | `food_pref` (veg / non_veg / egg / vegan / jain) → `user_diet_rules` |
| 2 | Allergen selection | `excluded_ingredients[]` (integer IDs) → `user_diet_rules` |
| 3 | Cuisine bucket sort | Cuisine codes → F/O/N buckets → `user_category_preferences` |
| 4 | Meal item preferences | Dish-level F/O/N bucket sort |
| 5 | Meal timing / cooking style | Basic time/style info |
| 6 | Location | Single city field |
| 7 | Confirmation / continue | Profile saved |

**Model:** Cuisine-first. Ask user to sort cuisines. No household composition. Single location. No personas.

### New v2 Onboarding (8 steps, dynamic branching)

| Step | Question | Output Fields |
|---|---|---|
| 1 | Who are we planning meals for? (4–5 cards) | `main_cohort_id` |
| 2 | Which best describes your household? (sub-cards) | `sub_cohort_id`, `base_persona_id` |
| 3 | Any babies / kids / elders / pregnancy / diabetes / fitness? (chips) | `member_segments[]`, `overlay_persona_ids[]`, `addon_flags` |
| 4 | Where is your family's food from? (home state) | `home_state` |
| 5 | Where do you live now? (current city) | `current_city`, `city_tier`, `migration_overlay` |
| 6 | Diet pattern | `diet_mode`, `nonveg_mode`, `egg_allowed` |
| 7 | Who cooks and how much time? | `cook_capability`, `weekday_time_pressure` |
| 8 | Swipe meal-class examples (not dish names) | `class_affinity_vector` |

**Dynamic branching rules:**
- Family with kids → ask child age-band chips (infant / toddler / school / teen), tiffin need, spice tolerance
- Family with elders → ask soft/digestive/diabetic follow-ups
- Special life stage → ask pregnancy / postpartum / diabetes / fitness / recovery
- Solo/couple → skip child screens unless explicitly added

**Cold-start fallback (DOC-20):** If user skips questions, engine uses safe defaults. State + diet + main cohort → use state/cohort default matrix. If nothing provided → national urban safe default (light breakfast, dal/sabzi/roti lunch, khichdi dinner). Diet is mandatory before dish expansion; allergies can be skipped (no inference).

**Key difference:** v1 shows cuisines and dishes directly; v2 shows high-level household cards and class-level swipe examples. The 41 backend personas are never shown to the user.

---

## 4. RE Logic Changes

### Current v1 Logic

1. User's cuisine buckets + diet rules fetched from DB
2. `generate-daily-plan` Edge Function runs `scoreDish()` across all candidate dishes
3. Score = sum of: cuisine boost (F=+0.3, O=+0.1), meal-item boost (F=+0.25, O=+0.05), variety penalty (-0.5 if seen in last 3 days), weather boost (+0.15), weekday/weekend cook-time fit, home-state affinity multiplier (max +0.2), random noise (max +0.15)
4. Top 8 dishes per slot returned as carousel; no class structure
5. RE_V2 additive layer: inferred spice preference, complexity preference, cuisine drift, affinity score — small nudges on top of v1

**Problem:** Dishes are recommended directly from cuisines. No meal-class intermediary. No household composition. No weekly plan structure.

### New v2 Logic (full class-first pipeline)

```
onboarding answers
→ HouseholdProfileService (home_state, city, diet, cook, members)
→ ConstraintService (hard filters: diet, allergy, Jain, fasting, Never list)
→ PersonaAssignmentService (→ main_cohort, sub_cohort, persona_ids, overlay_ids, confidence)
→ RegionalOverlayService (home_state signal + current_city lifestyle blend)
→ NonVegService (state/persona cadence → non-veg schedule)
→ WeeklyClassPlanService (cohort_matrix → 7-day primary class slots)
→ VarietyService (class rotation rules, weekday/weekend rhythm, heaviness coherence)
→ AddonComponentService (member segments → add-on class plan, separated from primary)
→ DishExpansionService (class_code JOIN class_dish_options → candidate pool)
→ FoodDNAService (texture, method, richness, spice, heaviness vectors)
→ RecommendationScoringService (ranked dish candidates)
→ FeedbackLearningService (update preference vectors from behavior)
→ PlanAssembler (final JSON output with plan + add-ons + ranked dishes)
```

**Scoring components (v2 RE):**

| Component | Range | Notes |
|---|---|---|
| Base eligibility | 1.00 | Only after hard constraint filters |
| Class affinity | +0.10 to +0.35 | From cohort plan, swipes, revealed behavior |
| State/home affinity | +0.05 to +0.20 | Home-style familiarity |
| Current city lifestyle | +0.05 to +0.15 | Quick/healthy/modern overlay |
| Day/slot fit | +0.05 to +0.20 | Weekday quick vs weekend special |
| Cook capability | -0.20 to +0.10 | Demote too-complex dishes |
| Food DNA match | -0.10 to +0.30 | Texture, method, richness, spice, heaviness |
| Feedback/history | -0.30 to +0.40 | Accept, reject, lock, Not Today, Never |
| Variety penalty | -0.30 to 0 | Avoid stale repeats |
| Randomization | 0 to +0.10 | Freshness after constraints |

**Hard constraints applied before scoring:** diet compatibility, allergy, Jain/vegan/fasting, Never list, meal slot eligibility, add-on member safety.

**Feedback learning loop (BUILD-07):**

| Signal | Meaning | Update |
|---|---|---|
| View (no swipe) | Passive accept | Small positive for class/dish |
| Swipe and return | Mild accept | Positive for class + Food DNA |
| Lock meal | Strong accept | Strong positive + repeat tolerance |
| Tap recipe | Interest | Positive for dish + class |
| Add to grocery | Cooking intent | Strong positive |
| Not Today | Skip once | Temporary demotion |
| Never | Hard block | Permanent exclusion |

**Versioned engine:** RE is built as `RE_V1` (cold-start class-first), `RE_V2` (feedback adaptation), `RE_V3` (cluster-seeded), `RE_V4` (collaborative filtering). The app calls a stable RE service interface, not a specific version. Users can be assigned to different RE engine versions via `re_version_assignment` on their profile.

**Class rotation rules:** Same breakfast class max 3×/week; same lunch class max 3×/week (with dish variation); same dinner class max 2×/week; no heavy class three consecutive meals; weekends allow richer/fried/non-veg/festive classes where cohort permits.

---

## 5. Edge Functions Affected

### Existing Edge Functions — Change Required

| Function | Change Required | Reason |
|---|---|---|
| `generate-daily-plan` | **Major rewrite** | Must be replaced with weekly class-first plan generation. Current dish-scoring logic becomes a sub-step inside the new pipeline. RE_V1/V2 config splits into the new class-first architecture. Add a `generation_mode` parameter to route between old and new RE. |
| `generate-daily-plans-batch` | **Update** | Same RE logic change as above, applied to batch generation path. |
| `regenerate-slot` | **Update** | Must regenerate a single slot using class-first dish expansion, not direct cuisine scoring. |
| `calculate-inferred-prefs` | **Extend** | Add household-level and class-affinity inference on top of existing cuisine/spice/complexity inference. |
| `compute-recipe-affinity` | **Extend** | Incorporate Food DNA vector computation (DOC-08) alongside existing affinity scoring. |
| `log-re-decision` | **Extend** | Add `meal_class_code`, `household_profile_id`, `re_version` fields to decision log for new traceability. |
| `backfill-ingredients` | **Evaluate** | May need update to align ingredient data with v3 workbook Food DNA tags. |
| `derive-dish-attributes` | **Extend** | Must derive and store Food DNA attributes (texture, method, richness, spice, heaviness) for new scoring. |

### New Edge Functions Required

| Function | Purpose |
|---|---|
| `build-household-profile` | CREATE/UPDATE household profile from onboarding answers → `user_household_profiles` |
| `assign-persona` | Run PersonaAssignmentService: map profile → cohort → persona_ids + overlay_ids + confidence |
| `generate-weekly-plan` | Core weekly class-first plan generation (replaces `generate-daily-plan` for v2 users) |
| `generate-addon-plan` | Generate member-specific add-on component schedule |
| `expand-dish-candidates` | Expand class codes → dish candidate pools via `class_dish_options` join |
| `submit-feedback` | Accept swipe/lock/Not Today/Never events → update `user_feedback_events` and `user_preference_vectors` |
| `run-qa-validation` | Run DOC-25 synthetic profile test cases and return pass/fail report |
| `seed-import` | Import/version v3 workbook data into canonical seed tables |

### Unchanged Edge Functions (no modification needed)

- `send-morning-notification` — notification dispatch, unrelated to RE logic
- `sync-cloudinary-images` — image CDN sync, unrelated to RE logic
- `daily-analytics-email` — reporting function, extend if new metrics needed (BUILD-10)
- `delete-account` / `delete-user-account` — auth cleanup, extend to include new RE tables in deletion

---

## 6. Assets & Secrets That Can Be Re-used

The following can be **shared between v1 (`main` / DEP-PRODUCTION) and v2 (`apverse-labs-RE`)** deployments, as they are not Supabase-project-specific or can be multi-project:

| Asset / Secret | Env Var | Re-usable? | Notes |
|---|---|---|---|
| OneSignal App | `EXPO_PUBLIC_ONESIGNAL_APP_ID` | ✅ Yes | Push notification app is frontend-linked; same app ID works for both deployments unless you want separate notification audiences |
| PostHog Project | `EXPO_PUBLIC_POSTHOG_KEY` | ✅ Yes | Single PostHog project can track both v1 and v2 events using a `re_version` property on events |
| Sentry DSN | `EXPO_PUBLIC_SENTRY_DSN` | ✅ Yes | Single Sentry project with `release` tags distinguishing v1/v2 builds |
| OpenWeatherMap API | *(server-side Supabase secret)* | ✅ Yes | Stateless API; no project binding |
| Cloudinary config | *(server-side Supabase secret)* | ✅ Yes | Same CDN, same dish image assets; v2 will use the same images |
| App domain / Vercel | — | ✅ Yes | Vercel project is single; deploy gates prevent accidental pushes |
| Expo EAS credentials | — | ✅ Yes | Same bundle ID, same signing certificates |

---

## 7. What's New / Cannot Be Shared

| Item | Why it's new | Action Required |
|---|---|---|
| **Supabase Staging Project (Project A)** | `foofoo-mvp` is production; v2 needs an isolated DB for RE development without risking production data | Create second Supabase project on free tier (DEP-STAGING slot). Requires explicit user approval. |
| **`EXPO_PUBLIC_SUPABASE_URL` (staging)** | Points to new staging Supabase project | New value per staging project |
| **`EXPO_PUBLIC_SUPABASE_ANON_KEY` (staging)** | Anon key for staging project | New value per staging project |
| **DB seed data (v3 workbook)** | 36 states, 41 personas, meal classes, dish catalog, weekly class matrix — none of this exists in v1 DB | Run BUILD-01 seed import on the staging project first |
| **`re_version_assignment` on profiles** | Feature flag to route users to v1 vs v2 engine | New column; additive migration required |
| **New Supabase Edge Functions** (8 listed in §5) | Entire new function group for class-first pipeline | Write, deploy, and test against staging project |
| **Food DNA tag data** | Texture/method/richness/spice/heaviness attributes on dishes — not in v1 DB | Derive via `derive-dish-attributes` (extended) or bulk import from v3 workbook |
| **`user_household_profiles` table** | Not in v1; core new runtime entity | Additive migration + seed; must not touch v1 profile shape |
| **Onboarding v2 screens** | Steps 1–8 (household/cohort/state-based) replace steps 1–7 (cuisine-bucket-based) | New screen components; v1 screens preserved for users not yet migrated |
| **OneSignal segment for v2 users** | If you want separate notification copy for RE v2 users | Optional: create a new OneSignal segment filtered on `re_version_assignment = v2` |

---

## Appendix: Build Sequence Reference

| Build ID | Status | Output |
|---|---|---|
| BUILD-00A | Not started | Module guardrails + tracker (this doc is part of it) |
| BUILD-00B | Not started | Integration audit of existing Foofoo app |
| BUILD-01 | Not started | DB schema + v3 seed import |
| BUILD-02 | Not started | Onboarding v2 + household profile builder |
| BUILD-03 | Not started | Cohort/persona assignment engine |
| BUILD-04 | Not started | Weekly class-first plan engine |
| BUILD-05 | Not started | Member-specific add-on engine |
| BUILD-06 | Not started | Dish expansion + Food DNA ranking |
| BUILD-07 | Not started | Feedback learning loop |
| BUILD-08 | Not started | API/app integration |
| BUILD-09 | Not started | Admin CMS + data operations |
| BUILD-10 | Not started | Analytics / experimentation / QA / governance |

All 28 canonical source documents are in `Meal_Planning_RE_Engine/Meal_Planning_RE_Technical_Docs_v1/`. Start each build by reading the relevant DOC IDs listed in `DOC-00_Master_Document_Map_and_Implementation_Order_v1.0.md`.
