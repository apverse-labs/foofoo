*PRD **&** User Personas v4  |  Confidential*

DOCUMENTS #6 & #7  |  REVISED v4

**Product Requirements Document**

**&**** User Personas**

AI-Powered Meal Decision Assistant

India-First  |  Android-Only MVP (iOS Phase 0.5)  |  Freemium  |  7-Phase Roadmap

3-Level Content Model  |  25 MVP Features  |  67 Total Features  |  Dish Combos + Variants

*Version 4.0  |  April 2026  |  Confidential*

*v4 changes: **'**recipe**'** → **'**dish**'** throughout, 3-level content model (dish cards + simple ingredients for MVP, full recipes post-launch), Android-only launch, auto-derivation of allergens/diet_type from ingredient flags, autocomplete allergen selection, dish combos (Chole Bhature, Rajma Chawal), variant families (parent_dish_id), dish_role for meal composition, 67 features across 7 phases (MVP, 0.5, 1, 1.5, 2, 3, 4).*

**PART 1: PRODUCT REQUIREMENTS DOCUMENT**

# 1. Product Overview

## 1.1 Problem Statement

Every day, millions of Indians spend significant time and mental energy deciding what to eat. This decision fatigue affects working professionals, families, and individuals alike. No single platform solves the 'what to eat' question — food delivery apps (Zomato, Swiggy) solve HOW to get food, but not WHAT to eat.

## 1.2 Solution

An intelligent system that understands user behavior, mood, weather, dietary needs, health goals, and food history to proactively suggest personalized meal plans. Users see a ready meal plan each morning. If they like it, they cook or order. If not, they swipe for alternatives. The app acts as a decision layer that complements existing food platforms.

## 1.3 3-Level Content Model

**Key Decision:** The app launches with dish cards and simple ingredient lists, not full recipes. The core product is the DECISION ('what to eat'), not the instruction ('how to cook it').

| **Level** | **Content** | **Details** | **When** |
| --- | --- | --- | --- |
| **1** | **Dish Card Data** | Dish name, hero photo, Food DNA tags, cuisine, diet type, calories, macros, cook time, difficulty, dish_role. | MVP (all 500 dishes) |
| **2** | **Simple Ingredients** | Plain list of ingredient names: 'paneer, tomato, cream, onion, spices.' No quantities, no units. 5-10 items per dish. Linked to standardized ingredients_master via meal_ingredients junction. | MVP (all 500 dishes) |
| **3** | **Full Recipes** | Step-by-step instructions, precise quantities, audio/video. Added dish by dish post-launch. Top 50-100 first. | Phase 0.5 onwards |

## 1.4 Dish Combos & Variants

**Indian meals are combinatorial.** Many dishes are eaten as inseparable pairs (Chole Bhature, Rajma Chawal, Idli Sambhar). These are stored as **dish_combos** — a combo of individually-tagged dishes. The RE suggests the combo as one unit per meal slot. If user never-lists one component, the RE swaps it (e.g., replace Sambhar with Chutney, keep Idli). **Rule:** if components exist independently with other partners → combo. If not → single dish (Pav Bhaji = one dish, Vada Pav = one dish).

**Regional variants** use parent_dish_id: Paneer in Coconut Gravy (Kerala) is a variant of Paneer Butter Masala (Punjab). The RE boosts variants for users from matching regions and suggests 'try Rava Dosa' if user likes Masala Dosa.

**Jain variants:** Removing onion/garlic creates a Jain version. Stored as a separate dish with parent_dish_id pointing to the original. Auto-derived is_jain = true from ingredient flags.

## 1.5 Auto-Derivation

**Allergens, diet_type (veg/non-veg/egg/vegan), is_jain, and dietary_tags (gluten_free, dairy_free) are automatically computed from ingredient flags.** Every ingredient in the database has: is_veg, is_vegan, is_jain_compatible, allergen_flags[]. When linked to a dish via meal_ingredients, the derivation script computes dish-level attributes automatically. This eliminates manual tagging errors at scale (500+ dishes x 5-10 ingredients each = 3000+ links). One source of truth: the ingredient.

## 1.6 Success Metrics

| **Metric** | **Target (Month 3)** | **Target (Month 6)** |
| --- | --- | --- |
| **DAU** | 5,000 | 15,000 |
| **D7 Retention** | >30% | >35% |
| **Suggestion Acceptance Rate** | >40% | >55% |
| **Onboarding Completion** | >70% | >75% |
| **Never Rate** | <15% | <10% |
| **Premium Conversion (post Month 3)** | N/A (free period) | >3% |
| **App Store Rating** | >4.0 | >4.2 |

# 2. App Flow: First-Time User

Download from **Google Play Store** (Android-only MVP; iOS added Phase 0.5) → Splash Screen (2 sec) → 3 Intro Screens (swipe) → Auth Gate (Sign Up / Sign In) → Email + Password Signup (Google Sign-In Phase 0.5) → Email Verification → 7-Step Onboarding → First Personalized Meal Plan generated (< 3 sec) → Home Day View with today's B/L/D suggestions.

# 3. Onboarding Flow

7 steps. Uses the Frequently / Occasionally / Never bucket system. Each item goes to exactly ONE bucket. Estimated completion: 3-5 minutes.

| **#** | **Step** | **What User Does** | **Stored In** |
| --- | --- | --- | --- |
| **1** | **Profile Setup** | Name, username (unique check), email opt-in, location permission (city/state) | profiles |
| **2** | **Food Preference** | Select: Veg, Non-Veg, Egg, Vegan, Jain. Single selection. | user_diet_rules.diet_type |
| **3** | **Allergies ****&**** Exclusions** | **Autocomplete search** against ingredient_aliases. User types 'pea...' → shows 'Peanuts', 'Peas (matar)'. Stores **ingredient IDs** (not text) in user_diet_rules.excluded_ingredients integer[]. Also: allowed_meats integer[] for non-veg users. | user_diet_rules |
| **4** | **Cuisine Buckets** | Sort cuisines (North Indian, South Indian, etc.) into F/O/N. Bucket Selector component. | user_category_preferences (type='cuisine') |
| **5** | **Breakfast Buckets** | Sort breakfast items into F/O/N. Items filtered by Step 4 cuisine selections. | user_category_preferences (type='breakfast') |
| **6** | **Lunch+Dinner Buckets** | Sort lunch/dinner items into F/O/N. Combined (not separate). Filtered by cuisines. | user_category_preferences (type='lunch_dinner') |
| **7** | **Almost There** | Role (cook/instruct), notification permission + time, family members (optional), location access | profiles + user_consent |

# 4. Home Page

## 4.1 Layout

**Day View (default):** Top bar (search icon, notification bell). Date navigator (today + arrows). 3 independent Rubik's Cube-style meal cards stacked vertically: Breakfast, Lunch, Dinner. Each card: full-width hero photo with gradient, dish/combo name, cuisine tag, time + calories display, action icons (ingredients, lock, plus). Footer: 4 tabs (Planner active, Pantry grayed, Diary grayed, Profile).

**Week View:** Toggle from Day. 7-day grid: BLD rows x day columns. Horizontal scroll. Today highlighted. Past grayed. Tap any cell → switch to Day View for that date.

**For combo suggestions:** Card shows combo name (e.g., 'Chole Bhature'). Below: component thumbnails. Tap opens Meal Detail with tabbed components.

## 4.2 Gesture System

**Interaction Philosophy:** The default suggestion IS the plan. No 'accept' needed. Swipe to explore, long-press to dismiss, lock to protect.

| **Gesture** | **Action** | **System Response** |
| --- | --- | --- |
| **Swipe Left/Right** | Browse through 8 AI-ranked alternatives in carousel | Load next/prev dish or combo card. Position tracked for analytics. |
| **Long Press + Drag Down** | NEVER: permanently demote this dish | Confirmation modal. Write to never_list (ref_type: dish/combo/ingredient). Load replacement. Reactivation only on mode change. |
| **Long Press + Drag Up** | NOT TODAY: remove from today only | Modal. Move dish to future eligible date. Load replacement for today. |
| **Tap** | Open Meal Detail Page | Navigate to full dish info with ingredients, tags, and actions. |
| **Lock (icon tap)** | Prevent changes to this meal slot | Lock modal: select B/L/D. Locked slots skipped by refresh/regeneration. Unlock by tapping again. |
| **Plus (icon tap)** | Add this dish to a different date | Date picker modal. Write to planner for selected date/slot. |
| **Pull Down** | Refresh plan (regenerate unlocked slots) | Call refresh Edge Function. Locked slots preserved. New suggestions for unlocked. |

**Passive Feedback Loop (silent, no UI):** Every interaction is logged to suggestion_logs: viewed, swiped_to, swiped_past, locked, never, not_today, tapped_detail, tapped_ingredients. Default shown = 'eaten' signal. The RE reads these logs to learn user preferences. This is the foundation of RE v2.

# 5. Meal Detail Page

## 5.1 MVP Content

Hero image (with Blurhash progressive loading) → Dish name + cuisine tag → Food DNA tags as friendly chips ('Light', 'Steamed', 'Mild') → Time + Calories + Macros + Difficulty → dish_role badge (Carb Base, Protein, Vegetable, etc.) → **Simple ingredient list** (names with checkboxes, no quantities) → Action buttons (Lock, Plus, Share). For dishes without Level 3 content: 'Full recipe coming soon!' placeholder with progress indicator.

**For combos:** Tabbed view showing each component dish. Combined nutritional info header. Individual ingredient lists per component.

**Auto-derived badges:** 'Jain', 'Vegan', 'Gluten-Free', 'Nut-Free' displayed automatically based on ingredient flags. No manual tagging needed.

## 5.2 Phase 0.5+ Content

When Level 3 recipes are added: Recipe tab appears (Ingredients | Recipe | Video). Full step-by-step instructions with quantities. has_full_recipe boolean on dish indicates availability.

# 6. Search & Meal Listing

## 6.1 Search

Global search from Home top bar. Search by **dish name, cuisine, ingredient, or category.** Full-text search via tsvector. Results include term_synonyms matches (search 'aloo paratha' finds 'Aloo ka Paratha'). Disambiguation for ambiguous terms ('bhaji' shows both Pav Bhaji and Aloo Bhaji with clarification notes). Results as card grid (PLP). In Phase 0.5, carousel end card links to pre-filtered search.

## 6.2 Filters

**MVP:** Cuisine chips, meal type (B/L/D), protein type (veg/non-veg/egg). **Phase 0.5:** Sub-category, cooking time slider, calorie range, complexity chips.

# 7. Grocery List & Pantry

## 7.1 Grocery List (MVP)

Auto-generated from current meal plan. Aggregates ingredients from all planned dishes (and combo components) via meal_ingredients JOIN ingredients. **MVP: ingredient names only, no quantities** (Level 2 content). Grouped by category (spices, vegetables, proteins, dairy). Checkboxes. Serving count adjuster (when Level 3 quantities available). For combos: ingredients de-duplicated across components.

## 7.2 Pantry System (Phase 0.5)

Full ingredient inventory. Add items via: search autocomplete (ingredients_master), photo capture (AI-assisted identification). Check Pantry button on Meal Detail: shows green (have) / red (missing) per ingredient. WhatsApp photo integration and OCR scan deferred to Phase 2.

# 8. Additional Screens

## 8.1 Profile (MVP)

Footer tab. Includes: profile photo, name, username, email, link social accounts, change food/cuisine/meal preferences (re-run onboarding sections), notification settings (enable/disable, time picker), password change, premium tier display (visible from day 1, Rs 0 during free period), logout.

## 8.2 Diary (Phase 1)

'I Cooked' button on Meal Detail logs to diary: dish_id, date, optional photo, rating (1-5), comments, recipe changes. Diary tab (activate from grayed state). Date-wise record. Filterable by: B/L/D, Cuisine, Time Period. Ratings feed back into RE scoring.

## 8.3 Notifications

MVP: morning plan notification (1/day max). Phase 0.5: evening prep reminder, not-locked dinner reminder (2/day max). Never more than 3/day at any phase.

# 9. Complete Feature Roadmap (67 Features, 7 Phases)

The definitive scope reference. Features organized by phase: MVP (25), Phase 0.5 (8), Phase 1 (4), Phase 1.5 (8), Phase 2 (11), Phase 3 (5 social + ordering), Phase 4 (4 future). **See Complete Feature Inventory spreadsheet for full details with descriptions and dev effort estimates.** Any feature not listed requires a formal change request with phase assignment.

| **Phase** | **Count** | **Key Features** |
| --- | --- | --- |
| **MVP** | **25** | Auth (email+password), 7-step onboarding with autocomplete allergens, Home Day/Week View, swipe carousel, gestures (never/not-today/lock/plus), Meal Detail with simple ingredients, search + basic filters, grocery list, profile, RE v1 + v2, passive feedback loop, morning notification, offline support |
| **Phase 0.5** | **8** | Google Sign-In, full recipes top 50-100, pantry system, advanced filters, extended notifications, iOS launch, carousel end→search, additional profile fields |
| **Phase 1** | **4** | WhatsApp referral, mood selector, calorie targeting, cooking diary |
| **Phase 1.5** | **8** | Guest mode, premium tiers go live, ad integration, family profiles, audio/video recipes, cluster-based RE v3, user ratings, premium visibility |
| **Phase 2** | **11** | Context tags, meal insights, health profiles, explore feed, pantry WhatsApp/OCR, user modes, Tier 3 Food DNA, family voting, variant additions, demo/tutorial |
| **Phase 3** | **8** | Order grocery (Blinkit/Zepto), order food (Zomato/Swiggy), WhatsApp/IoT integration, social suite (public profiles, search, engagement, follow, explore) |
| **Phase 4** | **4** | Voice cooking assistant, chef login, dietician services, waste minimizer |

# 10. AI Recommendation Engine Overview

**Full specification in Doc #10 (RE v2).** Summary: 11-step scoring pipeline using Food DNA taxonomy (20 dimensions, 3 tiers). Hard constraints (diet_type, allergens via auto-derivation, excluded_ingredients via integer matching) filter first. Soft constraints (cuisine boost, weather, home state, variety guard, meal item boost, day-of-week, random factor) score survivors. 8 ranked dishes/combos per slot. Coherence sensitivity learned per user.

**Combo-aware scoring:** The RE scores combos as a unit but can swap individual components. If Sambhar is never-listed, the RE keeps Idli but replaces Sambhar with an eligible side dish.

**RE versions:** v1 (MVP launch: rule-based + onboarding data), v2 (Week 3+: personal history + inferred prefs), v2.5 (Tier 2 Food DNA active), v3 (5K+ MAU: cluster-seeded), v4 (full personalization with dynamic clustering).

# 11. Core Data Model

**Full specification in Doc #11A (Merged DB Schema v2).** 40+ MVP-active tables organized into 5 groups: Core (profiles, user_diet_rules, user_category_preferences, user_consent), Food Knowledge Base (cuisines, dishes with 20 Food DNA dimensions via dish_tags, ingredients with flags, meal_ingredients, dish_combos, dish_combo_items, term_synonyms), Recommendation Engine (planner, planner_carousel, suggestion_logs, never_list, user_recipe_affinity, user_inferred_prefs, weather_cache, region_food_affinity), App Intelligence (app_events, user_behavioral_profile, experiments), Operations (audit_log, etl_jobs, referrals, notification_log, media_assets).

**Key architectural choices:** Tags + dish_tags junction for Food DNA (unlimited dimensions). Integer-based diet exclusions (no text matching across languages). Auto-derivation pipeline (ingredient flags → dish attributes). Polymorphic planner (supports both dishes and combos). Dish variants via parent_dish_id. dish_role for meal composition awareness.

# 12. Monetization Tiers

**First 3 months: all features free**, premium tier visible at Rs 0. **Phase 1.5 (Week 23-28):** pricing activates. Referral: 15 days free premium per referral (stackable to 180 days max).

| **Feature** | **Free** | **Premium Rs 99/mo** | **Premium Plus Rs 149/mo** |
| --- | --- | --- | --- |
| **Personalized meal suggestions** | ✓ | ✓ | ✓ |
| **Dish cards + simple ingredients** | ✓ | ✓ | ✓ |
| **Search, filters, grocery list** | ✓ | ✓ | ✓ |
| **Mood ****&**** weather-aware suggestions** | ✓ | ✓ | ✓ |
| **Full recipes (when available)** | ✓ | ✓ | ✓ |
| **Ads** | Yes | No ads | No ads |
| **Meal Insights ****&**** Analytics** | ✗ | ✓ | ✓ |
| **Health ****&**** Diet Profiles** | ✗ | ✓ | ✓ |
| **Family Profiles** | ✗ | ✗ | ✓ |
| **Smart Ingredient Planning** | ✗ | ✗ | ✓ |

# 13. Non-Functional Requirements

| **Requirement** | **Specification** |
| --- | --- |
| **Platform** | Android-only MVP. iOS added Phase 0.5 (4-6 weeks post-launch). React Native + Expo (single codebase). |
| **Performance** | App launch < 3 sec. Plan generation < 3 sec. Carousel swipe < 100ms. All on budget Android phones. |
| **Dish Database** | 500+ dishes at launch with Tier 1+2 Food DNA tags, simple ingredients (Level 2), 50+ combos. Dishes enriched to 750+ by Phase 1.5. |
| **Auto-Derivation** | Allergens, diet_type, is_jain, dietary_tags computed from ingredient flags. Derivation script runs on dish creation and weekly batch. |
| **Offline** | Today's plan cached locally. Shown with 'Offline' banner. Actions queued, synced on reconnect. |
| **Privacy (DPDP)** | User consent tracked granularly (user_consent table). Data export via Edge Function. Account deletion within 72 hours with proper cascades. Audit log retained 3 years. |
| **Security** | RLS on all tables. JWT auth (1hr access, 30d refresh). Brute-force protection (lock after 5 failures). Integer-based diet exclusions (no PII in query strings). |
| **Analytics** | PostHog (product), Sentry (errors), custom daily email (13 metrics). app_events table for behavioral profiling. |

# 14. Product Risks

| **Risk** | **Impact** | **Mitigation** |
| --- | --- | --- |
| **Cold Start (new user, no history)** | First plan may not feel personalized | Onboarding captures strong signals. Home state + cuisine prefs give 80% of needed data. First-plan insurance: over-weight onboarding data for 2 weeks. |
| **Sparse dish DB at launch** | Repetitive suggestions with only 500 dishes | 500 is sufficient for variety. 20 Food DNA dimensions ensure scoring spreads across pool. Expand to 750 by Phase 1.5. |
| **Gesture learning curve** | Users may not discover long-press | Gesture tutorial overlay on first launch. Help icon always accessible. Fallback: bottom sheet with buttons if gesture detection fails. |
| **Auto-derivation errors** | Wrong allergen flagging is a safety issue | Conflict detection: manual vs derived mismatch logged. Human review for flagged dishes. Beta testers verify allergic-user flows. |
| **Combo complexity** | Users confused by multi-dish suggestions | Clear UI: combo name as primary, component thumbnails secondary. 'Chole Bhature' feels like one meal, not two. |
| **Android-only limits reach** | Miss 5% iOS users | 95% of Indian market is Android. iOS added Phase 0.5 (4-6 weeks). Premium-potential iOS users can wait. |

**PART 2: USER PERSONAS ****&**** JOURNEY MAPS**

Five personas. Riya (working professional) is P0 for MVP. All mapped to the 7-phase roadmap and gesture system.

# Persona 1: Riya — The Busy Professional (P0)

**28 years old.** Product Manager at a tech startup in Mumbai. Rs 12 LPA. Lives alone in a 1BHK. Orders from Swiggy 4-5 times/week but feels guilty about cost and health. Knows basic cooking but hates deciding what to make. **The app is built for Riya.** Test every feature: 'Would Riya use this daily?'

**Riya****'****s Journey:** Downloads from Play Store (Instagram ad) → Completes onboarding (3 min) → Sees first plan: Poha for breakfast, Rajma Chawal for lunch, Palak Paneer + Roti for dinner → Locks breakfast (she loves Poha) → Swipes lunch (not in mood for Rajma) → Gets Dal Makhani + Rice → Taps dinner for ingredients → Missing paneer → Orders from Blinkit (Phase 3) or swaps dinner. She opens the app every morning. Within 30 seconds, her day's meals are decided.

# Persona 2: Arun — The Fitness Enthusiast (P1)

**24 years old.** Software developer in Bangalore. Gym 5 days/week. Tracks macros but hates meal prep research. Wants high-protein, calorie-controlled suggestions. **Phase 1 features** (calorie targeting, mood selector for 'Fitness' mode) make this app essential for Arun. Premium conversion target.

# Persona 3: Meera — The Family Meal Planner (P1)

**35 years old.** Homemaker in Pune. Husband + 2 kids (8 and 5). Cooks 3 meals daily. The 'aaj kya banaye?' question is her daily frustration. Needs: kid-friendly filtering, variety across the week, grocery planning. **Phase 1.5 features** (family profiles, pantry integration) transform her experience. Highest engagement potential — she'll use the app 3x/day.

# Persona 4: Vikram — The College Student (P2)

**20 years old.** Engineering student in Delhi. Living in a hostel/PG. Limited cooking facilities (hot plate, electric kettle). Budget-conscious. Wants quick, easy meals. **Drives volume** via college networks and WhatsApp referrals. Low willingness-to-pay but high sharing potential.

# Persona 5: Priya — The Health-Conscious New Mom (P2)

**30 years old.** New mother in Chennai. On maternity leave. Needs pregnancy/postpartum nutrition guidance. Wants validated meal plans, not generic suggestions. **Phase 2 features** (health profiles, recovery mode) are critical. Highest willingness-to-pay for Premium Plus.

# Persona Priority Matrix

**P0 (Riya):** MVP is built for her. Validates gesture system, morning notification, and grocery list. If she's delighted, everyone else follows.

**P1 (Arun ****&**** Meera):** MVP works well for them. They become power users with Phase 1-1.5 features. Primary premium conversion targets.

**P2 (Vikram ****&**** Priya):** Vikram drives volume via college networks. Priya needs Phase 2 health features but has highest willingness-to-pay.

# 15. Next Steps

*This document is the single source of truth for product scope. 67 features across 7 phases (MVP, 0.5, 1, 1.5, 2, 3, 4). Any addition requires a formal change request with phase assignment.*

Page
