*Post-Launch Sprint Plans  |  Confidential*

DOCUMENT #12 APPENDIX  |  REVISED

**Post-Launch Sprint Plans**

Phase 0.5  |  Phase 1  |  Phase 1.5

12 Weeks Post-Launch  |  Rolling Releases  |  Week 14 to Week 26

*Version 2.0  |  April 2026  |  Confidential*

# 1. Post-Launch Strategy

**Rolling releases, not big-bang phases.** Features ship as soon as they're ready via OTA updates (JS-only changes skip app store review) or app store updates (when native SDK changes are needed). Users experience continuous improvement.

**Team velocity is 1.5-2x faster** than MVP sprints. Learning curve gone. Codebase familiar. AI tools workflow refined.

**Content enrichment runs parallel:** Recipe master expanded with additional tags, full recipes for top dishes, new dishes 501-750+, Tier 2 tag completion.

**  PHASE 0.5: ENHANCED MVP  **  |  Weeks 15-19 (4-5 weeks)  

**Milestone: ****iOS live. Pantry working. 100 recipes. Product is polished.**

**8 features. Makes the free product genuinely excellent before monetization activates.**

| **Feature** | **Effort** | **Dev Details** | **Ship Method** |
| --- | --- | --- | --- |
| **Google Sign-In** | 1-2 days | Supabase OAuth config + 'Continue with Google' button on Auth Gate. Test flow. | OTA update |
| **Advanced Filters** | 3-4 days | Sub-category, cooking time slider, calorie range, complexity chips on Search. | OTA update |
| **Extended Notifications** | 1-2 days | Evening prep reminder (8 PM), not-locked dinner reminder (6 PM). Extra CRONs. | OTA update |
| **Carousel End → Search** | 0.5 day | Position 9 card: 'Want something specific?' Pre-filtered search link. | OTA update |
| **Additional Profile Fields** | 1-2 days | Family members form (name, type, food_pref). Writes to family_members table. | OTA update |
| **Full Recipes (Top 50-100)** | 3-4 days dev | Recipe tab on Meal Detail. Populate recipes + recipe_steps tables. Tab bar: Ingredients │ Recipe. | OTA (data) + OTA (UI) |
| **Pantry System** | 8-10 days | Pantry tab activated. Item list by category. Search add (autocomplete ingredients_master). Photo add (simple). Check Pantry on Meal Detail: green (have) / red (missing). | App store update |
| **iOS Launch** | 3-5 days dev | Apply Apple Dev ($99). iOS build via EAS. Platform tweaks (Safe Area, haptics). Submit to App Store. | New platform |

## Phase 0.5 Content Track

Level 3 recipes for top 50-100 dishes (from acceptance analytics). Dishes 501-650. Tier 2 completion on new dishes. ingredient_aliases expanded to 200+ Hindi entries. dish_combos expanded. Recipe master enrichment: additional tags, macro verification.

**  PHASE 1: SMART FEATURES  **  |  Weeks 20-22 (3 weeks)  

**Milestone: ****RE is mood-aware + calorie-aware. Cooking diary creates engagement habit.**

**4 features. Product feels intelligent. Users see the RE actively learning and adapting.**

| **Feature** | **Effort** | **Dev Details** | **Ship Method** |
| --- | --- | --- | --- |
| **WhatsApp Referral** | 2-3 days | Generate referral_code on signup. Share button in Profile. Pre-filled WhatsApp message. track-referral Edge Function. 15 premium days per referral. Referral landing page. | OTA update |
| **Mood Selector** | 2-3 days | UI: mood chips on Home (Chill, Festive, Party, Comfort, Adventurous). RE integration: mood modifies scoring weights for that session. Festive → boost rich/heavy/sweet. Chill → boost light/simple. | OTA update |
| **Calorie Targeting** | 3-4 days | Settings: daily calorie target. RE: dishes within +/-10% of target boosted. Beyond 20% demoted. Display calorie badge on meal cards when targeting active. | OTA update |
| **Cooking Diary** | 5-7 days | I Cooked button on Meal Detail. Logs: dish_id, date, optional photo, rating (1-5), comments, recipe_changes jsonb. Diary tab (activate from grayed). user_diary table populated. Ratings feed into RE scoring. | App store update |

## Phase 1 Content Track

Dishes 651-700. Level 3 recipes for dishes 51-75. Calorie data verification across all 650+ dishes. Mood-specific dish tagging (which dishes are 'comfort food'? which are 'party food'?). Region food affinity updates based on 2 months of user data.

**  PHASE 1.5: REVENUE ACTIVATION  **  |  Weeks 23-28 (5-6 weeks)  

**Milestone: ****Premium pricing live. Ads generating revenue. 3-month free period ends.**

**8 features. The business model activates. By this point, users have been using the app for 2+ months and formed habits. The conversion pitch is strong.**

| **Feature** | **Effort** | **Dev Details** | **Ship Method** |
| --- | --- | --- | --- |
| **Premium Tier Visibility** | 1-2 days | Tier comparison card in Profile + Settings. Shows Free vs Premium vs Premium Plus. Priced at Rs 0 during free period, prices shown for post-period. | OTA update |
| **Guest Mode** | 2-3 days | 'Explore as Guest' on Auth Gate. Sample plan (popular dishes, not personalized). Limited: no lock/never/gestures. Signup prompt after 2nd interaction. | OTA update |
| **Family Profiles** | 3-5 days | Multiple profiles under one account. Kid-friendly filtering (exclude spicy, complex). Preference blending in RE for family meals. Activate family_members table. | OTA update |
| **Audio/Video Recipes** | 3-4 days dev | Video player on Meal Detail (tab: Ingredients │ Recipe │ Video). Audio walkthrough. Top 20 dishes. YouTube embed or native player. | App store update |
| **Ad Integration (AdMob)** | 3-4 days | react-native-google-mobile-ads SDK. Banner: bottom of Home, between search results. Interstitial: every 5th dish detail. NEVER during recipe/cooking. Free tier only. | App store update |
| **Premium + Premium Plus Go Live** | 3-5 days | In-app purchase (Play Store + App Store). Tier gating: premium features locked for free, unlocked for paid. Subscription management. Upgrade/downgrade flow. | App store update |
| **Cluster-based RE (v3)** | 8-10 days | K-means on user_behavioral_profile vectors. cluster_metadata + user_clusters tables activated. New users get cluster-seeded suggestions. Requires 5K+ MAU. If < 5K, defer. | Backend only |
| **User Ratings on Dishes** | 2-3 days | Star rating (1-5) on Meal Detail. Writes to user_feedback or user_diary. Aggregate rating displayed on dish cards. Feeds RE: highly-rated dishes boosted. | OTA update |

## Phase 1.5 Content Track

Dishes 701-750. ALL 750 DISHES COMPLETE. Level 3 recipes for 100+ dishes. Video content for 20 dishes. Complete recipe master enrichment: Tier 2 on all 750, macro data verified, dish_combos expanded to 80+. Prepare Phase 2 feature prioritization based on analytics.

# 2. Complete Project Timeline: Week 0 to Week 28

| **Weeks** | **Phase** | **What Happens** | **Users Experience** |
| --- | --- | --- | --- |
| **1-2** | **MVP S1** | Foundation: setup, DB (38 tables), auth | In development |
| **3-4** | **MVP S2** | Onboarding + bucket selector + autocomplete allergens | In development |
| **5-6** | **MVP S3** | Home Day View + RE v1 + dish combos | In development |
| **7-8** | **MVP S4** | Meal Detail + gestures + passive feedback logging | In development |
| **9-10** | **MVP S5** | Search + Week View + 500 dishes + auto-derivation | In development |
| **11-12** | **MVP S6** | Notifications + RE v2 + analytics + offline | In development |
| **13-14** | **MVP S7** | Polish + Android launch | APP IS LIVE on Play Store |
| **15-19** | **Phase 0.5** | Google Sign-In, pantry, recipes, advanced filters, iOS launch | Product feels polished. iOS users join. |
| **20-22** | **Phase 1** | Mood selector, calorie targeting, cooking diary, WhatsApp referral | RE feels intelligent. Users share app. |
| **23-28** | **Phase 1.5** | Premium pricing live. Ads. Family profiles. Guest mode. Cluster RE. Ratings. | REVENUE BEGINS. Business is operational. |

# 3. Content Totals by Phase

| **Content** | **MVP** | **Phase 0.5** | **Phase 1** | **Phase 1.5** |
| --- | --- | --- | --- | --- |
| **Dishes in DB** | 500 | 650 | 700 | **750** |
| **Tier 1 + 2 Tags on All** | Yes | Yes | Yes | **Yes** |
| **Dish Combos** | 50+ | 60+ | 70+ | **80+** |
| **Simple Ingredients (Level 2)** | All 500 | All 650 | All 700 | **All 750** |
| **Full Recipes (Level 3)** | 0 | 50-100 | 75+ | **100+** |
| **Video Recipes** | 0 | 0 | 0 | **20** |
| **ingredient_aliases (Hindi)** | Top 100 | Top 200 | Top 250 | **Top 300** |
| **Ingredients with Flags** | All | All | All | **All** |

# 4. Post-Launch Budget (Phases 0.5 + 1 + 1.5)

| **Expense** | **Cost** | **Notes** |
| --- | --- | --- |
| **Apple Developer Account** | **Rs 8,300/year** | Applied Phase 0.5, active for iOS launch |
| **Claude Pro (3 months post-launch)** | **Rs 5,100** | Weeks 15-28 |
| **Supabase (may still be free)** | **Rs 0-2,100/mo** | Upgrade to Pro if exceeding 500MB |
| **Video content (20 dishes)** | **Rs 2,000-5,000** | Phone-recorded or sourced |
| **Food photography (dishes 501-750)** | **Rs 3,000-5,000** | Batch commission |
| **AdMob (generates revenue)** | **Net positive from Phase 1.5** | Revenue offsets costs |
| **TOTAL (Weeks 15-28)** | **Rs 18,000-25,000** | From remaining Rs 32,000-88,000 |

# 5. Phase 2 Readiness Check (Week 28)

Before starting Phase 2, verify these thresholds. If metrics don't hit: stop and fix before building forward.

| **Metric** | **Threshold to Proceed to Phase 2** |
| --- | --- |
| **MAU** | > 3,000 (if < 1,000, focus GTM before building) |
| **DAU/MAU Stickiness** | > 20% (if < 15%, core experience needs fixing) |
| **Day 30 Retention** | > 15% (if < 10%, onboarding or RE needs work) |
| **Suggestion Acceptance Rate** | > 40% (if < 30%, RE needs tuning, not new features) |
| **Premium Conversion** | > 2% (if < 1%, pricing or value prop needs rethinking) |
| **App Store Rating** | > 3.5 (if < 3.0, fix bugs before adding features) |
| **User Feedback** | Users asking for Phase 2 features (modes, health profiles), not complaining about basics |

***26 weeks from project start to revenue activation.**** The app is live from Week 14. Features ship every 1-2 weeks. By Week 28, you have: 750 dishes, full pantry, 100+ recipes, ads running, premium tiers live, iOS and Android, mood-aware RE, cooking diary, family profiles, and enough data to make Phase 2 decisions with confidence.*

Page
