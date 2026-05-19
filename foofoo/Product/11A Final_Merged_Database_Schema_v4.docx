*Merged DB Schema v3 FINAL  |  Architect**'**s Decision Record*

DOCUMENT #11A  |  FINAL v3

**Final Merged Database Schema**

Architect's Decision Record

Existing Schema (34 tables) + Doc #11 Additions + Combo/Variant/Derivation + Colleague Feedback

Final: 42 MVP tables  |  4 Keep Empty  |  4 Phase 0.5-1  |  1 Phase 2  |  3 Dropped  |  1 Materialized View

*Version 3.0 (FINAL)  |  May 2026  |  Confidential*

*v3 adds from colleague review: user_dish_patterns table (temporal dish preferences), dish_popularity materialized view (dish-centric analytics), decay_config on user_inferred_prefs (tunable recency weighting).*

*v3 adds from dish DB population: cuisine_groups new table (18 groups), cuisines expanded (6 new columns, 62 entries), tags expanded (tier, is_user_facing, dish_category with 19 values), ingredients expanded (description, 15 categories).*

# 1. Guiding Principles

**Speed over perfection.** Ship MVP in 3.5 months. Every table either serves MVP or costs nothing to keep empty.

**Your existing schema is the foundation.** It's more mature, better normalized, and already in Supabase.

**Tags over columns for Food DNA.** dish_tags pattern = Stage 2 from day one. Unlimited dimensions.

**profiles is the user anchor.** Supabase Auth handles authentication; profiles handles app data.

**Dishes and recipes are separate.** A dish exists without a recipe. Recipes are Level 3 post-launch.

**IDs everywhere, text nowhere.** Allergens, exclusions, ingredient references use integer IDs.

**Auto-derive what you can.** Allergens, diet_type, is_jain computed from ingredient flags.

**Indian meals are combinatorial.** Combos and variants are first-class concepts.

**Both user-centric and dish-centric.** RE scores user → dish (personalization). dish_popularity and user_dish_patterns add dish → user lens (trending, patterns).

**Decay-weighted history.** Recent behavior (7 days) outweighs general behavior (90 days). Tunable per user via decay_config.

# 2. Complete Table Inventory

## 2.1 Food Knowledge Base (15 tables)

| **Table** | **Phase** | **Architect****'****s Notes** |
| --- | --- | --- |
| **cuisine_groups ****NEW** | **MVP** | **NEW from dish DB work.** Parent grouping above cuisines. name (slug PK), display_name, display_order integer, description text, is_active boolean. 18 groups: north_indian, south_indian, east_indian, west_indian, central_indian, northeast_indian, mughlai_nawabi, street_food, chinese_asian, continental, italian, american, mediterranean, anglo_indian, thai, japanese, korean, middle_eastern. Several inactive for MVP. |
| **cuisines** | **MVP** | **Keep + significant expansion.** code, name, display_name, icon_url. **ADD from dish DB work:** cuisine_group FK (replaces old region text), state_origin text, description text, tier text (tier_1/tier_2/tier_3 for population priority), is_user_facing boolean, is_active boolean. parent_cuisine FK self for hierarchy (Chettinad → Tamil, Awadhi → Mughlai). 62 cuisines populated. **DROP example_dishes[]** (redundant with dish_tags). |
| **dishes** | **MVP** | **Keep + modify.** Your base + ADD: spice_level (replaces is_spicy), blurhash, meal_types[], regional_origin, parent_dish_id FK self (variants), dish_role (carb_base/protein/vegetable/accompaniment/dessert/beverage/standalone), ingredient_ids integer[] (fast RE matching), is_jain boolean (auto-derived), derived_at timestamptz. |
| **tags** | **MVP** | **Keep + expand.** tag_name, tag_category, is_mood. **ADD:** is_food_dna boolean, **tier smallint** (1/2/3 for Food DNA tier), **is_user_facing boolean** (search/filter visible vs internal RE only), **description text** (tagger reference). **NEW category: dish_category** with 19 values (main_course, bread, rice, dal_lentil, curry, dry_sabzi, salad_raita, chaat, kebab, biryani_pulao, sweet_dessert, beverage, condiment_chutney, soup, paratha_roti, dosa_idli, noodle_pasta, egg_dish, snack_starter, thali_combo). ~150+ tags total. |
| **dish_tags** | **MVP** | **Keep + add confidence numeric DEFAULT 1.0.** 1.0 = human, 0.85 = AI-tagged. |
| **dish_similar** | **MVP** | **Keep as-is.** Pre-computed similarity. Variants auto-score high. |
| **dish_combos ****NEW** | **MVP** | **Inseparable Indian meal combos.** combo_id, combo_name, combo_slug, meal_types[], cuisine_id FK, combo_type (inseparable/base_with_sides/thali). |
| **dish_combo_items ****NEW** | **MVP** | **Junction.** combo_id FK, dish_id FK, role, is_default boolean, is_swappable boolean, sort_order. Non-default = 'Add Churma?' Swappable = Rajma + Rice/Roti/Paratha. |
| **ingredients** | **MVP** | **Keep + absorb normalization + expand.** Base + standard_unit, unit_conversion jsonb. **Flags:** is_veg, is_vegan, is_jain_compatible booleans, season_months integer[]. **ADD from dish DB work:** description text. **Categories expanded to 15:** spice, vegetable, leafy_green, lentil_legume, grain_flour, dairy, meat, seafood, egg, oil_fat, nut_seed, fruit, sweetener, herb_aromatic, condiment. ~200 ingredients populated. |
| **ingredient_aliases** | **MVP** | **Keep as-is.** Multi-language. English + Hindi at launch. |
| **ingredient_normalization** | **Drop** | **Merged into ingredients.** |
| **meal_ingredients** | **MVP** | **Keep as-is.** dish_id FK, ingredient_id FK. Quantities NULL for MVP Level 2. |
| **recipes** | **Keep Empty** | **Level 3. Phase 0.5 populates top 50-100.** dish_id FK, steps, servings, notes. |
| **recipe_steps** | **Keep Empty** | **Normalized steps.** step_index, instruction, duration_seconds, tools[], ingredients_mentioned[]. |
| **term_synonyms** | **MVP** | **Keep + add disambiguation_note text.** Handles 'bhaji' ambiguity, regional dish names. |

## 2.2 User & Preferences (11 tables)

| **Table** | **Phase** | **Architect****'****s Notes** |
| --- | --- | --- |
| **profiles** | **MVP** | **Keep + extend.** Your base + ADD: username, age, gender, household_type, role, notification settings, onboarding fields, premium fields, referral fields, security fields. |
| **user_preferences** | **Drop** | **Redundant** with user_diet_rules. |
| **user_diet_rules** | **MVP** | **Keep + change types.** excluded_ingredients text[] → integer[]. allowed_meats text[] → integer[]. Autocomplete allergen selection. |
| **user_category_preferences** | **MVP** | **Universal bucket table.** category_type + item_id + preference_bucket. Replaces user_cuisine_preferences. |
| **user_cuisine_preferences** | **Drop** | **Merged into user_category_preferences.** |
| **user_consent** | **MVP** | **Keep as-is.** Granular DPDP compliance. |
| **family_members** | **Keep Empty** | **Active Phase 1.5** when family profiles launch. |
| **user_diary** | **Phase 1** | **Cooking diary.** Ratings feed RE. |
| **user_pantry** | **Phase 0.5** | **Pantry system.** ingredient_id FK, quantity, unit, expiry_date. |
| **user_pantry_history** | **Phase 0.5** | **Pantry audit trail.** action, source, notes. |
| **user_feedback ****NEW** | **MVP** | **Explicit feedback.** feedback_type, related_entity, message, rating, status. |

## 2.3 Planner & Recommendation Engine (12 tables + 1 view)

| **Table** | **Phase** | **Architect****'****s Notes** |
| --- | --- | --- |
| **planner** | **MVP** | **Keep + modify for combos.** Polymorphic slots: breakfast_ref_type ('dish'/'combo') + breakfast_ref_id. Same L/D/snacks. ADD locked_slots text[]. Snacks NULL for MVP. |
| **planner_carousel ****NEW** | **MVP** | **8 swipe options per slot.** ref_type, ref_ids[], scores[], context_tags[] (Phase 1), re_version. |
| **suggestion_logs ****NEW** | **MVP** | **Non-negotiable.** Every interaction: ref_type, ref_id, carousel_position, action, action_at. |
| **never_list ****NEW** | **MVP** | **Hard constraint.** ref_type (dish/combo/ingredient), ref_id, is_active, reactivation_trigger. |
| **user_recipe_affinity ****NEW** | **MVP** | **Pre-computed scores.** (user_id, dish_id) PK. static_score, is_eligible. Cuts scoring ~60%. |
| **recommendation_debug_log** | **MVP** | **Sampled 5%.** score_breakdown jsonb, weather_input, eligible_pool_size. 30-day retention. |
| **user_inferred_prefs ****NEW** | **MVP** | **Weekly computed.** Spice/sweetness tolerance, repeat_tolerance per B/L/D, coherence_sensitivity, cooking_method_prefs, texture_prefs, cuisine_drift. **v3: ADD decay_config jsonb** — tunable: {week_1:1.0, week_2_4:0.5, month_2_3:0.2, beyond:0.05}. |
| **user_dish_patterns ****NEW v3** | **MVP** | **Colleague feedback.** Temporal dish preferences. preferred_slots, preferred_days, frequency, acceptance/rejection counts. Auto-computed weekly. RE: 'Dal at lunch 3x/week, Pav Bhaji weekends only.' |
| **weather_cache ****NEW** | **MVP** | **City-level daily weather.** city PK, date, temperature, humidity, condition. 12-hour TTL. |
| **region_food_affinity ****NEW** | **MVP** | **Research data.** state_code, dish_id FK, affinity_score. ~500-1000 rows. |
| **recommendation_pool** | **Phase 1** | **Explore feed.** 30-50 scored dishes per user. |
| **dish_popularity ****MV, v3** | **MVP** | **Colleague feedback. Materialized view.** Dish-centric analytics refreshed daily. trending_score, acceptance_rate, top_user_segments, best_slot, best_day, avg_carousel_position. |

## 2.4 App Intelligence (4 tables)

| **Table** | **Phase** | **Architect****'****s Notes** |
| --- | --- | --- |
| **app_events ****NEW** | **MVP** | **Raw behavioral log.** session_id, event_type, screen_name, metadata jsonb. 90-day retention. Time-on-page: screen_view timestamps. Search: metadata.query. |
| **user_behavioral_profile ****NEW** | **MVP** | **Aggregated vectors.** cuisine/cooking_method/texture/spice distributions, session metrics, feature_usage. Weekly. K-means input. |
| **experiments** | **MVP** | **Keep as-is.** A/B test definitions. |
| **experiment_assignments** | **MVP** | **Keep as-is.** User-variant assignments. |

## 2.5 Operations (12 tables)

| **Table** | **Phase** | **Architect****'****s Notes** |
| --- | --- | --- |
| **audit_log** | **MVP** | **Keep.** 3-year DPDP retention. |
| **role_audit** | **MVP** | **Keep.** Infrastructure security. |
| **etl_jobs** | **MVP** | **Keep.** Job queue for CRONs. |
| **cache_metadata** | **MVP** | **Keep.** Cache freshness. |
| **mv_refresh_history** | **MVP** | **Keep.** MV refresh tracking. dish_popularity refresh logged here. |
| **media_assets** | **MVP** | **Keep + ADD blurhash.** Polymorphic media. |
| **migration_log** | **MVP** | **Keep.** DB migration tracking. |
| **migration_log_ist** | **Drop** | **Timezone experiment. Drop.** |
| **referrals ****NEW** | **Phase 1** | **WhatsApp growth.** referrer_id, referred_id, code, status, premium_days. |
| **notification_log ****NEW** | **MVP** | **Notification tracking.** type, sent_at, opened, opened_at. 90-day retention. |
| **localizations** | **Keep Empty** | **English-only launch.** Hindi Phase 0.5-1. |
| **pii_tokens** | **Phase 1.5** | **PII tokenization** for health data. |

# 3. New Table Details (from Colleague Feedback)

## 3.1 user_dish_patterns (Temporal Preferences)

**Why:** The RE needs to know 'this user eats Pav Bhaji only on weekends' and 'Dal Chawal is always lunch, never dinner.' Without this, every day looks the same to the RE.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **user_id** | uuid | FK profiles |  |
| **dish_id** | integer | FK dishes | Composite PK with user_id |
| **preferred_slots** | text[] |  | ['lunch'] or ['lunch','dinner']. Where user typically accepts this dish. |
| **preferred_days** | text[] |  | ['saturday','sunday']. When user typically accepts. Null = no pattern. |
| **frequency** | text |  | weekly, fortnightly, monthly, occasional. How often user accepts. |
| **last_suggested** | date |  | When RE last suggested this dish to this user. |
| **last_accepted** | date |  | When user last accepted (locked/tapped). |
| **acceptance_count** | integer | DEFAULT 0 | Total times accepted. |
| **rejection_count** | integer | DEFAULT 0 | Total times rejected (swipe past + not_today). |

**Populated by:** Weekly CRON (alongside calculate-inferred-prefs). Reads suggestion_logs, groups by dish, computes patterns. **Read by RE:** 'User #47 accepts Dal 8/10 times at lunch, never at dinner, ~3x/week. Boost Dal for lunch slots, demote for dinner.' **Size:** ~30-50 rows per active user after 1 month. At 10K users: ~400K rows.

## 3.2 dish_popularity (Materialized View)

**Why:** Adds dish-centric lens to complement user-centric RE. 'Which dishes are trending this week?' 'Which dishes perform best at breakfast?' Enables collaborative signals.

| **Column** | **Type** | **Source** | **Notes** |
| --- | --- | --- | --- |
| **dish_id** | integer | PK | From suggestion_logs aggregate |
| **total_views** | integer | COUNT | Times shown in any carousel |
| **total_accepts** | integer | COUNT | Times locked or tapped_detail |
| **total_rejects** | integer | COUNT | Never + not_today |
| **acceptance_rate** | numeric | CALC | accepts / views. Quality signal. |
| **trending_score** | numeric | CALC | Decay-weighted 7-day acceptance rate. High = gaining popularity. |
| **top_user_segments** | jsonb | JOIN | Which user clusters accept this most. {cluster_3: 0.8, cluster_7: 0.6}. |
| **best_slot** | text | MODE | Meal slot where most accepted: breakfast/lunch/dinner. |
| **best_day** | text | MODE | Day of week where most accepted. |
| **avg_carousel_position** | numeric | AVG | Average position when accepted. Lower = users accept it quickly. |

**Refreshed:** Daily CRON at 11 PM (after analytics email). REFRESH MATERIALIZED VIEW CONCURRENTLY dish_popularity. Logged in mv_refresh_history. **Read by RE:** trending_score boosts popular dishes. best_slot validates slot assignment. top_user_segments feeds cluster-based recommendations.

## 3.3 decay_config on user_inferred_prefs

**Why:** Recent behavior should outweigh old behavior, but the ideal decay rate varies. A new user's preferences shift rapidly (trust recent data). A 6-month user's preferences are stable (trust historical average). A/B testing decay rates lets us optimize without code changes.

**Column added:** decay_config jsonb DEFAULT '{"week_1": 1.0, "week_2_4": 0.5, "month_2_3": 0.2, "beyond": 0.05}'. The calculate-inferred-prefs CRON reads this config when computing weighted averages. Override per user for experiments. Override globally via experiments table.

# 4. Auto-Derivation Pipeline

**Ingredient flags → dish attributes, automatically.** Eliminates manual tagging errors at 500+ dishes.

| **Derived Attribute** | **Logic** | **Source** |
| --- | --- | --- |
| **allergens[]** | UNION of allergen_flags from all linked ingredients | ingredients.allergen_flags[] via meal_ingredients |
| **diet_type** | ANY meat → non_veg. ANY egg (no meat) → egg. ANY dairy (no meat/egg) → veg. ALL vegan → vegan. | ingredients.is_veg, is_vegan |
| **is_jain** | ALL ingredients is_jain_compatible AND veg → true | ingredients.is_jain_compatible |
| **dietary_tags[]** | No gluten allergen → gluten_free. No dairy → dairy_free. Etc. | ingredients.allergen_flags[] |
| **ingredient_ids[]** | Array of all ingredient_id values linked to this dish | meal_ingredients.ingredient_id |

**Triggers:** (1) After dish creation + ingredients linked. (2) After meal_ingredients modified. (3) Weekly batch re-derive all. **Conflict detection:** If manual tag differs from derived → logged for review.

# 5. Combo & Variant Architecture

**Single dish vs combo rule:** Components exist independently with other partners → combo. Not → single dish.

| **Example** | **Type** | **Why** |
| --- | --- | --- |
| **Pav Bhaji** | **Single dish** | Bhaji is specifically for pav. Nobody eats it separately. |
| **Vada Pav** | **Single dish** | Vada is made for pav. One entity. |
| **Chole Bhature** | **Combo** | Chole pairs with rice, kulcha, bread. Bhature pairs with other curries. |
| **Rajma Chawal** | **Combo** | Rajma pairs with roti. Rice pairs with everything. |
| **Idli Sambhar** | **Combo** | Sambhar goes with dosa, rice, vada. Swappable sides. |

**Configurable combos (Point 6 from feedback):** Rajma + Rice shows swap icon on Rice. Tap → bottom sheet: Roti, Paratha, Naan (all carb_base dishes in combo_items with is_default: false). User picks → combo updates → planner + grocery list update. **No schema change needed** — is_default + is_swappable already support this.

**Add-ons (Point 5 from feedback):** Dal Baati shows 'Add Churma?' chip. Churma is in combo_items with is_default: false, role: dessert. Tap to add/remove. **No schema change needed.**

**Variants:** parent_dish_id creates families. Paneer Butter Masala → Kadai Paneer, Paneer Coconut Gravy (Kerala), Paneer Butter Masala Jain. RE boosts variants for matching regions. Never-listing parent doesn't kill variants.

# 6. Final Table Count

| **Category** | **Count** | **Tables** |
| --- | --- | --- |
| **MVP Active** | **42** | cuisine_groups, cuisines, dishes, tags, dish_tags, dish_similar, dish_combos, dish_combo_items, ingredients, ingredient_aliases, meal_ingredients, term_synonyms, profiles, user_diet_rules, user_category_preferences, user_consent, user_feedback, planner, planner_carousel, suggestion_logs, never_list, user_recipe_affinity, recommendation_debug_log, user_inferred_prefs, user_dish_patterns, weather_cache, region_food_affinity, app_events, user_behavioral_profile, experiments, experiment_assignments, audit_log, role_audit, etl_jobs, cache_metadata, mv_refresh_history, media_assets, migration_log, notification_log + dish_popularity (MV) + recipes (empty) + recipe_steps (empty) + family_members (empty) |
| **Keep Empty** | **4** | recipes, recipe_steps, localizations, family_members |
| **Phase 0.5-1** | **4** | user_pantry (0.5), user_pantry_history (0.5), referrals (1), recommendation_pool (1) |
| **Phase 1.5+** | **1** | pii_tokens |
| **Phase 2** | **1** | user_diary |
| **Dropped** | **4** | user_preferences, user_cuisine_preferences, ingredient_normalization, migration_log_ist |

# 7. All Modifications to Existing Tables

| **Table** | **ALTER Statements** |
| --- | --- |
| **dishes** | DROP is_spicy. ADD spice_level smallint, blurhash text, meal_types text[] NOT NULL, regional_origin text, parent_dish_id integer FK self, dish_role text, ingredient_ids integer[] DEFAULT '{}', is_jain boolean DEFAULT false, derived_at timestamptz. |
| **cuisines** | ADD cuisine_group FK cuisine_groups, state_origin text, description text, tier text, is_user_facing boolean DEFAULT true, is_active boolean DEFAULT true. DROP example_dishes[] (redundant with dish_tags). CHANGE region text → cuisine_group FK. |
| **tags** | ADD is_food_dna boolean DEFAULT false, tier smallint, is_user_facing boolean DEFAULT true, description text. |
| **dish_tags** | ADD confidence numeric DEFAULT 1.0. |
| **ingredients** | ADD standard_unit varchar(32), unit_conversion jsonb, is_veg boolean DEFAULT true, is_vegan boolean DEFAULT true, is_jain_compatible boolean DEFAULT true, season_months integer[], description text. UPDATE category values to 15-type taxonomy (spice, vegetable, leafy_green, lentil_legume, grain_flour, dairy, meat, seafood, egg, oil_fat, nut_seed, fruit, sweetener, herb_aromatic, condiment). |
| **media_assets** | ADD blurhash text. |
| **planner** | CHANGE slots to polymorphic: breakfast_ref_type text + breakfast_ref_id integer (same L/D/snacks). ADD locked_slots text[]. |
| **profiles** | ADD 17 columns: username, age, gender, household_type, role, notifications_enabled, notification_time, onboarding_completed, onboarding_step, premium_tier, premium_expires_at, referral_code, referred_by, last_login_at, login_attempts, account_locked_until. |
| **user_diet_rules** | CHANGE excluded_ingredients text[] → integer[]. CHANGE allowed_meats text[] → integer[]. |
| **term_synonyms** | ADD disambiguation_note text. |
| **user_inferred_prefs** | ADD decay_config jsonb DEFAULT '{"week_1":1.0,"week_2_4":0.5,"month_2_3":0.2,"beyond":0.05}'. |

# 8. Data Migration Steps

- Migrate user_cuisine_preferences → user_category_preferences

- Drop user_cuisine_preferences, user_preferences, ingredient_normalization, migration_log_ist

- Run ALTERs: dishes (10), cuisines (7 incl new FKs), tags (4), ingredients (7), planner (slots+locked), profiles (17), dish_tags (1), media_assets (1), user_diet_rules (2), term_synonyms (1), user_inferred_prefs (1)

- CREATE: cuisine_groups, dish_combos, dish_combo_items, planner_carousel, suggestion_logs, never_list, user_recipe_affinity, recommendation_debug_log, user_inferred_prefs, user_dish_patterns, weather_cache, region_food_affinity, app_events, user_behavioral_profile, notification_log, user_feedback

- CREATE MATERIALIZED VIEW dish_popularity from suggestion_logs

- Populate cuisine_groups (18 groups) and cuisines (62 entries with hierarchy, tiers, is_active)

- Populate tags (~150+ values across 12 categories incl dish_category with 19 values)

- Populate ingredients_master (~200 with flags, descriptions, 15-type categories)

- Populate meal_types, dish_role, parent_dish_id on existing dishes

- Run derive-dish-attributes for all dishes

- Create all indexes (per Doc #11 v2 strategy + new tables)

- Apply RLS policies to all new tables

- Test: FKs, unique constraints, RLS, auto-derivation, polymorphic planner end-to-end

# 9. Future Tables (Not Created Now)

| **Table** | **Phase** | **Purpose** |
| --- | --- | --- |
| **ingredient_substitutes** | **Phase 0.5** | Simple swaps (paneer → tofu). |
| **equipment_master** | **Phase 2** | Pressure cooker, tandoor, etc. |
| **dish_equipment** | **Phase 2** | Junction: which dishes need which equipment. |
| **user_equipment** | **Phase 2** | User's kitchen equipment. |
| **cluster_metadata** | **Phase 1.5** | K-means cluster definitions at 5K+ MAU. |
| **user_clusters** | **Phase 1.5** | User-cluster mapping. |
| **subscription_history** | **Phase 1.5** | Premium tier tracking. |
| **social_profiles** | **Phase 3** | Public cooking profiles. |
| **social_posts/follows** | **Phase 3** | Full social suite. |
| **user_modes** | **Phase 2** | Fasting, recovery, pregnancy, fitness. |
| **family_votes** | **Phase 2** | Family voting on meals. |
| **dish_embeddings** | **Phase 3+** | pgvector embeddings. |

# 10. Colleague Feedback Resolution

| **#** | **Question** | **Resolution** |
| --- | --- | --- |
| **1** | **Recipe vs Recipe Step tables** | dishes = food identity (MVP). recipes = cooking instructions (Phase 0.5+). recipe_steps = normalized steps with tools[]/ingredients_mentioned[]. A dish exists without a recipe. Supports future 1:many. |
| **2** | **Historical data + latency** | suggestion_logs (raw, 1yr). user_behavioral_profile (weekly). user_inferred_prefs (RE-specific, weekly). **Decay-weighted:** 7d=1.0, 8-30d=0.5, 31-90d=0.2, 90d+=0.05. Tunable via decay_config. Recent overrides general in 1-2 weeks. |
| **3** | **Dish inclination (weekends only)** | **NEW: user_dish_patterns.** Auto-computed weekly: preferred_slots, preferred_days, frequency per user-dish pair. RE boosts/demotes per slot and day. |
| **4** | **Dish-centric vs User-centric** | Both. User-centric: MVP (personalization). Dish-centric: **dish_popularity MV** (trending, acceptance, best slot/day, clusters). Also: dish_similar, user_clusters (Phase 1.5). |
| **5** | **Add-ons (Churma with Dal Baati)** | dish_combo_items: is_default=false, role=dessert. 'Add Churma?' chip. No schema change. |
| **6** | **Variations (Rajma + Rice vs Roti)** | dish_combo_items: is_swappable=true. Swap icon → bottom sheet with alternatives. No schema change. |
| **7** | **User actions (time per page)** | app_events: screen_view timestamps. Time-on-page derived. Search: metadata.query. Weekly aggregation into user_behavioral_profile.feature_usage. |
| **8** | **Desserts and Snacks** | Desserts: dish_role='dessert'. Zero changes. Snacks: planner.snacks_ref columns exist (NULL MVP). meal_types supports 'snack'. Activate when ready. |

# 11. Architect's Final Notes

**This is the FINAL schema.** 42 MVP-active tables + 1 materialized view. Handles: Indian meal combos, regional variants, Jain modifications, auto-derived allergens/diet, multi-language ingredients and dish names, temporal dish patterns, both user-centric and dish-centric analytics, decay-weighted learning, configurable combos with swappable components, and desserts/snacks readiness.

**New from colleague feedback:** user_dish_patterns adds 'Pav Bhaji is a weekend dish' intelligence. dish_popularity adds 'trending this week' and dish-centric RE lens. decay_config makes recency weighting A/B testable. All three are lightweight additions that close meaningful gaps.

**New from dish DB population:** cuisine_groups provides parent grouping (18 groups). Cuisines expanded to 62 with hierarchy, tiers, and is_active/is_user_facing flags. Tags expanded with tier, is_user_facing, and dish_category (19 values). Ingredients expanded with description and 15 granular categories. All driven by actual data entry needs.

***This document supersedes all previous schema documents (Doc #11 v2 Section 4, Doc #11A v1, Doc #11A v2).**** All other sections of Doc #11 v2 (tech stack, APIs, auth, image pipeline, error handling, analytics, costs, Edge Functions, CI/CD) remain valid.*

Page
