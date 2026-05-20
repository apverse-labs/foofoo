*Recommendation Engine v3  |  Confidential*

DOCUMENT #10  |  REVISED v3

**Recommendation Engine**

**Algorithm Specification**

AI-Powered Meal Decision Assistant

Food DNA Architecture  |  4 RE Versions  |  20 Dimensions  |  3-Tier Tagging

*Version 3.0  |  April 2026  |  Confidential*

*Revision: Food DNA 3-tier taxonomy, revised clustering on food DNA similarity, context tags to Phase 1, coherence sensitivity added*

# 1. Why This Document Exists

The recommendation engine is the product. This document is the **single reference** for building it. Every rule, weight, and threshold is specified with concrete values. Where values are approximate (marked with ~), they should be A/B tested within the first 8 weeks.

**What changed in v2:** Four revisions based on founder review. (1) Expanded recipe tagging to a 3-tier Food DNA taxonomy with 20 dimensions. (2) Clustering now operates on food DNA similarity, not demographic partitions. (3) Context tags moved from MVP to Phase 1. (4) Meal coherence treated as a learned per-user preference, not a fixed rule.

# 2. The 2x2 Growth Matrix

The RE has four operating modes, determined by user base size and individual user maturity. Versions are additive — each layers on top of the previous.

|  | **New User (****<**** 2 weeks active)** | **Mature User (****>**** 2 weeks active)** |
| --- | --- | --- |
| **Low User Base (****<**** 5K MAU)** | **RE v1: Cold Start.** Onboarding inputs (food pref, cuisine buckets, meal buckets, allergies, home state) + pre-loaded research data (regional food maps, demographic patterns). Rule-based scoring with weighted randomization. No context tags. This is MVP launch. | **RE v2: Personal History.** Adds: acceptance history, never list, not-today patterns, swipe analytics, inferred preferences (spice, texture, cooking method, repeat tolerance, coherence sensitivity). Still rule-based, now with personalized weights from 2+ weeks of data. |
| **Large User Base (****>**** 5K MAU)** | **RE v3: Cluster-Seeded.** New user's onboarding profile matched to nearest cluster via **food DNA similarity** (not demographics). Seeded from 2-5 week cohort's top dishes. Context tags activated. Jump-starts personalization via collective intelligence. | **RE v4: Full Personalization.** Personal history (70%) + dynamic cluster trends (30%). Cluster evolves with behavior. Collaborative filtering: 'Users with similar food DNA also loved...' Mood/mode awareness. Calorie targeting. |

**Transitions:** New → Mature: 14 days with 7+ active days. Low → Large: MAU > 5,000 AND 500+ users with 2+ weeks history (enough for meaningful food DNA clusters).

**Key Principle:** Each version layers on top. RE v4 still enforces v1 hard constraints, v2 personal history, and v3 cluster intelligence.

# 3. Food DNA Taxonomy: 20 Dimensions

## 3.1 The Thinking Behind Food DNA

**The Netflix Parallel:** Netflix doesn't tag movies as just 'Action' or 'Comedy.' They use ~1,000 micro-tags per title covering plot conclusiveness, moral ambiguity, visual darkness, dialogue-driven vs action-driven. The magic: these tags explain cross-genre preferences. Someone who likes 'The Office' and 'Ted Lasso' seems random by genre, but Netflix sees both are workplace comedies with warm tone, ensemble cast, and feel-good endings.

**Applied to Food:** Surface-level tags (cuisine, diet type) explain WHAT someone eats but not WHY. A user who likes Dosa, Dhokla, and Idli seems random by cuisine (South Indian + Gujarati). But Food DNA reveals: all three are steamed, fermented, light texture, mild spice, savoury, served warm. The engine now knows to suggest Appam (Kerala) or Rava Idli — dishes the user never mentioned but that share the same DNA. This is the cross-cuisine pattern matching that makes the engine feel intelligent.

**20 dimensions, organized in 3 tiers.** The architecture supports all 20 from day one (database columns exist), but tagging is phased to manage workload.

## 3.2 Tier 1: MVP Launch (7 Dimensions)

Required for every recipe before launch. These are the basic filters the engine needs to function.

| **Dimension** | **Type** | **Values** | **Engine Role** |
| --- | --- | --- | --- |
| **cuisine** | Enum | north_indian, south_indian, bengali, gujarati, maharashtrian, rajasthani, punjabi, italian, chinese_indo, continental, street_food, etc. | Hard filter (Never bucket) + soft boost (Freq/Occ buckets) |
| **diet_type** | Enum | veg, non_veg, egg, vegan, jain | Hard constraint. Non-negotiable filter. |
| **allergens** | Enum (multi) | gluten, dairy, nuts, soy, shellfish, eggs, none | Hard constraint. Excludes recipes. |
| **spice_level** | Int 1-4 | 1 (mild), 2 (medium), 3 (spicy), 4 (very spicy) | Inferred preference matching after 30+ data points |
| **cook_time_mins** | Integer | Actual minutes: 15, 30, 45, 60, 90+ | Weekday/weekend scoring + difficulty proxy |
| **difficulty** | Enum | easy, medium, hard | Inferred complexity preference matching |
| **calories** | Integer | Per serving kcal (e.g., 250, 400, 600) | Display in MVP. Scoring in Phase 2 (Health Profiles). |

## 3.3 Tier 2: Weeks 4-8 Post-Launch (7 Dimensions)

**Highest impact for cross-cuisine pattern matching.** These are the dimensions that explain WHY someone likes a dish across different cuisines. They transform the engine from 'suggest Indian food you said you like' to 'suggest food that FEELS like what you like.'

| **Dimension** | **Type** | **Values** | **Engine Role** |
| --- | --- | --- | --- |
| **cooking_method** | Enum (multi) | fried, deep_fried, steamed, grilled, baked, smoked, sauteed, boiled, raw, tandoor, pressure_cooked, slow_cooked | Cross-cuisine pattern: 'user prefers steamed over fried' |
| **primary_taste** | Enum (multi) | savoury, sweet, sour, bitter, umami, tangy | Flavour profile matching. Explains unexpected preferences. |
| **texture** | Enum (multi) | crispy, soft, chewy, smooth, crunchy, juicy, dry, flaky, creamy | Key differentiator. 'User loves crispy things' spans cuisines. |
| **heaviness** | Int 1-3 | 1 (light), 2 (moderate), 3 (heavy) | Coherence scoring + meal balance within a day |
| **richness** | Enum | plain, buttery, creamy, oily, ghee_rich | Richness preference varies dramatically by user |
| **sweetness** | Int 0-3 | 0 (not sweet), 1 (mildly sweet), 2 (sweet), 3 (dessert) | Controls dessert/sweet dish frequency per user |
| **weather_affinity** | Enum (multi) | hot_weather, cold_weather, rainy, all_weather | Weather-based scoring boost/demotion |

## 3.4 Tier 3: Phase 2+ (6 Dimensions)

Deep personalization dimensions. These add nuance once the engine and user base are mature.

| **Dimension** | **Type** | **Values** | **Engine Role** |
| --- | --- | --- | --- |
| **mouthfeel** | Enum (multi) | mealy, pasty, stringy, creamy, grainy, silky, gelatinous | Ultra-specific texture matching for power users |
| **aroma_profile** | Enum (multi) | smoky, earthy, floral, tangy, toasted, pungent, mild, herbal | Aroma preferences correlate strongly with food satisfaction |
| **fermentation** | Enum | none, light (dosa, idli), medium (pickle), heavy (kimchi) | Fermentation lovers form a distinct food DNA cluster |
| **serving_temp** | Enum | hot, warm, room_temp, chilled, frozen | Temperature preference varies by person, meal, season |
| **health_tags** | Enum (multi) | high_protein, low_carb, iron_rich, calcium_rich, galactagogue, recovery_food, fiber_rich | Phase 2 Health Profile integration |
| **ingredient_complexity** | Int | simple (3-5 ingredients), moderate (6-10), complex (11+) | Matches cooking ambition. Correlates with time. |

# 4. Food DNA Tagging: Implementation Plan

Tagging 500+ dishes across 20 dimensions is a significant data operation. The approach is a 3-step hybrid: auto-derive what's computable, AI-tag the subjective dimensions, human-review for accuracy.

## 4.1 Why Hybrid (Not Pure Manual or Pure AI)

**Pure manual:** Most accurate but requires 40-60 hours of focused expert work for Tier 1 alone. Unsustainable as dish database grows to 1,000+.

**Pure AI:** Fast but ~80-85% accurate on subjective dimensions like texture and mouthfeel. 15% error rate on food tags means 1 in 7 dishes has a wrong tag, which degrades engine trust.

**Hybrid (Approach C):** Auto-derive deterministic tags (~40% of work), AI-tag subjective ones (~45%), human-review AI output (~15% corrections). Combines speed with accuracy. Scales as dish database grows.

## 4.2 The 3-Step Pipeline

| **Step** | **Method** | **Details** |
| --- | --- | --- |
| **1** | **Auto-Derive** | Parse each dish's ingredient list and cooking instructions against a keyword-rule map. Rules: 'deep fry' in steps → cooking_method = deep_fried. Green chillies + red chilli powder → spice_level likely 3-4. Flour + sugar + ghee as primary ingredients → primary_taste = sweet. 3 ingredients → ingredient_complexity = simple. 'Serve chilled' → serving_temp = chilled. Covers ~40-50% of Tier 1 and Tier 2 tags automatically. Runs in minutes for 500 recipes. |
| **2** | **AI Batch Tag** | Feed each dish (name + ingredients + cooking method + cuisine) into an AI model with a structured prompt requesting JSON output for each dimension. Process all 500 in batch. Covers subjective dimensions: texture, mouthfeel, aroma, heaviness, richness, primary taste. ~80-85% accuracy. Output: pre-filled tag spreadsheet. |
| **3** | **Human Review** | Founder or food-knowledgeable person reviews the AI-tagged output. NOT tagging from scratch — reviewing pre-filled answers and correcting the ~15% that are wrong. For 500 dishes with 7 Tier 1 dimensions: ~8-10 hours spread over a few days. For Tier 2 (7 more dimensions): additional ~6-8 hours. |

## 4.3 Phasing Schedule

| **When** | **What** | **Details** |
| --- | --- | --- |
| **Pre-Launch** | **Tier 1 (7 dims)** | Run 3-step pipeline for: cuisine, diet_type, allergens, spice_level, cook_time, difficulty, calories. All 500 recipes tagged. This is the minimum viable tagging for MVP. |
| **Weeks 2-4** | **Tier 2 (7 dims)** | Run same pipeline for: cooking_method, primary_taste, texture, heaviness, richness, sweetness, weather_affinity. Engine begins using these as scoring signals immediately once tagged. |
| **Weeks 4-8** | **Tier 2 Refinement** | Validate Tier 2 tags using early user feedback: if dishes tagged 'crispy' get swiped past by users who accept other 'crispy' dishes, the tag is likely wrong. Flag and re-review. |
| **Phase 2** | **Tier 3 (6 dims)** | Tag: mouthfeel, aroma_profile, fermentation, serving_temp, health_tags, ingredient_complexity. By now likely 800+ recipes. Also retro-tag original 500. |
| **Ongoing** | **New Recipes** | Every new recipe enters the pipeline: auto-derive → AI-tag → queue for human review. Reviewed within 48 hours of addition. |

## 4.4 Architecture Decision

**All 20 dimension columns exist in the database from day one**, even though most are null at launch. This means no schema migration later. The engine checks for null before using any dimension in scoring — a null tag is simply skipped, not treated as zero. As columns get populated, the engine automatically starts using them. This is zero-downtime progressive enhancement.

# 5. Constraint System

## 5.1 Hard Constraints (Eliminators)

| **Constraint** | **Rule** | **Source** |
| --- | --- | --- |
| **Diet Preference** | Vegetarian: exclude all meat/fish/egg (unless Eggetarian). Jain: additionally exclude onion, garlic, root vegetables. Vegan: exclude all animal products including dairy, honey, ghee. | Onboarding Step 2 |
| **Allergies** | Exclude any recipe containing a declared allergen in ANY ingredient (including sub-ingredients). Check ingredient tree. | Onboarding Step 3 |
| **Never List** | Exclude dishes long-pressed to 'Never.' Recipe-level exclusion. Reactivation only on mode change. | User Action |
| **Meal Type** | Breakfast recipes only in breakfast slot. Lunch/dinner only in lunch/dinner slots. | Recipe Metadata |
| **Cuisine: Never Bucket** | All recipes from 'Never' cuisines are excluded. | Onboarding Step 4 |

## 5.2 Soft Constraints (Score Modifiers)

| **Constraint** | **Behavior** | **Weight** | **Phase** |
| --- | --- | --- | --- |
| **Cuisine: Frequently** | Recipes from Frequently cuisines get boosted | **+0.3** | MVP |
| **Cuisine: Occasionally** | Occasional cuisines get slight boost | **+0.1** | MVP |
| **Meal Item: Frequently** | Specific items in Frequently bucket boosted | **+0.25** | MVP |
| **Weather Alignment** | Dish-weather match (comfort food on rainy days) | **+0.2** | MVP |
| **Day of Week** | Quick recipes weekdays, elaborate weekends | **+0.15** | MVP |
| **Home State** | Regional dishes from user's state get soft boost | **+0.1** | MVP |
| **Acceptance History** | Previously accepted dishes get personalized boost | **+0.1 to +0.3** | MVP |
| **Rejection History** | Swiped-past dishes get demoted (recoverable) | **-0.1 to -0.2** | MVP |
| **Not Today** | 3-day temporary demotion | **-0.15** | MVP |
| **Spice Tolerance** | Inferred from acceptance patterns of spice_level tags | **+/- 0.1** | MVP |
| **Cooking Method Pref** | Inferred from Tier 2 tags. E.g., 'prefers steamed' | **+/- 0.1** | Tier 2 tagged |
| **Texture Pref** | Inferred from Tier 2. E.g., 'loves crispy' | **+/- 0.1** | Tier 2 tagged |
| **Richness Pref** | Inferred from Tier 2. E.g., 'avoids oily' | **+/- 0.1** | Tier 2 tagged |
| **Coherence** | Per-user meal balance preference (see Section 14) | **Dynamic** | MVP (learned) |
| **Repeat Tolerance** | Per-user, per-meal-slot. Learned cooldown window. | **Dynamic** | MVP (learned) |
| **Cluster Signal** | Dishes popular in cluster but not yet served | **+0.15** | Phase 2 |
| **Calorie Target** | Within +/-10% of target: boost. Beyond: demote. | **+0.2 / -0.2** | Phase 2 |

# 6. Scoring Algorithm

For each meal slot, the engine generates a scored list. Top 5-8 become the swipe carousel.

| **Step** | **Stage** | **What Happens** |
| --- | --- | --- |
| **1** | **Hard Filter** | Full dish database → apply all hard constraints → eligible pool (~40-80% of DB depending on diet). |
| **2** | **Base Score** | Every eligible recipe starts at 1.0. |
| **3** | **Onboarding Boost** | Cuisine bucket weights (+0.3 Freq, +0.1 Occ) + meal item bucket weights (+0.25 Freq, +0.05 Occ). |
| **4** | **Context Boost** | Weather alignment (+0.2), day-of-week (+0.15), home state (+0.1). Changes daily. |
| **5** | **History Modifier** | Acceptance boost (+0.1 to +0.3), rejection demotion (-0.1 to -0.2), not-today (-0.15 for 3 days). RE v2+ only. |
| **6** | **Food DNA Matching** | When Tier 2 is tagged: match user's inferred food DNA profile (preferred cooking methods, textures, richness) against recipe tags. Boost matches (+0.1 each), demote mismatches (-0.05 each). Multiple dimensions can stack. |
| **7** | **Variety Guard** | Repeat penalty based on user's learned tolerance. Same-cuisine daily cap (-0.3 for 3rd same-cuisine meal). Weekly rotation check. |
| **8** | **Coherence Adjustment** | If user has high coherence sensitivity: sequential scoring — breakfast attributes influence lunch scoring, both influence dinner. If low sensitivity: skip. |
| **9** | **Cluster Boost** | RE v3/v4: cluster discovery boost (+0.15) for popular dishes the user hasn't tried. |
| **10** | **Randomization** | Add random 0 to 0.15. Prevents deterministic ordering. Introduces healthy surprise. |
| **11** | **Rank ****&**** Select** | Sort descending. Top 8 for carousel. Position 1 = default shown card. |

**Score Formula:** Final = Base (1.0) + Onboarding + Context + History + Food DNA Match + Variety Penalty + Coherence + Cluster + Random. Typical range: 0.3 to 2.5.

## 6.1 Worked Example

Dosa for breakfast on a rainy Monday, for a Bangalore user with South Indian in Frequently, who has accepted Dosa 3 times in 30 days, and whose Tier 2 tags show she prefers steamed + light + crispy dishes:

| **Component** | **Value** | **Reasoning** |
| --- | --- | --- |
| Base Score | **+1.00** | *Starting point* |
| Cuisine: South Indian (Frequently) | **+0.30** | *Onboarding bucket boost* |
| Meal Item: Dosa (Frequently) | **+0.25** | *Breakfast bucket boost* |
| Weather: Rainy Day Comfort | **+0.20** | *weather_affinity match* |
| Day: Monday (Weekday Quick) | **+0.10** | *Dosa is quick; weekday boost* |
| Home State: Karnataka | **+0.10** | *Regional origin match* |
| History: Accepted 3x in 30 days | **+0.15** | *Positive history* |
| Food DNA: cooking_method=steamed match | **+0.10** | *User prefers steamed (Tier 2)* |
| Food DNA: texture=crispy match | **+0.10** | *Dosa is crispy, user prefers crispy* |
| Food DNA: heaviness=light match | **+0.10** | *Light dish, user prefers light breakfast* |
| Variety: Last served 8 days ago | **+0.00** | *Outside repeat window* |
| Random Factor | **+0.07** | *Random 0 to 0.15* |
| **FINAL SCORE** | **2.47** | Very strong. Likely #1 in carousel. |

**Note:** Without Tier 2 Food DNA tags, this same dish scores 2.17. The 3 food DNA matches add 0.30 — a meaningful boost that helps the right dishes surface higher.

# 7. Suggestion Context Tags (Phase 1)

**Moved from MVP to Phase 1.** Context tags explain why a dish was suggested. When accurate, they build trust. When wrong, they destroy trust faster than showing no tag. We will activate them once: (a) the engine has enough data to make confident attributions, and (b) Tier 2 food DNA tags are populated.

| **Top Signal** | **Tag Template** | **Example** |
| --- | --- | --- |
| **Weather: Rainy** | Your rainy day comfort | *'Your rainy day comfort'* |
| **Weather: Hot** | Light and refreshing | *'Light and refreshing'* |
| **Weather: Cold** | Warm and cozy | *'Warm and cozy'* |
| **Cuisine: Frequently** | Because you love [Cuisine] | *'Because you love South Indian'* |
| **Home State Match** | A taste of home | *'A taste of home'* |
| **Weekday Quick** | Quick bite for a busy day | *'Quick bite for a busy day'* |
| **Weekend Elaborate** | Weekend special | *'Weekend special'* |
| **High Accept History** | One of your favorites | *'One of your favorites'* |
| **Cluster Popular** | Trending in your circle | *'Trending in your circle'* |
| **New Discovery** | Something new to try | *'Something new to try'* |
| **No Strong Signal** | Chef's pick for today | *'Chef's pick for today'* |

**Activation Rule:** Only show a tag when the top signal contributes > 0.2 to the score. Below that threshold, use 'Chef's pick for today.' One tag per dish, max 5-6 words. Priority when signals are close: weather > personal history > cuisine > generic.

# 8. Variety Guard & Repeat Tolerance

## 8.1 System-Level Variety Rules

| **Rule** | **Details** |
| --- | --- |
| **Same Dish Cooldown** | Cannot be #1 suggestion within user's repeat window. CAN appear in positions 2-8 after 50% of cooldown. |
| **Same Cuisine Cap** | Max 2 meals per day from same cuisine. 3rd gets -0.3 penalty (not hard block). |
| **Weekly Rotation** | Over 7 days, ensure 3+ different cuisines. If last 5 days all same cuisine, boost others +0.2. |
| **Ingredient Diversity** | Avoid same primary protein/base in consecutive meals. Paneer for lunch → demote paneer for dinner. |

## 8.2 Per-User Repeat Tolerance Learning

| **Mechanism** | **Details** |
| --- | --- |
| **Default** | 5-day repeat window for new users. |
| **Learning Signal** | User searches for and adds a recently-served dish → HIGH tolerance. User Never's or Not-Today's a recent dish → LOW tolerance. |
| **Score** | Scale 1-10. Default: 5. Score 1: 10-day window (hates repeats). Score 10: 2-day window (loves repeats). Formula: window_days = 12 - tolerance_score. |
| **Per-Meal Slot** | Tracked separately for B, L, D. User may want same breakfast daily but varied dinner. |
| **Update Cycle** | Every 7 days, using last 30 days. Max change: 2 points per recalculation. |
| **Override** | Explicit user action (search + add) always overrides system variety guard. |

# 9. Never List Intelligence

| **Rule** | **Specification** |
| --- | --- |
| **Hard Block** | Active Never List items excluded entirely. Do not appear in carousel or search results (unless user searches exact name). |
| **Reactivation** | Triggers: (a) User switches Mode (Fasting/Recovery/Pregnancy) and dish is tagged for it. (b) Manual removal from Profile. (c) Explicit search and add. |
| **Mode Change Alert** | On mode activation, scan Never List for mode-relevant dishes. Reactivate with notification: 'Some dishes re-suggested for your [Recovery] diet. You can re-add to Never.' |
| **Growth Monitor** | If Never List > 30% of eligible pool, prompt: 'You have X dishes in Never. Want to review? Tastes may have changed.' |
| **Analytics** | Track: most-Never'd dishes (recipe quality signal), Never List size distribution, reactivation acceptance rate. |

# 10. Weather-to-Food Mapping

| **Weather** | **Boost** | **Demote** |
| --- | --- | --- |
| **Hot (****>**** 35°C)** | Light, cold, refreshing, yogurt-based, salads, curd rice, chaas, fruit, smoothies | Heavy, fried, cream-based, hot soups |
| **Warm (28-35°C)** | Balanced, grilled, tandoori, stir-fry, rice-based | Very heavy (slight demotion only) |
| **Pleasant (20-28°C)** | No weather bias. Neutral baseline. | None |
| **Cold (****<**** 20°C)** | Warm, soupy, ghee-rich, halwa, thick dals, stews, hot beverages | Cold, raw, salad-heavy |
| **Rainy** | Comfort: pakora, khichdi, maggi, chai-snacks, samosa, poha, hot soups | Salads, cold items, elaborate meals |
| **Humid (****>**** 80%)** | Light, steamed, less oil, idli, dhokla, upma | Heavy, cream-based, fried |

**API:** OpenWeatherMap free tier. Fetched once per city per day at 5:00 AM. Cached 12 hours. Fallback: previous day's data. City from device location or IP-based geolocation or home state capital.

# 11. Research Data Integration

Founder provides research documents. Approach: **codify into structured lookup tables** for deterministic, version-controlled, testable integration.

| **Category** | **Contains** | **Engine Integration** |
| --- | --- | --- |
| **Regional Food Map** | State-wise popular dishes, staple ingredients, festival foods, regional meal patterns | region_food_affinity table. State → [dish_id, affinity_score]. Feeds home state boost. |
| **Gender Patterns** | Calorie needs by gender, nutritional gaps, portion patterns | gender_nutrition_profile. Phase 2: calorie targeting. MVP: portion defaults only. |
| **Family Composition** | Child-friendly, infant-safe, elderly-appropriate dishes | recipe_family_tags. Phase 1 when family members added. |
| **Religion-Specific** | Jain rules, fasting rules (Hindu, Ramadan, Lent), langar preferences | religion_food_rules. Jain = hard constraint MVP. Fasting = Phase 2 User Modes. |
| **Seasonal Patterns** | Month + region → seasonal dishes, festival foods, monsoon/summer/winter specialties | season_food_calendar. Soft boost +0.1 to +0.15. |

**Pipeline:** Receive docs → AI-assisted extraction to JSON/CSV → human validation → load to DB → map to recipes → activate in engine. Refreshed quarterly.

# 12. Clustering Algorithm (Revised: Food DNA Similarity)

**Key change from v1:** Clustering no longer uses home state as a hard partition. A Maharashtrian non-veg dish (Kolhapuri Chicken) and a Naga non-veg dish (Smoked Pork with Bamboo Shoot) are worlds apart despite both being 'non-veg from India.' State-based partitioning would incorrectly group these users. Instead, clustering operates on **food DNA similarity** — what users actually like to eat, not where they're from.

## 12.1 New User Cluster Assignment

| **Layer** | **Attribute** | **How It's Used** |
| --- | --- | --- |
| **1** | **Hard Constraints** | Diet preference (veg/non-veg/jain/vegan) + allergies. This is the ONLY hard partition. A Jain user never matches a non-veg cluster. |
| **2** | **Food DNA Similarity** | Within the hard-constraint partition, compute a single similarity score combining: cuisine bucket vector (Jaccard on Frequently set, weight 0.4), meal item bucket vector (Jaccard, weight 0.3), and home state as a weighted signal (weight 0.15) + research data regional patterns (weight 0.15). State is a SIGNAL, not a FILTER. Two users from different states who love similar cuisines end up in the same cluster. |
| **3** | **Cohort Window** | Within the matched cluster, focus on users in the 2-5 week maturity range. These users have enough history for validated preferences but are recent enough to be representative. |
| **4** | **Seed Suggestions** | Extract top 20 most-accepted dishes from cohort window. These seed the new user's carousel, layered on top of their own onboarding preferences. |

**Why this works:** A veg user from Maharashtra who loves Gujarati snacks will cluster with veg Gujarati users, not with non-veg Maharashtrian users. The food DNA determines the cluster, not the passport. This also solves the 'small partition' problem — no more clusters of 5 Jain users from Rajasthan that are too small for meaningful recommendations.

## 12.2 Mature User Re-Clustering

| **Mechanism** | **Details** |
| --- | --- |
| **Behavioral Profile** | After 2+ weeks, actual behavior creates a food DNA behavioral vector: accepted dish tags (cooking_method distribution, texture distribution, richness, spice), rejection patterns, repeat tolerance, coherence pattern. |
| **Re-Clustering** | Every 14 days, compare user's behavioral vector against cluster centroids. If cosine similarity with a different cluster exceeds current by > 0.15, re-assign. Handles drift: user starts eating more South Indian → gradually moves to South-Indian-heavy cluster. |
| **Hybrid Signal** | RE v4: 70% personal history + 30% cluster trends. Cluster surfaces dishes similar users love but this user hasn't tried. |
| **Cluster Size** | Target: 50-200 users. < 20: merge with nearest. > 500: split on most differentiating food DNA dimension. |
| **Similarity Metric** | Mature users: 0.6 * cosine(food DNA behavioral vector) + 0.4 * jaccard(onboarding buckets). New users: 1.0 * jaccard(onboarding) + state_signal. |

## 12.3 Technical Implementation

| **Component** | **Approach** |
| --- | --- |
| **Algorithm** | K-means with dynamic K (silhouette score). Features: cuisine bucket vector, meal item vector, food DNA behavioral vector (cooking method dist, texture dist, richness, spice, sweetness, repeat tolerance). All encoded numeric. |
| **Refresh** | Full rebuild: weekly (Sunday 2 AM). User re-assignment: every 14 days. New user assignment: real-time on onboarding completion. |
| **Storage** | cluster_metadata: cluster_id, centroid_vector, size, top_dishes[], food_dna_profile. user_cluster: user_id, cluster_id, similarity_score, assigned_at. |
| **Scalability** | K-means efficient to 100K users. Beyond: mini-batch K-means or ANN for real-time assignment. |

# 13. Inferred Preference Engine

Preferences inferred from behavior, never asked explicitly. Each waits for a minimum data threshold before activating.

| **Preference** | **How Learned** | **How Applied** | **Min Data** |
| --- | --- | --- | --- |
| **Spice Tolerance** | Weighted avg of accepted dish spice_level over 30 days vs rejected. | High (avg > 2.5): boost spicy +0.1, demote mild -0.05. Low (avg < 1.5): reverse. | 30 accept/reject |
| **Texture Preference** | Distribution of texture tags in accepted dishes. E.g., 60% crispy, 20% soft. | Boost user's top 2 textures +0.1 each. Demote bottom texture -0.05. | 30 accepts (Tier 2) |
| **Cooking Method Pref** | Distribution of cooking_method in accepted. E.g., steamed 40%, fried 30%. | Boost preferred methods +0.1. Skip if no clear preference (< 30% any method). | 30 accepts (Tier 2) |
| **Richness Preference** | Track richness of accepted vs rejected. Some users avoid oily/heavy. | If consistently rejects richness > 'buttery', demote rich dishes -0.1. | 20 accepts (Tier 2) |
| **Sweetness Tolerance** | Acceptance rate of sweet/dessert dishes. | If < 10% acceptance of sweets: reduce to max 1 sweet/week. | 15 sweet suggestions |
| **Complexity Pref** | Difficulty level of accepted recipes. | Boost user's preferred difficulty +0.1. Stronger on weekdays. | 20 accepts |
| **Cuisine Drift** | If actual acceptance diverges from onboarding buckets by > 20%. | Gradually adjust effective weights. Don't override onboarding. | 30 days of data |
| **Coherence Sensitivity** | See Section 14 (dedicated section). | Controls meal balance within a day. | 14 days |

# 14. Meal Coherence Sensitivity (New)

**The insight:** Meal coherence (balancing heavy and light meals across a day) is not universal — it's a personal preference. A 22-year-old from Punjab who does heavy lifting may genuinely want Chole Bhature for breakfast, Butter Chicken for lunch, and Biryani for dinner. Forcing 'lightness' on them would feel like the app doesn't understand them. Meanwhile, a 35-year-old professional in Mumbai naturally alternates heavy and light meals.

**The solution:** Treat coherence as a learned per-user preference, not a fixed rule.

| **Mechanism** | **Details** |
| --- | --- |
| **What It Measures** | Does this user naturally balance heavy and light meals within a day, or do they eat consistently heavy or consistently light all day? |
| **Learning Signal** | Track the heaviness tag (1-3) of accepted meals per day. Calculate heaviness variance per day over 14 days. High variance (e.g., light breakfast + heavy lunch + light dinner) = high coherence sensitivity. Low variance (all heavy, or all light) = low sensitivity. |
| **Sensitivity Score** | Scale 0 to 1. Default: 0.5 (neutral). Score 0: user eats same heaviness all day (no coherence needed). Score 1: user strongly alternates heavy/light. |
| **Default Priors** | Before learning kicks in (first 14 days), use soft priors: Age < 25 → default 0.3 (lower sensitivity). Age 25-40 → default 0.5 (neutral). Age > 40 → default 0.6 (slightly higher). Users from heavy-food regions (Punjab, UP, Rajasthan) → -0.1 adjustment. These are gentle starting points, rapidly overridden by actual behavior. |
| **How It Affects Scoring** | When sensitivity > 0.5: sequential generation activates. Breakfast is scored first (normal). Lunch scoring receives breakfast's heaviness as input: if breakfast was heavy (3), lunch gets a +0.15 boost for light dishes. Dinner scoring uses both: if breakfast heavy + lunch light, dinner is neutral. If both heavy, dinner gets +0.2 boost for light. When sensitivity < 0.3: sequential generation is skipped entirely. Each meal slot scored independently. |
| **Requires Tier 2 Tags** | Coherence scoring requires the 'heaviness' tag on recipes. Before Tier 2 is tagged, this feature is dormant. The system still learns the user's pattern (using any available proxy like calorie ranges), but active scoring waits for Tier 2. |
| **Update Cycle** | Recalculated every 7 days using last 21 days of data. Changes smoothly (max 0.15 shift per recalculation). |

# 15. Plan Generation Schedule

| **Event** | **Details** |
| --- | --- |
| **Daily (5 AM)** | Generate today's plan for all active users. Batch job. Uses latest weather, user state, history. Output: 8 ranked recipes per slot (24 total per user). |
| **Weekly (Sunday 5 AM)** | Additionally generate Mon-Sun provisional plans. Each day regenerated fresh at 5 AM (weather may change). Week View shows provisional. |
| **On-Demand Refresh** | Pull-to-refresh regenerates unlocked slots only. Locked slots preserved. Fresh weather check if > 6 hours old. |
| **Post-Onboarding** | Synchronous first plan generation. RE v1 (onboarding + research). Target: < 3 seconds. |
| **Post Never/Not Today** | Immediate single-slot replacement. Excludes dismissed dish. Target: < 1 second. |
| **Locked Handling** | Locked meals never regenerated. Persist across daily refresh and pull-to-refresh. |

# 16. Feedback Signal Taxonomy

| **User Action** | **Signal** | **Score Impact** | **Decay** |
| --- | --- | --- | --- |
| **View default (no swipe)** | Passive Accept | **+0.05** | 50% every 30 days |
| **Swipe through, return** | Mild Accept | **+0.10** | 50% every 30 days |
| **Lock a meal** | Strong Accept | **+0.20** | 50% every 45 days |
| **Tap to view recipe** | Interest | **+0.08** | 50% every 21 days |
| **Use grocery list items** | Cooking Intent | **+0.15** | 50% every 30 days |
| **Add to future date** | Explicit Desire | **+0.25** | 50% every 45 days |
| **Swipe past** | Mild Rejection | **-0.05 per swipe** | Recovers 50% every 14 days |
| **Not Today** | Temporal Reject | **-0.15 for 3 days** | Full recovery after 3 days |
| **Never** | Permanent Reject | **Hard exclude** | No decay unless reactivated |
| **Search for dish** | Explicit Intent | **+0.30** | 50% every 30 days |
| **Rate dish (Phase 2)** | Explicit Feedback | **+0.3 (5-star) to -0.3 (1-star)** | No decay |

# 17. Testing & Measurement

## 17.1 Quality Metrics

| **Metric** | **Definition** | **Target** |
| --- | --- | --- |
| **Suggestion Acceptance** | % of #1 suggestions user keeps | > 40% (M1), > 55% (M6) |
| **Carousel Depth** | Avg position user settles on | < 2.5 (within first 3 options) |
| **Never Rate** | % of suggestions that get Never'd | < 5% (> 10% = retune needed) |
| **Repeat Satisfaction** | Acceptance rate of repeated dishes | > 60% |
| **Cuisine Distribution** | Entropy of accepted cuisine spread | > 0.7 (0-1 scale) |
| **Cold Start Quality** | Acceptance rate in first 3 days | > 30% |
| **Cluster Match Quality (v3)** | Cluster-seeded vs onboarding-only | > 50% improvement |
| **Food DNA Lift (Tier 2)** | Acceptance after Tier 2 tags vs before | > 15% improvement |
| **Coherence Accuracy** | For high-sensitivity users: do they accept balanced days? | > 65% balanced-day acceptance |

## 17.2 A/B Testing Plan

| **Test** | **What** | **When** |
| --- | --- | --- |
| **Weight Tuning** | Cuisine boost: 0.2 vs 0.3 vs 0.4. Weather: 0.1 vs 0.2 vs 0.3. | Week 2-4 |
| **Random Factor** | Range: 0-0.10 vs 0-0.15 vs 0-0.20. | Week 3-5 |
| **Variety Window** | Default window: 3 vs 5 vs 7 days. | Week 4-8 |
| **Context Tags (Phase 1)** | With tags vs without. Measure acceptance + session length. | Phase 1 launch |
| **Carousel Size** | 5 vs 8 vs 12 options per slot. | Week 6-10 |
| **Food DNA Impact** | With Tier 2 scoring vs without. Measure acceptance lift. | Week 6-10 |
| **Coherence Active** | With coherence scoring vs without, for high-sensitivity users. | Week 8-12 |
| **Cluster Activation** | RE v3 vs RE v1 for new users. | When 5K MAU reached |

## 17.3 Pre-Launch Offline Testing

- **Synthetic Profiles:** 20 profiles spanning 5 diet types x 4 regions. Run engine for 14 simulated days. Verify: hard constraints never violated, cuisine matches buckets, variety guard works, weather is sensible.

- **Edge Cases:** User who Never's 50% of recipes. Jain user with only 2 cuisines in Frequently. City with no weather data. User who never swipes. User who rejects everything.

- **Research Validation:** For each of 28 states, verify regional food map produces culturally appropriate top-5 for new user.

- **Food DNA Validation:** For 10 test dishes with known Tier 2 tags, verify auto-derive and AI-tag produce correct results before running full batch.

# 18. RE Version Roadmap

| **Ver** | **Phase** | **Capabilities** |
| --- | --- | --- |
| **v1** | **MVP** | Rule-based. Hard constraints + onboarding soft boosts + weather + day-of-week + home state + variety guard (5-day default) + passive feedback + random factor. 8 per slot. No context tags. Tier 1 tags only (7 dims). Coherence learning begins (data collection, no active scoring yet). |
| **v2** | **MVP W3+** | Adds: personal history scoring + decay curves + inferred spice/complexity + per-user per-slot repeat tolerance + cuisine drift detection + coherence sensitivity scoring (when Tier 2 heaviness available). Never List intelligence. |
| **v2.5** | **W4-8** | Tier 2 tags populated (7 more dims). Food DNA matching activated in scoring: cooking method, texture, richness, sweetness preferences. Coherence scoring goes live. +15% acceptance lift expected. |
| **v3** | **Phase 1-2** | 5K MAU reached. K-means clustering on food DNA similarity (not demographics). Cluster seeding for new users from 2-5 week cohort. Context tags activated. Research data fully codified. Family preference blending. |
| **v4** | **Phase 2-3** | Full collaborative filtering. Dynamic re-clustering (14 days). 70/30 personal/cluster. Mood + mode awareness. Calorie targeting. Tier 3 tags. Pantry-aware. Social signals. |

# 19. Next Steps

- Design database schema with ALL 20 Food DNA columns (null-safe, progressive fill)

- Build the auto-derive keyword-rule map for Tier 1 tags (Step 1 of tagging pipeline)

- Run 3-step tagging pipeline for Tier 1 across initial 500 recipes

- Implement RE v1 scoring pipeline as testable module (independent of UI)

- Create 20 synthetic profiles for offline testing and edge case validation

- Integrate OpenWeatherMap API and build weather-to-food mapping

- Process founder's research documents into structured lookup tables

- Define region_food_affinity for all 28 states + 8 UTs

- Set up A/B testing infrastructure for weight tuning (Week 2 post-launch)

- Plan Tier 2 tagging batch (weeks 4-8) including AI prompt design and review workflow

- Begin Document #11: Technical Architecture with Food DNA schema and RE API design

***This is the brain of the product.**** The Food DNA taxonomy is what will make the engine feel intelligent — not just suggesting 'Indian food you said you like' but understanding the deeper patterns of what makes food satisfying to each individual user. Start simple (Tier 1), prove the concept, then layer depth progressively.*

Page
