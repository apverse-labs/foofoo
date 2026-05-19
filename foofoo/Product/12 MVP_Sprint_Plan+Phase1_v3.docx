*MVP Sprint Plan v3  |  Confidential*

DOCUMENT #12  |  REVISED

**MVP Sprint Plan**

14 Weeks  |  7 Sprints  |  Android Launch

Claude Code + Cursor Free  |  Android-Only MVP  |  iOS in Phase 0.5

25 MVP Features  |  500 Dishes  |  38 Database Tables  |  Budget: Rs 11,500-17,700

*Version 3.0  |  April 2026  |  Confidential*

# 1. Planning Assumptions

| **Assumption** | **Detail** |
| --- | --- |
| **Team** | 2 co-founders, non-technical, 30+ hours/week each. One focuses on dev (with AI), other on content + business. |
| **AI Development Tools** | **Claude Code** (primary builder, included with Claude Pro $20/mo): describe features in natural language, generates files autonomously. **Cursor free tier** (visual editor): review code, understand structure, small tweaks. AI writes ~70% of code; founders review and test the other 30%. |
| **Learning Curve** | Sprints 1-2 will be 40-50% slower. Founders learning React Native + Supabase + Expo simultaneously. Factored into plan. |
| **Working Hours** | ~50 hours/week combined. Sprint velocity: ~35-40 productive hours/week after learning overhead. |
| **Content Work** | Founder 2 handles dish data: naming, photos, tagging, ingredient lists (with flags). 500 dishes Tier 1+2 tagged by Sprint 5. |
| **Sprint Structure** | 2-week sprints. Each has: a demo-able milestone, a sprint review on physical device, and a 'ship or slip' decision. |
| **Platform** | **Android-only MVP.** iOS added in Phase 0.5 (4-6 weeks post-launch). India is 95%+ Android. |
| **Timeline** | 14 weeks (3.5 months) including 1-week buffer in Sprint 7. Launch target: Week 13-15. |
| **External Dependencies** | Google Play ($25 one-time, Day 1). Supabase (instant). OpenWeatherMap, OneSignal, Cloudinary (all instant free tier). |
| **Definition of Done** | Feature works on physical phone, handles error states, has RLS policy, both founders have tested it. |

# 2. Sprint Overview

| **#** | **Name** | **What Gets Built** | **Milestone** |
| --- | --- | --- | --- |
| **1** | **Foundation** | Dev environment, DB setup (38 tables), Supabase config, Splash + Intro, Auth (signup/login) | User can sign up and log in on a real phone |
| **2** | **Onboarding** | 7-step onboarding with bucket selector, autocomplete allergen UI, profile setup | New user completes onboarding, data stored correctly |
| **3** | **The Core** | Home Day View, meal cards, swipe carousel, RE v1 scoring, first plan generation, dish combos | User sees personalized meal plan, can swipe through options |
| **4** | **Depth** | Meal Detail Page, ingredients list, grocery list, lock/never/not-today gestures, passive feedback logging | User can explore dishes, check ingredients, dismiss dishes, all interactions logged |
| **5** | **Discovery** | Search (full-text), filters, Week View, pull-to-refresh, 500 dishes loaded, derive-dish-attributes script | Full app usable with 500 dishes, auto-derived allergens + diet types |
| **6** | **Intelligence** | Push notifications, RE v2 (inferred prefs), analytics dashboard, pre-computed affinity, app event tracking | RE starts learning. Founders see daily metrics. Sentry + PostHog live. |
| **7** | **Polish + Launch** | Bug fixes, performance optimization, beta test (10-15 users), Google Play submission | App submitted to Google Play Store |

**Parallel content track (Founder 2):** 100 dishes by Sprint 3, 300 by Sprint 5, 500 by Sprint 7. All with Tier 1+2 tags, simple ingredients, and ingredient flags (is_veg, is_vegan, is_jain_compatible, allergen_flags) populated.

# 3. Detailed Sprint Breakdown

**  SPRINT 1: FOUNDATION  **  |  Weeks 1-2  

**Milestone: ****User can sign up and log in on a real phone**

The slowest sprint. Setting up everything from scratch AND learning the tools.

## Week 1: Environment + Database

| **Day** | **Dev Tasks (Founder 1)** | **Content Tasks (Founder 2)** | **Deliverable** |
| --- | --- | --- | --- |
| **1-2** | Install Node.js, Expo CLI. Create Expo project (TypeScript). Run on physical phone via Expo Go. Set up Claude Code + Cursor free. | Create Google Play developer account (Rs 2,100). Register domain. Set up Cloudinary, OneSignal, OpenWeatherMap accounts. | App runs on phone. All accounts created. |
| **3-4** | Create Supabase project (Mumbai). Run merged schema migration: CREATE all 38 tables, run all ALTERs, apply RLS. Configure Supabase client in app. | Begin dish data: compile first 50 Delhi/UP dish names. Populate ingredients_master with first 100 common ingredients WITH flags (is_veg, is_vegan, is_jain_compatible, allergen_flags). | 38 tables exist. 100 ingredients with flags. |
| **5** | Install core packages: supabase-js, expo-router, gesture-handler, reanimated. Configure routing. Test Supabase connection. | Populate cuisines_master (~20). Populate tags table (~100-150 Food DNA values). Source photos for first 20 dishes. | Packages installed. Supabase connected. Seed data loaded. |

## Week 2: First Screens + Auth

| **Day** | **Dev Tasks** | **Content Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **1-2** | Build Splash Screen (logo, animation, auto-transition). Build 3 Intro Screens (swipe, page dots, 'Let's Go'). Style per Design System. | Tag first 20 dishes: Tier 1 + dish_role + meal_types. Upload photos to Cloudinary. Link ingredients via meal_ingredients. | Splash + Intro screens working. |
| **3-4** | Build Auth Gate. Sign Up screen (name, email, password, validation). Sign In screen. Connect to Supabase Auth. Record user_consent on signup. | Dishes 21-50. Simple ingredient lists. Run derive-dish-attributes for first 20 (test auto-derivation: allergens, diet_type, is_jain computed correctly). | Auth works. Auto-derivation verified. |
| **5** | Email Verification screen. Full flow test: signup → verify → login → session persists. Sprint 1 review. | Populate term_synonyms for first 20 dishes (regional name variants). Populate ingredient_aliases (Hindi) for top 50 ingredients. | Sprint 1 Milestone: full auth on phone. |

**  SPRINT 2: ONBOARDING  **  |  Weeks 3-4  

**Milestone: ****New user completes onboarding and data is stored correctly**

Most UI-intensive sprint. Bucket selector is the hardest component. **New:** Allergen step uses autocomplete against ingredient_aliases (stores ingredient IDs, not text).

## Week 3: Steps 1-4

| **Day** | **Dev Tasks** | **Content Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **1-2** | Step 1: Profile Setup (name, username uniqueness, location). Step 2: Food Preference (veg/non-veg/egg/vegan/jain). Save to profiles + user_diet_rules. | Dishes 51-80 with Tier 1 tags + dish_role. Ingredient lists for 21-50. Ingredient flags for new ingredients encountered. | Steps 1-2 save to Supabase correctly. |
| **3-5** | Build Bucket Selector component (3 zones F/O/N, tap-to-cycle). Step 3: Allergies — **autocomplete search against ingredient_aliases** (user types 'pea...' → shows Peanuts, Peas). Stores ingredient IDs in user_diet_rules.excluded_ingredients integer[]. Step 4: Cuisine buckets. | Dishes 81-100. Cuisine icon images for onboarding. Compile breakfast item names + images for Step 5. Ensure ingredient_aliases has entries for all common allergens in English + Hindi. | Bucket selector works. Allergen autocomplete stores IDs. Steps 1-4 complete. |

## Week 4: Steps 5-7 + Review

| **Day** | **Dev Tasks** | **Content Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **1-2** | Step 5 (Breakfast buckets) + Step 6 (Lunch-Dinner combined). Reuse Bucket Selector. Items filtered by Step 4 cuisine selections. | Dishes 101-130. Compile lunch/dinner items for Step 6. Populate region_food_affinity for 5 key states. | Steps 5-6 work. Data flows to user_category_preferences. |
| **3-4** | Step 7 (Almost There: role, notifications, location, family members optional). Onboarding completion: set onboarding_completed = true, record user_consent entries. | Dishes 131-160. Review onboarding item lists for Indian market coverage. | Full 7-step onboarding end-to-end. |
| **5** | End-to-end test: signup → verify → onboarding → all data stored. Test: back nav, partial save, resume after kill. Sprint 2 review. | Identify first 20-30 dish combos (inseparable pairs like Chole Bhature, Rajma Chawal). Document combo_type and components. | Sprint 2 Milestone: onboarding perfect. |

**Risk:** Bucket selector drag-drop is hard. Fallback: tap-to-cycle (tap chip, cycles F → O → N → unsorted). Ship tap version, add drag later.

**  SPRINT 3: THE CORE  **  |  Weeks 5-6  

**Milestone: ****User sees a personalized meal plan and can swipe through options**

**Make or break sprint.** When done, the app does its core job.

## Week 5: Meal Card + Home Page

| **Day** | **Dev Tasks** | **Content Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **1-2** | Build Meal Card component: photo with gradient, dish name, cuisine tag, time + calories, action icons. Progressive loading (Blurhash → full). For combos: card shows combo_name, displays component dishes below. | Dishes 161-200. Photos in Cloudinary (3 sizes). Generate Blurhash for 100 dishes. Populate dish_combos + dish_combo_items for 20-30 combos. | Meal Card renders with real data. Combos display correctly. |
| **3-5** | Build Home Page: search icon, notification bell, date navigator, 3 Meal Cards (Rubik's Cube layout). Horizontal swipe carousel per card. Footer nav (4 tabs, 2 grayed). Carousel shows both dishes and combos. | Dishes 201-250. dish_tags for all. Populate parent_dish_id for known variants (Dosa family, Paneer family, etc.). | Home Day View shows 3 cards. Swipe works for dishes and combos. |

## Week 6: RE v1 + Plan Generation

| **Day** | **Dev Tasks** | **Content Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **1-3** | Build generate-first-plan Edge Function (RE v1): read user prefs + diet rules (integer-based exclusions), hard filters using auto-derived allergens/diet_type, soft scoring (cuisine + meal item + weather + home state + variety + random), write to planner + planner_carousel. Handle both dishes and combos in scoring. | Dishes 251-300. OpenWeatherMap integration test. Weather_affinity tags on first 200 dishes. Help test: 'Does this plan make sense for a Jain user from Delhi?' | Personalized plan after onboarding. < 3 seconds. |
| **4-5** | Weather Edge Function. Wire Home to fetch from planner_carousel. Empty state → trigger generate-first-plan. Gesture tutorial overlay. Sprint 3 review. | Verify regional_food_affinity for 5 states. Verify auto-derivation: all 300 dishes have correct allergens, diet_type, is_jain. | Sprint 3 Milestone: personalized plan with weather. THE APP WORKS. |

**Risk:** If full 10-step RE pipeline is too ambitious, ship simplified: hard filters + cuisine boost + random. Iterate to full pipeline in Sprint 6.

**  SPRINT 4: DEPTH  **  |  Weeks 7-8  

**Milestone: ****All PRD gestures work. Every interaction logged for RE learning.**

## Week 7: Meal Detail + Ingredients

| **Day** | **Dev Tasks** | **Content Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **1-3** | Meal Detail Page: hero image, dish info, Food DNA tag chips, ingredient list from meal_ingredients JOIN ingredients, auto-derived dietary badges (Jain, Vegan, Gluten-Free). For combos: show component dishes with individual ingredient lists. | Dishes 301-350. Ingredient lists for 101-300. Ingredient flags for all new ingredients. Run batch derive-dish-attributes. | Meal Detail shows dish info + ingredients. Dietary badges auto-display. |
| **4-5** | Grocery List: aggregate ingredients from plan via meal_ingredients. Group by category. Checkboxes. Serving adjuster. For combos: combine component ingredients, de-duplicate. | Dishes 351-400. Verify ingredient names standardized (check duplicates via ingredient_aliases). | Grocery list works for dishes and combos. |

## Week 8: Gestures + Passive Feedback

| **Day** | **Dev Tasks** | **Content Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **1-3** | Gestures: long-press + down = Never (confirmation modal, write to never_list with ref_type dish/combo/ingredient, load replacement). Long-press + up = Not Today. Lock modal. Plus → Date Picker. Build regenerate-slot Edge Function. | Dishes 401-450. Begin Tier 2 batch tagging: auto-derive cooking_method, texture. AI-tag remainder. Queue human review. | All gestures work. Never/Not Today/Lock functional. |
| **4-5** | **Passive Feedback Loop:** wire suggestion_logs — every swipe, tap, lock, never, not-today creates a log entry with ref_type (dish/combo) and ref_id. This is SILENT data collection. No UI. Essential for RE v2. Sprint 4 review. | Human review of Tier 2 tags on first 200 dishes. Correct ~15% errors. Dishes 451-480. | Sprint 4 Milestone: all interactions logged. RE has learning data. |

**  SPRINT 5: DISCOVERY  **  |  Weeks 9-10  

**Milestone: ****500 dishes loaded, all auto-derived, full app usable**

## Week 9: Search + Filters + Auto-Derivation

| **Day** | **Dev Tasks** | **Content Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **1-3** | Search: full-text via tsvector (dishes.name + short_desc + term_synonyms). Results as card grid. Filter bottom sheet: cuisine, meal type, protein type. Meal Listing page. Plus → add to plan. | Dishes 481-500. ALL 500 COMPLETE with Tier 1 + Tier 2. Simple ingredients for all. Ingredient flags on ALL ingredients. | Search works. 500 dishes searchable. Filters work. |
| **4-5** | Build derive-dish-attributes Edge Function. Run batch derivation on ALL 500 dishes. Verify: every dish has auto-derived allergens[], diet_type, is_jain, dietary_tags[], ingredient_ids[]. Conflict detection: flag manual vs derived mismatches. | Quality audit: random 50 dishes. Verify tags, photos, ingredients, auto-derived values. Populate dish_similar via similarity script. Region_food_affinity for remaining states. | Auto-derivation complete. All 500 dishes verified. |

## Week 10: Week View + Profile

| **Day** | **Dev Tasks** | **Content Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **1-3** | Week View: Day/Week toggle, 7-day BLD grid, scroll, today highlighted. Build generate-daily-plans CRON (5 AM batch for all users). | Complete Tier 2 for all 500 dishes. Final human review pass on tags. | Week View works. CRON generates plans daily. |
| **4-5** | Profile page: photo, name, preferences (link to re-run onboarding step), notification settings, password, premium placeholder, logout. Pull-to-refresh on Home. Sprint 5 review. | Verify all 500 dishes: dish_combos populated, parent_dish_id set for variants, dish_role assigned. | Sprint 5 Milestone: full app usable. 500 dishes. All data verified. |

**  SPRINT 6: INTELLIGENCE  **  |  Weeks 11-12  

**Milestone: ****RE learns from behavior. Founders see daily metrics. Feature-complete MVP.**

## Week 11: Notifications + RE v2

| **Day** | **Dev Tasks** | **Deliverable** |
| --- | --- | --- |
| **1-3** | OneSignal SDK. Push flow: 5 AM CRON → 5:15 AM notification with breakfast preview → deep link to Home. notification_log tracking. Notification settings in Profile. | Morning notification arrives. Tap opens plan. Opens tracked. |
| **4-5** | calculate-inferred-prefs Edge Function (weekly CRON): reads suggestion_logs, computes spice_tolerance, repeat_tolerance, coherence_sensitivity. Writes to user_inferred_prefs. Wire RE to read inferred prefs (RE v2). Build user_recipe_affinity pre-computation on preference change. | RE v2 live: reads inferred preferences + pre-computed affinity. |

## Week 12: Analytics + Offline

| **Day** | **Dev Tasks** | **Deliverable** |
| --- | --- | --- |
| **1-3** | PostHog + Sentry setup. app_events tracking: app_open, screen_view, feature_tap, search_query. daily-analytics-email Edge Function (11 PM CRON, 13 metrics). aggregate-behavioral weekly CRON. | Founders receive daily email. PostHog real-time. Sentry catches errors. |
| **4-5** | Offline support: cache today's plan in AsyncStorage, show cached when offline with banner. Pending actions queue (never/lock/not-today synced on reconnect). Sprint 6 review. | Sprint 6 Milestone: feature-complete MVP. 25 features working. |

**  SPRINT 7: POLISH + LAUNCH  **  |  Weeks 13-14  

**Milestone: ****App submitted to Google Play Store**

**No new features.** Only fixing, testing, submitting. Resist 'one more thing.'

| **Days** | **Tasks** | **Deliverable** |
| --- | --- | --- |
| **W13 D1-2** | Full walkthrough on 3+ physical devices. Fix visual bugs: text overflow, image loading, gesture zones, font scaling. | Zero critical bugs. Zero high bugs. |
| **W13 D3-4** | Performance: launch < 3s, swipe < 100ms, plan gen < 3s on budget Android. Test offline. Test notification deep links. | Performance targets met on budget phone. |
| **W13 D5** | Beta test: 10-15 people matching Riya profile. Google Form feedback. Fix show-stoppers only. | Beta tested. Critical issues addressed. |
| **W14 D1-2** | EAS Build for production Android: eas build --platform android --profile production. Test production build on physical device. | Production build passes. |
| **W14 D3-4** | Submit to Google Play (EAS Submit). All metadata: title, description, screenshots (4+), keywords, privacy policy URL, content rating. Review typically 1-3 days. | App submitted to Play Store. |
| **W14 D5** | Monitor review. Respond to questions. If rejected: fix, rebuild, resubmit (+2-3 days). Prepare launch announcement. | Sprint 7 Milestone: APP IS LIVE. |

# 4. Content Track Summary (Founder 2)

| **Sprint** | **Target** | **Deliverables** | **Cumulative** |
| --- | --- | --- | --- |
| **1** | **20** | First 20 dishes + photos + Tier 1 + dish_role + ingredients. 100 core ingredients with flags. cuisines_master + tags table populated. | **20 dishes, 100 ingredients** |
| **2** | **100** | Dishes 21-100. Ingredient lists for 1-50. ingredient_aliases (Hindi) top 50. region_food_affinity 5 states. 20-30 dish_combos identified. | **100 dishes, 30 combos** |
| **3** | **250** | Dishes 101-250. dish_tags all. Blurhash 100 dishes. Weather affinity. parent_dish_id for variant families. dish_combos populated. | **250 dishes, 50 combos** |
| **4** | **400** | Dishes 251-400. Ingredients 51-300. Tier 2 batch: auto-derive + AI-tag + human review first 200. | **400 dishes** |
| **5** | **500** | ALL 500 COMPLETE. Tier 1+2 on all. dish_similar populated. Auto-derivation verified. dish_role on all. Quality audit. | **500 dishes, 200+ ingredients** |
| **6** | **—** | App store screenshots (4+ Android). Description, keywords, release notes. Privacy policy. Terms of service. | **500 (content freeze)** |
| **7** | **—** | Beta support. Fix content issues. Launch announcement. | **500 (launch ready)** |

# 5. Critical Dependencies

| **Feature** | **Depends On** | **Blocks** | **Risk if Late** |
| --- | --- | --- | --- |
| **Auth (S1)** | Supabase setup | Everything | CRITICAL: 1 week slip = all slip |
| **Bucket Selector (S2)** | No blocker | Onboarding → first plan | HIGH: complex UI |
| **Autocomplete Allergens (S2)** | ingredients_master with flags | Correct diet exclusions | MEDIUM: +1 day if ingredients not ready |
| **RE v1 (S3)** | Onboarding data + 100 dishes | Home Page, all interactions | CRITICAL: no product without this |
| **Auto-Derivation (S5)** | All 500 dishes with ingredients linked | Correct allergens, diet_type, is_jain | HIGH: wrong derivation = safety issue |
| **Suggestion Logs (S4)** | RE v1 + gestures | RE v2, analytics | CRITICAL: RE can't learn without this |
| **500 Dishes (S5)** | Content work throughout | Launch readiness | HIGH: sparse DB = repetitive suggestions |

# 6. What to Cut If Behind

| **Priority** | **Cut** | **Impact** |
| --- | --- | --- |
| **Cut 1st** | **Week View** | Users live in Day View. Add post-launch. Saves ~3 days. |
| **Cut 2nd** | **Gesture tutorial** | Users discover via exploration. Add help icon instead. Saves ~1 day. |
| **Cut 3rd** | **Grocery List** | Ingredients visible on Meal Detail. Separate list is convenience. Saves ~2 days. |
| **Cut 4th** | **Pull-to-refresh** | 5 AM CRON generates fresh plans. Manual refresh is power-user. Saves ~1 day. |
| **Cut 5th** | **Analytics email** | Use PostHog dashboard directly. Saves ~1 day. |
| **NEVER cut** | **RE v1 scoring** | Without this, app is random dish viewer. THIS IS THE PRODUCT. |
| **NEVER cut** | **Suggestion logging** | Without this, RE never learns. Silent but critical. |
| **NEVER cut** | **Auto-derivation** | Without this, allergen safety fails at scale. Non-negotiable. |

# 7. Budget

| **Expense** | **Cost** | **Notes** |
| --- | --- | --- |
| **Google Play Account** | **Rs 2,100 one-time** | Apply Sprint 1 Day 1 |
| **Domain Name** | **Rs 800/year** | For referral links + future web |
| **Claude Pro (includes Claude Code)** | **Rs 1,700/mo x 4 = Rs 6,800** | Primary dev tool. Already subscribed for project. |
| **Food Photography** | **Rs 5,000-8,000** | Batch commission for 100+ dishes. Rest from free stock. |
| **Supabase (free tier)** | **Rs 0** | 500MB DB, 50K MAU covers MVP |
| **Cloudinary (free tier)** | **Rs 0** | 25GB bandwidth |
| **OneSignal, PostHog, Sentry** | **Rs 0** | All free tiers |
| **TOTAL (14 weeks)** | **Rs 11,500-17,700** | Remaining from Rs 50K-1L budget: Rs 32,000-88,000 |

# 8. Pre-Launch Checklist

| **Product ****&**** Content** | **Technical** |
| --- | --- |
| 500 dishes with Tier 1 + Tier 2 tags | 38 tables created with RLS policies |
| Simple ingredients for all 500 dishes | Auth: signup, verify, login, forgot password, logout tested |
| Ingredient flags on ALL ingredients | Auto-derivation verified: allergens, diet_type, is_jain correct |
| dish_combos populated for 50+ combos | RE v1 generates plans in < 3 seconds |
| parent_dish_id set for all variant families | Integer-based diet exclusions working (no text matching) |
| dish_role assigned to all 500 dishes | Push notifications delivered with deep links |
| Photos for all 500 in Cloudinary (3 sizes) | Offline: cached plan shown with banner |
| Blurhash generated for all photos | Error states handled gracefully (empty pool, network, image) |
| dish_similar populated | Performance: launch < 3s, swipe < 100ms on budget Android |
| region_food_affinity for all 28 states | Privacy policy + Terms of Service live |
| 10-15 beta testers used app 3+ days | DPDP: user_consent recorded, data export works, deletion cascades |
| Play Store screenshots + description ready | Sentry + PostHog + OneSignal receiving events |

***See Doc #12 Appendix for Phase 0.5, Phase 1, and Phase 1.5 sprint plans, post-launch priorities, and the complete project timeline from Week 0 to Week 26 (revenue activation).***

Page
