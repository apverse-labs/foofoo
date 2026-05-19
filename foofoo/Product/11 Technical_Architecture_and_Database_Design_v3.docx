*Technical Architecture v2  |  Confidential*

DOCUMENT #11  |  REVISED v2

**Technical Architecture**

**&**** Database Design**

React Native (Expo) + Supabase + PostgreSQL

3-Level Content Model  |  Food Knowledge Base  |  40+ tables

*Version 2.0  |  April 2026  |  Confidential*

*Revision: MVP uses dish cards + simple ingredients (no full recipes). Added: security/audit, app events, behavioral profiles, recommendation debug, Food Knowledge Base, query optimization, dimension scaling, timezone/concurrency, API error format, environment config.*

# 1. MVP Content Model: 3-Level Approach

**Key MVP Decision:** The app launches with dish cards and simple ingredient lists, not full recipes. Recipes are added post-launch. The core product is the DECISION ('what to eat'), not the instruction ('how to cook it').

| **Level** | **Content** | **Details** | **When** |
| --- | --- | --- | --- |
| **1** | **Dish Card Data** | Dish name, hero photo, all Food DNA tags (Tier 1 at launch, Tier 2 weeks 4-8), cuisine, diet type, estimated calories, cook time, difficulty. | MVP Launch (all 500 dishes) |
| **2** | **Simple Ingredients** | Plain list of ingredient names: 'paneer, tomato, cream, onion, spices.' No quantities, no units, no prep instructions. 5-10 items per dish. AI-generatable from dish name. | MVP Launch (all 500 dishes) |
| **3** | **Full Recipes** | Step-by-step instructions, precise quantities, audio/video. Added dish by dish. Prioritize top 50 most-accepted dishes first. | Post-launch (weeks 2-8) |

**What this means for the app:** Home Page meal cards: unchanged (photo + name + tags). Meal Detail Page MVP: hero photo, dish name, cuisine/diet tags, Food DNA tags as friendly labels ('Light, Steamed, Mild'), time + calories + difficulty, and a simple ingredient list with checkboxes. Grocery List: works with ingredient names only (no quantities until Level 3 added). RE scoring: completely unaffected (works on tags, not recipes).

# 2. Technology Stack

| **Layer** | **Technology** | **Why** |
| --- | --- | --- |
| **Mobile App** | **React Native + Expo SDK 52+** | Best AI coding support (JS/TS). Expo handles builds, OTA updates, push, app store. Single codebase Android-Only MVP (iOS Phase 0.5). |
| **Navigation** | **Expo Router (file-based)** | Matches IA doc screen structure. Deep linking for notifications. |
| **State** | **Zustand + React Query** | Lightweight state. React Query for server cache, offline, background refresh. |
| **Gestures** | **Gesture Handler + Reanimated 3** | Native 60fps swipe/long-press. Required for card carousel and Never/Not Today gestures. |
| **Backend** | **Supabase** | PostgreSQL + auth + storage + edge functions + realtime. Free tier: 500MB DB, 50K MAU. |
| **Database** | **PostgreSQL (Supabase)** | Full SQL for RE scoring queries, joins, aggregations, food DNA matching. |
| **Functions** | **Supabase Edge Functions (Deno/TS)** | RE scoring, plan generation, weather fetch, analytics aggregation. |
| **Auth** | **Supabase Auth** | Email+password MVP. Google ready Phase 1. JWT, RLS, password reset. |
| **Push** | **Expo Notifications + OneSignal** | OneSignal free: unlimited devices. Segmentation, scheduling, deep links. |
| **Images** | **Supabase Storage + Cloudinary CDN** | On-the-fly resize, WebP, CDN. Free: 25GB bandwidth. |
| **Weather** | **OpenWeatherMap** | Free: 1K calls/day. City-level daily weather for RE. |
| **Analytics** | **PostHog** | Free: 1M events/month. Funnels, cohorts, retention. Open-source. |
| **Errors** | **Sentry** | Free: 5K events/month. Crash reporting, performance monitoring. |
| **CI/CD** | **Expo EAS** | Cloud builds, OTA updates, app store submission. No local Xcode needed. |
| **Dev Tools** | **Cursor + Claude** | AI-native IDE + architecture/logic support. TypeScript throughout. |

# 3. System Architecture

## 3.1 Architecture Layers

| **Layer** | **Responsibilities** |
| --- | --- |
| **Client** | UI rendering, gesture detection, local caching (AsyncStorage), offline plan display, navigation. Does NOT run RE scoring. |
| **API / Auth** | Supabase REST (auto-generated) + Auth. CRUD, authentication, RLS authorization. |
| **Edge Functions** | RE scoring pipeline, plan generation, weather fetch, analytics aggregation, image processing, referral tracking. |
| **Database** | 40+ MVP Tables (see Doc 11A for complete spec) (see Section 4). PostgreSQL with RLS, full-text search, GIN indexes. |
| **Storage** | Supabase Storage (originals) + Cloudinary CDN (resized, WebP, Blurhash). |
| **External** | OpenWeatherMap, OneSignal, Sentry, PostHog, Cloudinary. |

## 3.2 Timezone Rules

**All timestamps stored in UTC (timestamptz).** India is IST (UTC+5:30). Conversion rules: CRON jobs (5 AM IST = 11:30 PM UTC previous day), 'today' calculation (for plan_date, use IST date not UTC date), notification scheduling (user's configured time in IST, stored as IST, converted to UTC for OneSignal). All date comparisons in Edge Functions must convert to IST first. The client displays all times in IST (device timezone).

## 3.3 API Error Response Format

All Edge Functions return consistent error JSON:

**Success:** { success: true, data: { ... } }

**Error:** { success: false, error: { code: 'PLAN_GENERATION_FAILED', message: 'Human-readable message', retry: true/false, details: { ... } } }

Standard error codes: AUTH_FAILED, AUTH_EXPIRED, VALIDATION_ERROR, PLAN_GENERATION_FAILED, WEATHER_FETCH_FAILED, ELIGIBLE_POOL_EMPTY, RATE_LIMITED, INTERNAL_ERROR. Client maps error codes to user-friendly messages and retry behavior.

## 3.4 Environment Configuration

| **Aspect** | **Development** | **Staging** | **Production** |
| --- | --- | --- | --- |
| **Supabase** | Separate project (free tier) | Same as dev or separate | Separate project (Pro tier when needed) |
| **Database** | Seeded with 50 test dishes | Full 500 dishes | Full 500 dishes + live data |
| **Edge Functions** | Local via supabase functions serve | Deployed, test data | Deployed, production |
| **Push Notifications** | Disabled (console log only) | OneSignal test segment | OneSignal production |
| **Analytics** | PostHog dev project | PostHog staging | PostHog production |
| **Env Variables** | .env.local (gitignored) | .env.staging | Supabase Vault (encrypted) |

# 4. Database Schema: 40+ MVP Tables (see Doc 11A for complete spec)

Organized into 5 groups: Core (user & auth), Food Knowledge Base (dishes, ingredients, tags), Recommendation Engine (plans, logs, scoring), App Intelligence (events, behavior, analytics), and Operations (notifications, referrals, audit). All tables have RLS. UUIDs as PKs. Timestamps in UTC.

## 4.1 Group 1: Core

**Table: users**

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK | Supabase Auth ID. |
| **name** | text | NOT NULL | Display name. |
| **username** | text | UNIQUE NOT NULL | Unique username. |
| **email** | text | UNIQUE NOT NULL | From auth. |
| **food_pref** | text | NOT NULL | veg, non_veg, egg, vegan, jain. |
| **allergies** | text[] | DEFAULT '{}' | Array of allergen strings. |
| **home_state** | text |  | Indian state code. Nullable. |
| **current_city** | text |  | From device location or IP. |
| **household_type** | text |  | solo, couple, family_with_kids, flatmates. |
| **role** | text | DEFAULT 'cook' | cook or instruct. |
| **age** | integer |  | For coherence sensitivity prior. |
| **gender** | text |  | For research data matching. |
| **notifications_enabled** | boolean | DEFAULT true |  |
| **notification_time** | time | DEFAULT '07:30' | IST. User-configurable. |
| **onboarding_completed** | boolean | DEFAULT false |  |
| **onboarding_step** | integer | DEFAULT 0 | For resume. |
| **premium_tier** | text | DEFAULT 'free' | free, premium, premium_plus. |
| **premium_expires_at** | timestamptz |  | Null for free. |
| **referral_code** | text | UNIQUE | Auto-generated 6-char. |
| **referred_by** | uuid | FK users.id |  |
| **last_login_at** | timestamptz |  | Security: last auth. |
| **login_attempts** | integer | DEFAULT 0 | Brute-force protection. Lock after 5. |
| **account_locked_until** | timestamptz |  | Null if not locked. |
| **data_consent_at** | timestamptz | NOT NULL | DPDP: when user consented. |
| **data_consent_version** | text | NOT NULL | Which privacy policy version. |
| **account_deleted_at** | timestamptz |  | Soft delete before hard purge. |
| **created_at** | timestamptz | DEFAULT now() |  |
| **updated_at** | timestamptz | DEFAULT now() |  |

**Table: cuisine_preferences** — user_id + cuisine_name UNIQUE. One bucket per cuisine.

**Table: meal_preferences** — user_id + meal_type + item_name UNIQUE. meal_type: breakfast or lunch_dinner (combined).

**Table: family_members** — id, user_id (FK), name, type (adult/child/infant), food_pref, allergies[]. Schema exists MVP, active Phase 1.

## 4.2 Group 2: Food Knowledge Base

The structured food data that exists before any user signs up. Four tables working together.

**Table: cuisines_master** — Controlled vocabulary for cuisine names.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **name** | text | UNIQUE NOT NULL | Standardized: north_indian, south_indian, etc. |
| **display_name** | text | NOT NULL | User-facing: 'North Indian', 'South Indian'. |
| **region** | text |  | Geographic region: north, south, east, west, global. |
| **parent_cuisine_id** | uuid | FK self | Hierarchy: indo_chinese parent = indian + chinese. |

**Table: ingredients_master** — Standardized ingredient reference.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **name** | text | UNIQUE NOT NULL | Standardized: paneer, tomato, jeera (not 'cumin seeds' AND 'jeera'). |
| **display_name** | text | NOT NULL | User-facing: 'Paneer', 'Tomato'. |
| **category** | text | NOT NULL | spice, vegetable, grain, protein, dairy, oil_fat, condiment, fruit, other. |
| **is_allergen** | boolean | DEFAULT false |  |
| **allergen_type** | text |  | gluten, dairy, nuts, soy, shellfish, eggs. Null if not allergen. |
| **is_jain_compatible** | boolean | DEFAULT true | False for onion, garlic, root veg. |
| **is_vegan** | boolean | DEFAULT true | False for dairy, honey, ghee, meat, eggs. |
| **calories_per_100g** | integer |  | Approximate. For future nutrition calc. |
| **common_unit** | text |  | grams, pieces, cups, tsp, tbsp. For future recipes. |

**Table: food_tags_reference** — Controlled vocabulary for all Food DNA tags.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **tag_category** | text | NOT NULL | cooking_method, primary_taste, texture, richness, mouthfeel, aroma_profile, etc. |
| **tag_value** | text | NOT NULL | steamed, crispy, umami, smoky, etc. |
| **display_name** | text | NOT NULL | User-facing: 'Steamed', 'Crispy'. |
| **tier** | smallint | NOT NULL | 1, 2, or 3. Determines tagging priority. |
| **description** | text |  | What this tag means. For tagger reference. |

**UNIQUE constraint:** (tag_category, tag_value). Prevents duplicates like 'deep_fried' and 'deep-fried'.

**Table: dishes** — The core content table. Formerly 'recipes'. Contains 20 Food DNA columns.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **name** | text | NOT NULL | Dish name. Indexed for full-text search. |
| **description** | text |  | Short description (2-3 sentences). Nullable MVP. |
| **meal_types** | text[] | NOT NULL | ['breakfast'], ['lunch','dinner'], etc. |
| **photo_url** | text |  | Cloudinary URL template. |
| **blurhash** | text |  | Blurhash string for progressive loading. ~30 chars. |
| **is_active** | boolean | DEFAULT true | Soft delete from RE. Active dishes only. |
| **has_full_recipe** | boolean | DEFAULT false | True when Level 3 content added. |
| **recipe_steps** | jsonb |  | Null at MVP launch. [{step, instruction, duration_mins}] when added. |
| **recipe_video_url** | text |  | Phase 1. Null until video added. |
| **recipe_audio_url** | text |  | Phase 1. Null until audio added. |
| **cuisine_id** | uuid | FK cuisines_master NOT NULL | Standardized via master table. |
| **diet_type** | text | NOT NULL | veg, non_veg, egg, vegan, jain. |
| **allergens** | text[] | DEFAULT '{}' | Derived from dish_ingredients join. |
| **spice_level** | smallint | NOT NULL | 1-4. Tier 1. |
| **cook_time_mins** | integer | NOT NULL | Estimated. Tier 1. |
| **difficulty** | text | NOT NULL | easy, medium, hard. Tier 1. |
| **calories** | integer | NOT NULL | Per serving kcal. Tier 1. |
| **cooking_method** | text[] |  | Tier 2. Nullable. Filled weeks 4-8. |
| **primary_taste** | text[] |  | Tier 2. Nullable. |
| **texture** | text[] |  | Tier 2. Nullable. |
| **heaviness** | smallint |  | Tier 2. 1-3. Nullable. |
| **richness** | text |  | Tier 2. Nullable. |
| **sweetness** | smallint |  | Tier 2. 0-3. Nullable. |
| **weather_affinity** | text[] |  | Tier 2. Nullable. |
| **mouthfeel** | text[] |  | Tier 3. Nullable. |
| **aroma_profile** | text[] |  | Tier 3. Nullable. |
| **fermentation** | text |  | Tier 3. Nullable. |
| **serving_temp** | text |  | Tier 3. Nullable. |
| **health_tags** | text[] |  | Tier 3. Nullable. |
| **ingredient_complexity** | smallint |  | Tier 3. Nullable. |
| **regional_origin** | text |  | State of origin. |
| **occasion** | text[] |  | everyday, festival, party. |
| **fasting_compatible** | text[] |  | Phase 2. |
| **family_tags** | text[] |  | Phase 1. |
| **created_at** | timestamptz | DEFAULT now() |  |
| **updated_at** | timestamptz | DEFAULT now() |  |

**Table: dish_ingredients** — Junction table linking dishes to standardized ingredients.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **dish_id** | uuid | FK dishes NOT NULL | Cascade delete. |
| **ingredient_id** | uuid | FK ingredients_master NOT NULL | Standardized reference. |
| **quantity** | numeric |  | Null for MVP (Level 2). Filled with Level 3 recipes. |
| **unit** | text |  | Null for MVP. grams, cups, tsp, pieces when Level 3 added. |
| **is_primary** | boolean | DEFAULT false | True for main ingredients (paneer in paneer tikka). For search ranking. |
| **sort_order** | smallint | DEFAULT 0 | Display order in ingredient list. |

**UNIQUE:** (dish_id, ingredient_id). **Key benefit:** allergen checking via JOIN dish_ingredients → ingredients_master WHERE is_allergen = true. Grocery list via GROUP BY ingredient_id across planned dishes. Future pantry matching via JOIN to pantry_items.

## 4.3 Group 3: Recommendation Engine

**Table: daily_plans** — One row per user per day.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **user_id** | uuid | FK NOT NULL |  |
| **plan_date** | date | NOT NULL | IST date this plan is for. |
| **breakfast_ids** | uuid[] | NOT NULL | 8 dish IDs. Position 1 = default. |
| **lunch_ids** | uuid[] | NOT NULL | 8 dish IDs. |
| **dinner_ids** | uuid[] | NOT NULL | 8 dish IDs. |
| **locked_slots** | text[] | DEFAULT '{}' | 'breakfast', 'lunch', 'dinner'. |
| **generated_at** | timestamptz | NOT NULL |  |
| **re_version** | text |  | v1, v2, v2.5, v3, v4. |

**UNIQUE:** (user_id, plan_date).

**Table: suggestion_logs** — Every interaction with a suggestion.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **user_id** | uuid | FK NOT NULL |  |
| **plan_id** | uuid | FK daily_plans |  |
| **meal_slot** | text | NOT NULL | breakfast, lunch, dinner. |
| **dish_id** | uuid | FK dishes |  |
| **carousel_position** | smallint |  | 1-8. |
| **action** | text | NOT NULL | viewed, swiped_to, swiped_past, locked, never, not_today, tapped_detail, tapped_ingredients, added_to_date, searched. |
| **action_at** | timestamptz | DEFAULT now() |  |

**Table: never_list** — user_id + dish_id. is_active boolean. reactivation_trigger, reactivated_at.

**Table: user_recipe_affinity** — Pre-computed static scores for query optimization.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **user_id** | uuid | PK (composite) |  |
| **dish_id** | uuid | PK (composite) |  |
| **static_score** | numeric(4,2) | NOT NULL | Cuisine boost + meal item boost + home state. Recalculated only when preferences change. |
| **is_eligible** | boolean | NOT NULL | Passes all hard constraints. Cached hard filter result. |
| **calculated_at** | timestamptz | NOT NULL |  |

**Purpose:** The 5 AM batch job reads static_score instead of re-computing onboarding boosts for every dish. Only adds dynamic scores (weather, history, variety, random). Recalculated when user changes preferences. Cuts scoring time by ~60%.

**Table: recommendation_debug_log** — Sampled scoring breakdown for debugging.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **user_id** | uuid | FK |  |
| **plan_date** | date |  |  |
| **meal_slot** | text |  |  |
| **dish_id** | uuid | FK dishes |  |
| **final_score** | numeric(4,2) |  |  |
| **score_breakdown** | jsonb |  | {cuisine_boost: 0.3, weather: 0.2, history: 0.15, ...} |
| **weather_input** | jsonb |  | {temp: 32, condition: 'rainy', city: 'mumbai'} |
| **eligible_pool_size** | integer |  | How many dishes passed hard filters. |
| **re_version** | text |  |  |
| **created_at** | timestamptz | DEFAULT now() |  |

**Sampling:** Enabled for 5% of users randomly + always for flagged users (high never rate, reported issues). Not for every user every day. Retention: 30 days, then auto-purged.

**Table: user_inferred_prefs** — Single row per user. Computed weekly.

Columns: user_id (PK), spice_tolerance, sweetness_tolerance, repeat_tolerance_b/l/d, coherence_sensitivity, cooking_method_prefs (jsonb distribution), texture_prefs (jsonb), richness_pref, complexity_pref, cuisine_drift (jsonb), last_calculated.

**Table: weather_cache** — city (PK) + date. temperature, humidity, condition, fetched_at. One row per city per day.

**Table: region_food_affinity** — Research data codified. state_code, dish_id (FK), affinity_score, source_document. Refreshed quarterly.

## 4.4 Group 4: App Intelligence

**Table: app_events** — Raw behavioral event log. High-volume, append-only.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **user_id** | uuid | FK NOT NULL |  |
| **session_id** | uuid | NOT NULL | Generated on app open. Shared across events in one session. |
| **event_type** | text | NOT NULL | app_open, app_close, screen_view, feature_tap, search_query, notification_opened, onboarding_step_completed, error_encountered. |
| **screen_name** | text |  | home_day, home_week, meal_detail, search, grocery_list, profile, onboarding_N. |
| **metadata** | jsonb |  | Flexible: {search_term: 'biryani'}, {feature: 'week_view'}, {error: 'timeout'}. |
| **device_type** | text |  | ios or android. |
| **app_version** | text |  | For version-specific issue tracking. |
| **created_at** | timestamptz | DEFAULT now() |  |

**Volume estimate:** 10K DAU x 15 events/session = 150K rows/day = 4.5M/month. **Retention policy:** Raw events kept 90 days. After 90 days, aggregated into user_behavioral_profile, then raw events purged. A weekly CRON job handles purging.

**Table: user_behavioral_profile** — Aggregated behavioral vectors for clustering.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **user_id** | uuid | PK, FK users | One row per user. |
| **cuisine_acceptance_dist** | jsonb | NOT NULL | {north_indian: 0.35, south_indian: 0.25, ...}. Acceptance rate by cuisine. |
| **cooking_method_dist** | jsonb |  | {steamed: 0.4, fried: 0.3, ...}. From Tier 2 tags of accepted dishes. |
| **texture_dist** | jsonb |  | {crispy: 0.5, soft: 0.3, ...}. From Tier 2 tags. |
| **spice_dist** | jsonb | NOT NULL | {level_1: 0.1, level_2: 0.3, level_3: 0.4, level_4: 0.2}. Acceptance by spice level. |
| **avg_session_duration** | numeric |  | Seconds. From app_events. |
| **sessions_per_week** | numeric |  | Average weekly sessions. |
| **feature_usage** | jsonb |  | {week_view: 12, search: 8, grocery: 5}. Feature tap counts. |
| **primary_meal_slot** | text |  | Which slot user interacts with most. |
| **total_accepts** | integer | DEFAULT 0 | Lifetime suggestion accepts. |
| **total_rejects** | integer | DEFAULT 0 | Lifetime never + not_today. |
| **days_active** | integer | DEFAULT 0 | Total active days since signup. |
| **last_calculated** | timestamptz | NOT NULL |  |

**Updated:** Weekly by CRON Edge Function (Sunday 3 AM). Reads from suggestion_logs + app_events. This is what K-means clustering operates on in RE v3/v4.

**Table: user_feedback** — Explicit user-submitted feedback.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **user_id** | uuid | FK NOT NULL |  |
| **feedback_type** | text | NOT NULL | bug_report, dish_issue, suggestion_quality, feature_request, general. |
| **related_entity_type** | text |  | dish, plan, app. |
| **related_entity_id** | uuid |  | dish_id or plan_id if applicable. |
| **message** | text |  | Free text. Optional for thumbs down. |
| **rating** | smallint |  | 1-5 for dish ratings. Null for other feedback types. |
| **status** | text | DEFAULT 'new' | new, reviewed, resolved. |
| **created_at** | timestamptz | DEFAULT now() |  |

## 4.5 Group 5: Operations

**Table: audit_log** — DPDP compliance. Tracks security-relevant actions.

| **Column** | **Type** | **Constraint** | **Notes** |
| --- | --- | --- | --- |
| **id** | uuid | PK |  |
| **user_id** | uuid | FK |  |
| **action** | text | NOT NULL | login, login_failed, password_change, data_export, data_delete_request, preference_change, consent_update. |
| **ip_address** | text |  | Logged for security investigations. |
| **device_info** | text |  | OS, app version. |
| **metadata** | jsonb |  | Action-specific details. |
| **created_at** | timestamptz | DEFAULT now() |  |

**Retention:** Audit logs kept for 3 years (DPDP requirement). Never auto-purged.

**Table: referrals** — referrer_id, referred_id, referral_code, status (pending/completed), premium_days_awarded, created_at.

**Table: notification_log** — user_id, notification_type, sent_at, opened (boolean), opened_at.

# 5. Entity Relationships Summary

Key relationships and cascade rules for the 40+ MVP Tables (see Doc 11A for complete spec).

| **Relationship** | **Type** | **Cascade Rule** |
| --- | --- | --- |
| **users → cuisine_preferences** | One-to-Many | CASCADE DELETE (user deleted = prefs deleted) |
| **users → meal_preferences** | One-to-Many | CASCADE DELETE |
| **users → daily_plans** | One-to-Many | CASCADE DELETE |
| **users → suggestion_logs** | One-to-Many | ANONYMIZE on delete (set user_id = null, keep for aggregate analytics) |
| **users → never_list** | One-to-Many | CASCADE DELETE |
| **users → app_events** | One-to-Many | CASCADE DELETE (DPDP: must delete user's events) |
| **users → user_behavioral_profile** | One-to-One | CASCADE DELETE |
| **users → user_inferred_prefs** | One-to-One | CASCADE DELETE |
| **users → user_recipe_affinity** | One-to-Many | CASCADE DELETE |
| **users → audit_log** | One-to-Many | RETAIN (audit logs survive user deletion for compliance) |
| **users → user_feedback** | One-to-Many | ANONYMIZE (keep feedback, remove user_id) |
| **dishes → dish_ingredients** | One-to-Many | CASCADE DELETE |
| **dishes → cuisines_master** | Many-to-One | RESTRICT (can't delete cuisine if dishes reference it) |
| **dish_ingredients → ingredients_master** | Many-to-One | RESTRICT (can't delete ingredient if dishes use it) |
| **daily_plans → dishes (via arrays)** | References (no FK) | Dish soft-deleted (is_active=false), plan keeps ID but RE skips it for future plans |
| **users → referrals (as referrer)** | One-to-Many | SET NULL (referrer deleted, referral record stays) |

**DPDP Account Deletion Flow:** User requests deletion → account_deleted_at set (soft delete) → 72-hour grace period → CRON job runs hard delete: CASCADE on preferences, plans, never list, events, profiles, affinity. ANONYMIZE suggestion_logs and feedback. RETAIN audit_log. Clear from Supabase Auth.

# 6. Indexing Strategy

| **Table** | **Index** | **Purpose** |
| --- | --- | --- |
| **dishes** | (cuisine_id, diet_type, is_active) | RE hard filter: fast eligible pool |
| **dishes** | GIN (meal_types) | Array contains: 'which dishes are breakfast?' |
| **dishes** | GIN (cooking_method, texture, primary_taste) | Food DNA matching queries |
| **dishes** | GIN (weather_affinity) | Weather boost scoring |
| **dishes** | Full-text on (name, description) | Search: tsvector with weights (name A, description B) |
| **dish_ingredients** | (dish_id) | Join to get ingredients for a dish |
| **dish_ingredients** | (ingredient_id) | Reverse: 'which dishes use paneer?' |
| **daily_plans** | (user_id, plan_date) UNIQUE | Fetch today's plan |
| **suggestion_logs** | (user_id, action_at DESC) | History queries for RE scoring |
| **suggestion_logs** | (dish_id, action) | Aggregate acceptance metrics |
| **app_events** | (user_id, created_at DESC) | User activity timeline |
| **app_events** | (session_id) | Session reconstruction |
| **app_events** | (created_at) WHERE created_at < now() - interval '90 days' | Partial index for retention purge job |
| **user_recipe_affinity** | (user_id) WHERE is_eligible = true | Fast eligible pool fetch per user |
| **never_list** | (user_id) WHERE is_active = true | Active never list per user |
| **audit_log** | (user_id, created_at DESC) | Security audit queries |

# 7. Query Optimization & Performance

| **Strategy** | **Implementation** |
| --- | --- |
| **Pre-computed Eligible Pools** | user_recipe_affinity stores is_eligible per user-dish pair. Computed on signup and when preferences change. The 5 AM batch reads WHERE is_eligible = true instead of re-running hard filters. Saves ~40% of scoring time. |
| **Static Score Caching** | user_recipe_affinity.static_score stores the non-changing portion (cuisine boost + meal item boost + home state). Daily batch only adds dynamic scores (weather, history, variety, random). Recalculated only on preference change. Saves ~20% more. |
| **Batch Processing** | 5 AM job processes users in batches of 100-200 with 500ms gaps. Total for 10K users: ~3-5 minutes. Well within 5:00-7:30 AM window. Parallel batches if needed at 50K+ users. |
| **Connection Pooling** | Supabase free tier: 60 connections. Pro: 200+. Edge Functions use connection pooler (PgBouncer built into Supabase). Batch jobs use single long-lived connection per batch. |
| **Full-Text Search** | PostgreSQL tsvector on dishes.name (weight A) and dishes.description (weight B). Pre-computed tsvector column with GIN index. Query: plainto_tsquery('biryani'). Returns ranked results in < 50ms for 5K dishes. |
| **Materialized Views** | Consider for: top_dishes_by_cuisine (refreshed daily), cuisine_popularity_by_region (refreshed weekly). Only if direct queries become slow at 5K+ dishes. |

# 8. Data Volume & Retention

| **Table** | **Growth Rate** | **Size at 6 months** | **Retention** | **Purge Method** |
| --- | --- | --- | --- | --- |
| **app_events** | 150K rows/day | ~100MB | 90 days | Weekly CRON purge |
| **suggestion_logs** | 30K rows/day | ~40MB | 1 year | Quarterly archive |
| **daily_plans** | 10K rows/day | ~20MB | 6 months | Archive to cold storage |
| **rec_debug_log** | ~1.5K rows/day (5%) | ~5MB | 30 days | Weekly CRON purge |
| **audit_log** | ~500 rows/day | ~3MB | 3 years (DPDP) | Never auto-purge |
| **notification_log** | ~10K rows/day | ~10MB | 90 days | Weekly CRON purge |
| **dishes** | ~20 new/month | < 1MB | Permanent | Soft delete only |
| **users** | ~5K new/month | < 2MB | Permanent | Hard delete on request |

**Total estimated DB size at 6 months (10K MAU): ~180MB.** Well within Supabase free tier (500MB). Crosses free tier at approximately 15-18 months or 25K MAU, at which point upgrade to Pro ($25/mo). The retention/purge strategy keeps growth linear, not exponential.

# 9. Dimension Scaling Plan

How the Food DNA tag architecture evolves from 20 dimensions to 1000+.

| **Stage** | **When** | **Architecture** | **Migration Trigger** |
| --- | --- | --- | --- |
| **Stage 1** | MVP - Phase 2 | 20 fixed columns on dishes table. Direct SQL. Simple, fast, debuggable. | No migration needed. Current approach. Works to ~50 dimensions. |
| **Stage 2** | Phase 2-3 | Hybrid: 7 Tier 1 fixed columns (hard filters) + dish_extended_tags table (dish_id, tag_category, tag_value, confidence). New dimensions added as rows, not columns. | Trigger: adding > 5 new dimensions in a quarter, OR total > 40. Migration: create table, INSERT from existing columns, update RE to query both. Zero downtime. |
| **Stage 3** | Phase 3+ | Vector embeddings via pgvector. Each dish = numeric vector [0.8, 0.3, ...]. Each user's prefs = vector. Matching = cosine similarity. Supabase supports pgvector natively. | Trigger: 50K+ MAU AND scoring > 2 sec/user. Requires ML model to generate embeddings. Keep Stage 2 as fallback. |

# 10. Concurrency & Transaction Rules

| **Scenario** | **Rule** |
| --- | --- |
| **5 AM batch running + user pulls to refresh** | Pull-to-refresh is a separate Edge Function call. It reads the user's current plan, regenerates unlocked slots, and writes back. The batch job also writes plans. PostgreSQL's MVCC handles this: last write wins. If batch writes first and refresh writes second, refresh result is what the user sees (correct behavior). |
| **Two family members lock same slot** | Lock is an UPDATE on daily_plans.locked_slots array. Use optimistic locking: read current locked_slots, append new slot, write back with WHERE locked_slots = [original value]. If concurrent, one will fail. Retry once. In practice, extremely rare. |
| **User Never's a dish while batch is scoring** | Never list INSERT is instant. Batch job reads never_list at start of each user's scoring. If Never happens mid-batch for a user not yet scored: caught. If user already scored: the dish may appear in today's plan but will be replaced on next refresh. Acceptable edge case. |
| **Plan generation overlapping (5 AM + manual refresh)** | Both write to daily_plans. Unique constraint (user_id, plan_date) prevents duplicates. Use UPSERT (INSERT ON CONFLICT UPDATE) for both batch and refresh. Last write wins, which is always the freshest data. |

# 11. Image Pipeline

| **Aspect** | **Details** |
| --- | --- |
| **Storage** | dishes.photo_url stores Cloudinary base URL. dishes.blurhash stores ~30-char Blurhash string for progressive loading. |
| **3 Sizes** | thumb (240px, ~10KB), card (720px, ~60KB), hero (1080px, ~120KB). Derived from base URL via Cloudinary transform params: /w_720,q_75,f_auto/ |
| **Format** | WebP quality 75%. Cloudinary auto-serves JPEG fallback for unsupported devices. |
| **Progressive Loading** | Client flow: render Blurhash placeholder instantly (< 1ms) → fetch card/hero image → crossfade (300ms). Layout never jumps. |
| **Caching** | React Native FastImage. 200MB disk cache, LRU eviction. Cache hit > 90% after first week. |
| **Offline** | 3 card images cached in AsyncStorage for today's plan (~180KB). |
| **Upload** | New dish: upload original to Supabase Storage → Edge Function triggers Cloudinary upload → Cloudinary generates Blurhash + 3 sizes → URLs + Blurhash stored on dishes row. |
| **Cache Invalidation** | On dish photo update: increment a version suffix on the URL (e.g., /v2/). Cloudinary serves new version. Client's FastImage cache misses on new URL. |

# 12. Error Handling & Graceful Degradation

| **Failure** | **Impact** | **Fallback** |
| --- | --- | --- |
| **Plan gen fails (5 AM)** | Empty Home screen | Serve yesterday's plan for unlocked slots. Banner: 'Refreshing...' Retry every 15 min. Sentry alert. |
| **Weather API down** | No weather scoring | Skip weather (score += 0). Use cached if < 24hrs. Never block plan generation. |
| **Image load fails** | Broken meal card | Blurhash stays. Retry 3x. If all fail: cuisine-colored gradient + text overlay. |
| **Network offline** | Can't fetch plan | Cached plan from AsyncStorage. Banner: 'Offline.' Swipe disabled. Actions queued, sync on reconnect. |
| **Empty eligible pool** | No dishes match | 'We can't find dishes for your preferences. Review settings?' Link to Edit Preferences. |
| **Edge Function timeout** | Scoring too slow | 30s timeout. Return partial (minimum 3/slot). Fall back to random eligible. |
| **Auth token expired** | 401 errors | Auto-refresh. If fail: Sign In screen. Preserve in-progress actions. |
| **DB connection pool full** | 500 errors | Supabase auto-scales on Pro. Free: 60 connections. Client shows 'Taking a moment...' + retry. |
| **Dish deleted but in plan** | Stale reference | Check is_active on fetch. If false: show 'This dish is no longer available' + auto-suggest replacement. |

# 13. Authentication & Security

| **Aspect** | **Implementation** |
| --- | --- |
| **Sign Up** | Supabase Auth signUp(email, password). Creates auth user + users row (DB trigger). Sends verification email. data_consent_at and data_consent_version recorded at signup. |
| **Sign In** | signInWithPassword. Returns JWT (1hr) + refresh (30d). Stored in Expo SecureStore. login_attempts tracked. Lock after 5 failures for 30 minutes. |
| **Session** | Auto-refresh via Supabase client. last_login_at updated on each auth. Force re-login on password change. |
| **Password Reset** | resetPasswordForEmail. Sends link. Existing sessions invalidated. audit_log entry created. |
| **RLS** | Every table: WHERE user_id = auth.uid(). Dishes and reference tables: readable by all authenticated. Only Edge Functions use service key. |
| **DPDP Compliance** | data_consent_at/version on users. audit_log for all security actions (3-year retention). Data export via Edge Function. Account deletion: 72-hour soft delete then hard purge with cascade rules. |
| **Brute Force** | login_attempts counter. account_locked_until set after 5 failures. Cleared on successful login or after 30 min. |
| **Rate Limiting** | Supabase built-in + custom on Edge Functions. Auth: 10/min. Plan generation: 5/min. Search: 30/min. |

# 14. Edge Functions

| **Function** | **Trigger** | **Response** | **Phase** |
| --- | --- | --- | --- |
| **generate-daily-plans** | CRON 5 AM IST daily | Void (writes to DB) | **MVP** |
| **generate-first-plan** | POST after onboarding | Plan JSON | **MVP** |
| **regenerate-slot** | POST after Never/Not Today | 8 new dish IDs | **MVP** |
| **refresh-plan** | POST pull-to-refresh | Updated plan | **MVP** |
| **fetch-weather** | Called by plan gen | Cached weather | **MVP** |
| **recalculate-affinity** | POST on preference change | Void (updates user_recipe_affinity) | **MVP** |
| **calculate-inferred-prefs** | CRON weekly Sun 3 AM | Void (updates user_inferred_prefs) | **MVP** |
| **aggregate-behavioral** | CRON weekly Sun 3:30 AM | Void (updates user_behavioral_profile) | **MVP** |
| **purge-old-events** | CRON weekly Sun 4 AM | Void (deletes > 90 day events) | **MVP** |
| **daily-analytics-email** | CRON 11 PM IST | Email to founders | **MVP** |
| **track-referral** | POST on referred signup | Referral status | **MVP** |
| **generate-grocery-list** | GET user + date range | Aggregated ingredients | **MVP** |
| **tag-dishes-auto** | POST on new dish added | Auto-derived Tier 1 tags | **MVP** |

# 15. Founder Analytics Dashboard

Daily email report via Edge Function at 11 PM IST. Aggregates the day's data from suggestion_logs, app_events, users, and notification_log.

| **Metric** | **Calculation** |
| --- | --- |
| **New Signups / Total** | COUNT users WHERE created_at = today |
| **Onboarding Completion** | onboarding_completed = true / total signups |
| **DAU** | DISTINCT user_ids in app_events WHERE event_type = 'app_open' AND today |
| **Suggestion Acceptance Rate** | Views without reject actions / total viewed |
| **Never Rate / Not Today Rate** | COUNT action='never' or 'not_today' / total suggestions |
| **Avg Carousel Depth** | AVG carousel_position WHERE action IN (locked, tapped_detail) |
| **Top 10 Rejected Dishes** | Highest never + not_today count (quality signal) |
| **Top 10 Accepted Dishes** | Highest locked + tapped_detail count |
| **Dish Pool Utilization** | DISTINCT dishes in today's plans / total active dishes |
| **Retention (D1, D3, D7)** | Cohort: users active on day N after signup |
| **Notification Open Rate** | opened = true / sent from notification_log |
| **Avg Session Duration** | From app_events: app_close.timestamp - app_open.timestamp |
| **RE Errors Today** | From Sentry API or error_encountered events |

# 16. WhatsApp Referral Integration

Referral code auto-generated on signup (6-char). Share via WhatsApp with pre-filled message + deep link. On referred signup: Edge Function links users, awards 15 premium days to both (referrer stackable to 180 days max). Fraud: max 20 referrals/user, same device can't be referred twice, referred user must complete onboarding.

# 17. Offline & Caching

| **Data** | **Cache** | **Strategy** |
| --- | --- | --- |
| **Today's Plan** | AsyncStorage | Cached on fetch. Stale after 24hrs. Shown offline with banner. |
| **Dish Details (viewed)** | React Query + AsyncStorage | 7-day cache. ~2KB per dish. |
| **Card Images** | FastImage disk | 200MB LRU cache. >90% hit rate after week 1. |
| **Preferences** | AsyncStorage + Supabase | Local copy. Synced on change. |
| **Pending Actions** | AsyncStorage queue | Never/Not Today/Lock queued offline. FIFO sync on reconnect. Max 50. |

# 18. CI/CD & Deployment

GitHub private repo. Main (production) + develop (staging) branches. Expo EAS Build for cloud builds (no local Xcode). Expo EAS Update for OTA JS changes (skip app store). Supabase CLI for Edge Function deployment and DB migrations. Sentry auto-attached to builds.

# 19. Infrastructure Costs

| **Service** | **MVP (0-5K)** | **Growth (5-15K)** | **Scale (15-50K)** |
| --- | --- | --- | --- |
| **Supabase** | Free | Pro Rs 2,100/mo | Pro Rs 2,100/mo |
| **Cloudinary** | Free | Free | ~Rs 800/mo |
| **OneSignal** | Free | Free | Free |
| **OpenWeatherMap** | Free | Free | ~Rs 400/mo |
| **PostHog** | Free | Free | Free |
| **Sentry** | Free | Free | ~Rs 2,200/mo |
| **Expo EAS** | Free | Free | ~Rs 800/mo |
| **TOTAL MONTHLY** | Rs 0-500 | Rs 2,100-3,000 | Rs 5,000-8,000 |

# 20. Impact on Other Documents

The 3-level content model and expanded DB architecture require updates to 4 earlier documents. Summary of changes:

| **Document** | **Required Changes** |
| --- | --- |
| **Doc 6-7 PRD v3** | 1. Feature #10 'Meal Detail Page': MVP shows dish info + simple ingredient list (no recipe steps, no audio/video). Recipe tab renamed to 'Ingredients' tab only. 2. Feature #12 'Ingredients Checklist': now pulls from dish_ingredients junction (ingredient names only, no quantities). 3. Feature #13 'Grocery List': works with ingredient names only (no quantities until Level 3). 4. Update 'recipe' terminology to 'dish' throughout. 5. Add 'has_full_recipe' indicator on Meal Detail (show 'Recipe coming soon' placeholder for dishes without Level 3). 6. Non-functional: update dish database reference to 'dish database (500+ dishes with Tier 1 tags).' |
| **Doc 8 IA** | 1. Meal Detail Page hierarchy: remove 'Ingredients List (simple)' from MVP. Replace with 'Ingredients List (simple)' MVP + 'Full Recipe' Phase 1. 2. Screen inventory #19 'Meal Detail': key elements updated to 'hero image, dish info, tags, simple ingredients, lock, plus button.' 3. Footer: no changes (Planner tab wording unchanged). 4. Search results: now searching 'dishes' not 'recipes.' |
| **Doc 9 Design** | 1. Section 8.8 Meal Detail wireframe: remove Recipe tab and Tab Bar from MVP. Single scroll: hero → info → action buttons → ingredients list. 2. Add 'Recipe coming soon' placeholder component spec. 3. Ingredient list component: simpler than before (no quantity column, just checkboxes + ingredient names). 4. Grocery List (Section 8.10): remove quantity column. Just ingredient name + checkbox grouped by category. |
| **Doc 10 RE v2** | Minimal changes. RE operates on Food DNA tags, not recipe content. 1. Update 'recipe' references to 'dish' in scoring pipeline description. 2. Update data model section to reference 'dishes' table. 3. Recipe tagging taxonomy (Section 3): already correct since it tags the dish, not the recipe. 4. No algorithm changes needed. |

# 21. Next Steps

- Create Supabase project (Mumbai region) and run migration for all 40+ tables

- Populate cuisines_master (~20 cuisines) and food_tags_reference (~100 tags) as seed data

- Populate ingredients_master with top 200 Indian cooking ingredients

- Load 50 test dishes with Tier 1 tags + simple ingredients for dev testing

- Set up Expo project, configure Supabase client, test auth end-to-end

- Build generate-first-plan Edge Function (RE v1 scoring pipeline)

- Build Splash + Intro + Auth screens (validate dev workflow)

- Build onboarding flow with bucket selector

- Build Home Day View with card carousel and gesture system

- Set up PostHog + Sentry from Day 1

- Build daily-analytics-email Edge Function

- Apply revisions to Docs 6-9 per Section 20

- Begin Document #12: MVP Sprint Plan with week-by-week schedule

***This document + RE v2 (Doc #10) = everything needed to build the MVP.**** 40+ tables, 13 Edge Functions, 16 indexes, 5 table groups, and clear rules for timezone, concurrency, error handling, data retention, and dimension scaling. The 3-level content model lets you launch fast with dish cards + simple ingredients and add full recipes post-launch without schema changes.*

Page
