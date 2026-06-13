# BUILD-00B — Existing Project Integration Audit

> Branch: `apverse-labs-RE`
> Date: 2026-06-13
> Auditor: Claude (BUILD-00B automated audit)
> Source files read: foofoo/CLAUDE.md, foofoo/src/types/index.ts, supabase/functions/generate-daily-plan/*, foofoo-tests/lib/re-engine.ts, foofoo-tests/personas/persona-definitions.ts, app/(onboarding)/step-1.tsx, supabase/migrations/20260519000001_sprint1_sprint2_schema.sql

---

## 1. Existing Project Stack Summary

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React Native + Expo SDK 52+ | TypeScript strict throughout |
| Web | React Native Web + Expo Metro | Same screens as mobile |
| Navigation | Expo Router (file-based) | Screen file name = route |
| State | Zustand (lightweight) | — |
| Server state | TanStack React Query | Caching, offline, background refresh |
| Gestures | react-native-gesture-handler + Reanimated 3 | 60fps non-negotiable |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | ap-south-1 (Mumbai) |
| Auth | Supabase Auth | Email+password MVP |
| RE (production) | Supabase Edge Functions (Deno/TypeScript) | generate-daily-plan, regenerate-slot, batch |
| Push | expo-notifications + OneSignal | — |
| Images | Supabase Storage + Cloudinary CDN | WebP, Blurhash |
| Weather | OpenWeatherMap API | 1K calls/day free |
| Analytics | PostHog | 1M events/month free |
| Errors | Sentry | 5K events/month free |
| Deployment | Vercel (static export) | Auto-deploy DISABLED (exit 1) |

---

## 2. Current Folder / Module Architecture

```
foofoo/ (the app)
├── app/
│   ├── (auth)/              sign-in, sign-up, email-verification, forgot-password
│   ├── (intro)/             intro-1
│   ├── (onboarding)/        step-1 through step-7
│   ├── (tabs)/              index (Home), search, grocery, profile
│   ├── (dev)/               dev logs screen
│   └── dish/[id]/           dish detail
│
├── src/
│   ├── config/constants.ts  APP_NAME, COLORS, SPACING, RE_CONFIG
│   ├── types/index.ts       All TypeScript types (Dish, UserProfile, REInput, etc.)
│   ├── modules/home/        HomeScreen helpers + useHomeScreen hook
│   ├── components/
│   │   ├── dish/            MealCard, NeverModal, NotTodayModal, DishDetailHeader, etc.
│   │   ├── planner/         WeekView
│   │   ├── search/          SearchBar, FilterBottomSheet, etc.
│   │   └── shared/          OnboardingLayout, BucketSelector, GestureTutorial
│   ├── repositories/        All Supabase queries (dishes, plans, feedback, onboarding, etc.)
│   ├── services/            supabase.ts, offline.service.ts, posthog.service.ts, onesignal.service.ts
│   └── utils/               reDecisionLogger, userJourneyLogger, systemLogger, indian-states, validators
│
├── supabase/
│   ├── functions/           Edge Functions (see §8)
│   └── migrations/          25 SQL migration files (Sprint 1–7)
│
└── SeedData/                CSV/XLSX seed files (cuisines, dishes, ingredients, tags, etc.)

foofoo-tests/ (separate test repo)
├── e2e/                     Playwright + Detox specs
├── integration/             Supabase integration tests
├── unit/                    RE scoring, hard constraints, variety guard, bucket logic
├── personas/                50 test personas + persona-runner
└── lib/                     re-engine.ts (portable TS mirror of Edge Function scoring)
```

---

## 3. Existing Onboarding Flow (Steps + Data Captured)

**7-step linear flow** in `app/(onboarding)/`. Resumes from `profiles.onboarding_step` on re-open.

| Step | Screen | Data Captured | Tables Written |
|------|--------|--------------|----------------|
| 1 | Profile Setup | `name`, `username` (unique, debounced), `current_city`, `home_state` | `profiles` |
| 2 | Food Preference | `food_pref`: veg / non_veg / egg / vegan / jain | `profiles.food_pref`, `user_diet_rules.food_pref` |
| 3 | Allergies | `excluded_ingredients: integer[]` (ingredient IDs, not text) | `user_diet_rules.excluded_ingredients` |
| 4 | Cuisine Buckets | F/O/N bucket per cuisine from `cuisines_master` | `user_category_preferences` (category_type='cuisine') |
| 5 | Breakfast Buckets | F/O/N bucket per breakfast dish (filtered by cuisine pref) | `user_category_preferences` (category_type='meal_item') |
| 6 | Lunch/Dinner Buckets | F/O/N bucket per lunch/dinner dish | `user_category_preferences` (category_type='meal_item') |
| 7 | Role + Notifications + Consent | `role`: cook/instruct, `notification_time`, `notifications_enabled`, `data_consent_at` | `profiles`, `user_consent` |

**Key observations:**
- `home_state` and `current_city` are captured as free text in Step 1 — they are **separate fields** already.
- `food_pref` is captured in Step 2 and written to both `profiles` and `user_diet_rules`.
- Allergens are stored as integer IDs (ingredient IDs), not text — this is correct per RE architecture.
- Bucket selection is F/O/N (Frequently/Occasionally/Never) for both cuisine and dish-level items.
- There is **no cohort/persona assignment step** in the current onboarding. Cohort is not yet derived.
- There is **no household member capture** — only a single `household_type` field (solo/couple/family_with_kids/flatmates) on `profiles`. No per-member dietary profiles.

---

## 4. Existing User Profile / Household Profile Model

### `profiles` table (core user identity)
```sql
id                    UUID PK → auth.users
email                 TEXT
name                  TEXT
username              TEXT (unique)
avatar_url            TEXT
food_pref             TEXT ('veg','non_veg','egg','vegan','jain')
home_state            TEXT   ← native food identity (separate from current_city ✅)
current_city          TEXT   ← lifestyle overlay (separate from home_state ✅)
household_type        TEXT ('solo','couple','family_with_kids','flatmates')
role                  TEXT ('cook','instruct')
onboarding_completed  BOOLEAN
onboarding_step       INTEGER
notification_time     TEXT
notifications_enabled BOOLEAN
created_at / updated_at TIMESTAMPTZ
```

### `user_diet_rules` table
```sql
id                   UUID PK
user_id              UUID → profiles
food_pref            TEXT
excluded_ingredients INTEGER[]  ← allergen + exclusion ingredient IDs
created_at / updated_at
```

### `user_category_preferences` table
```sql
id            UUID PK
user_id       UUID → profiles
category_type TEXT ('cuisine' | 'meal_item')
category_id   TEXT  ← cuisine code or dish slug/id
item_id       TEXT  ← (used interchangeably with category_id in some places)
preference_bucket TEXT ('F' | 'O' | 'N')
created_at
```

### `user_inferred_prefs` table (RE v2)
```sql
user_id           UUID → profiles
spice_score       NUMERIC    ← learned spice preference (-1..+1)
complexity_score  NUMERIC    ← preference for quick vs slow cooking
repeat_tolerance  NUMERIC    ← how soon they're OK seeing the same dish again (1..10)
cuisine_drift     JSONB      ← per-cuisine learned drift scores
```

### `user_recipe_affinity` table (RE v2)
```sql
user_id   UUID
dish_id   INTEGER
affinity  NUMERIC  ← 0..1, computed from engagement history
```

### Missing from RE v2 requirements:
- **No cohort/persona assignment table** — no `user_cohort`, `user_persona`, or `re_user_assignment` table exists.
- **No per-member household profiles** — `household_type` is a single field; no `household_members` table.
- **No RE version routing table** — no `re_engine_versions` or `re_user_engine_assignments` table.
- **No `home_state` as a structured regional identity** — stored as plain text state name, not a canonical state code.

---

## 5. Existing Meal Planning / RE Logic

### Architecture
The RE is implemented entirely inside **Supabase Edge Functions**. The app calls the Edge Function; there is no RE logic client-side.

### Current RE Version: v1 (with v2 signals already wired)
The production code is technically labelled "RE v1" with v2 signals that activate when `user_inferred_prefs` exist for the user.

### `generate-daily-plan` Edge Function — full pipeline

**Input:** `{ planDate?, forceRegenerate? }` + user JWT (or service role key for CRON)

**Pipeline (9 steps):**
1. **Hard filter** — `diet_type`, `allergen_ids` (integer array), `never_list`, `is_active=true`
2. **Base score** — 1.0 for all eligible dishes
3. **Cuisine boost** — F bucket: +0.3, O bucket: +0.1, N bucket: excluded
4. **Meal item boost** — F bucket: +0.25, O bucket: +0.05
5. **Weather boost** — cold/rainy + spicy/heavy: +0.15; hot + light/not-spicy: +0.15 (AND-gated)
6. **Day-of-week boost** — weekday + quick dish (≤20 min): +0.1; weekend + slow dish (>30 min): +0.05
7. **Home-state affinity boost** — `region_food_affinity` table, scaled 0.0–0.2
8. **Variety guard** — dish seen in last 3 days: -0.5
9. **Deterministic random** — seeded by (user, date, dish): 0–0.15

**RE v2 signals** (activated when `user_inferred_prefs` exists):
- Spice alignment boost (±0.15)
- Complexity/cook-time alignment boost (±0.10)
- Cuisine drift boost (±0.20, per-cuisine)
- Dish-level affinity boost (±0.20, pre-computed from history)

**Output per slot:** top dish + carousel of 8, scores written to `planner_carousel.re_score`

**Version stamp:** `planner.re_version` = `'v1'` or `'v2'`

**Key technical note:** The current system does **not** use meal classes. It scores all eligible dishes directly and picks the top-scored one per slot (breakfast/lunch/dinner). This is the core architectural gap vs the RE v2 class-first requirement.

---

## 6. Existing Recipe / Dish / Meal Data Model

### `dishes` table (core)
```sql
id               INTEGER PK (sequence — NOT UUID)
name             TEXT
slug             TEXT (unique)
cuisine_id       INTEGER → cuisines_master
diet_type        TEXT ('veg','non_veg','egg','vegan','jain')
dish_role        TEXT ('main','side','accompaniment','dessert','snack')
meal_types       TEXT[]  ← ['breakfast'], ['lunch','dinner'], etc.
spice_level      INTEGER (1–4)
difficulty       TEXT ('easy','medium','hard')
cook_time_mins   INTEGER
calories         INTEGER
hero_image_url   TEXT
cloudinary_public_id TEXT
blurhash         TEXT
is_active        BOOLEAN
is_jain          BOOLEAN (auto-derived)
allergen_ids     INTEGER[]  ← auto-derived from ingredient flags
ingredient_ids   INTEGER[]  ← foreign refs to ingredients_master
description      TEXT
```

### `cuisines_master` table
```sql
id             INTEGER PK
code           TEXT (unique, e.g. 'north_indian', 'south_indian')
name           TEXT
display_name   TEXT
tier           INTEGER
display_order  INTEGER
is_active      BOOLEAN
is_user_facing BOOLEAN
```

### `dish_tags` junction table (Food DNA)
```sql
dish_id  INTEGER → dishes
tag_id   INTEGER → tags
```

### `tags` table
```sql
id           INTEGER PK
category     TEXT (e.g. 'cuisine', 'cooking_method', 'primary_taste')
value        TEXT
display_name TEXT
tier         INTEGER (1=MVP, 2=post-launch, 3=phase 2)
```

### `region_food_affinity` table
```sql
state_code    TEXT  ← 2-letter Indian state code (e.g. 'MH', 'TN')
cuisine_id    INTEGER → cuisines_master
affinity_score NUMERIC (0..1)
```

### Missing vs RE v2 requirements:
- **No `meal_class` concept** — dishes are scored directly; no intermediate meal class layer.
- **No `class_dish_options` mapping** — dishes are not grouped into meal classes.
- **No `addon_components` table** — no member-specific add-on concept exists.
- **No `meal_class_code` field** on dishes.

---

## 7. Existing DB / Supabase Structure Relevant to RE

### RE-relevant tables (production, SCHEMA-BASE-001)

| Table | Purpose | RE relevance |
|-------|---------|-------------|
| `profiles` | User identity, home_state, current_city, household_type | RE input source |
| `user_diet_rules` | food_pref, excluded_ingredients (integer[]) | Hard filter source |
| `user_category_preferences` | Cuisine + meal item F/O/N buckets | Scoring boost source |
| `user_inferred_prefs` | Learned spice, complexity, drift, repeat_tolerance | RE v2 signals |
| `user_recipe_affinity` | Pre-computed dish affinity per user | RE v2 signals |
| `dishes` | Full dish catalog with meal_types, diet, spice, cook_time, calories | Eligible pool |
| `cuisines_master` | Cuisine codes + names | Cuisine boost lookup |
| `region_food_affinity` | State code → cuisine affinity score | Home-state boost |
| `never_list` | User-level permanent dish exclusions | Hard filter |
| `planner` | Daily plan record (breakfast/lunch/dinner dish IDs, re_version) | Plan output |
| `planner_carousel` | Top 8 dishes per slot per plan, with re_score | Carousel output |
| `suggestion_logs` | Every dish shown/swiped/locked/etc. per user | RE v2 learning input |
| `recommendation_debug_log` | Score breakdown per plan per slot | Observability |
| `weather_cache` | Cached OpenWeatherMap results by city | Weather boost input |
| `experiments` | A/B experiment definitions | Future RE version testing |
| `experiment_assignments` | User → experiment arm assignments | RE version routing hook |

### 25 migration files (Sprint 1–7, all applied except 2 staged)
- Migrations are already numbered `YYYYMMDD_NNN_label.sql` format — consistent with project rules.
- Two migrations staged but not yet applied: `20260522110000_atomic_carousel_replace.sql`, `20260522110100_widen_suggestion_logs_action_check.sql`.

### No existing RE-specific schema prefix
Existing RE tables do not use a `re_` prefix — they use generic names (`planner`, `suggestion_logs`, etc.). New RE module tables should use `re_` prefix to avoid collision.

---

## 8. Existing API Routes / Edge Functions (Full List)

| Function | Purpose | Called by |
|----------|---------|-----------|
| `generate-daily-plan` | RE v1/v2 plan generation + carousel write | Home screen on mount / pull-to-refresh |
| `generate-daily-plans-batch` | Batch plan generation for all users | 5AM IST CRON (pg_cron + pg_net) |
| `regenerate-slot` | Regenerate a single meal slot (swipe refresh) | Home screen swipe action |
| `calculate-inferred-prefs` | Compute spice/complexity/drift/repeat_tolerance from history | Weekly CRON |
| `compute-recipe-affinity` | Compute dish-level affinity scores | Weekly CRON |
| `backfill-ingredients` | Backfill ingredient_ids on dishes | Admin one-off |
| `derive-dish-attributes` | Auto-derive diet_type, is_jain, allergen_ids from ingredient flags | On dish insert trigger + admin |
| `log-re-decision` | Log RE decision events to recommendation_debug_log | Called internally / admin |
| `sync-cloudinary-images` | Sync Cloudinary image URLs to dishes table | Admin |
| `daily-analytics-email` | Compute 13 metrics and send daily email | Daily CRON |
| `send-morning-notification` | Send push notification at user's notification_time | Daily CRON |
| `delete-account` | Anonymize and delete user account | Profile screen |
| `delete-user-account` | (alternate version) Hard delete user | Profile Danger Zone |

### generate-daily-plan detailed interface (current stable contract)
```typescript
// Input (POST body)
{ planDate?: string; forceRegenerate?: boolean; targetUserId?: string }

// Authorization: Bearer <user-jwt> OR Bearer <service-role-key> (for batch)

// Output (success)
{
  success: true,
  data: {
    planId: string;
    planDate: string;
    reVersion: 'v1' | 'v2';
    generatedInMs: number;
    cached: boolean;
    breakfast: { dish: Dish; carouselCount: number };
    lunch:     { dish: Dish; carouselCount: number };
    dinner:    { dish: Dish; carouselCount: number };
    reSummary: { breakfast: RESummarySlot; lunch: RESummarySlot; dinner: RESummarySlot };
  }
}
```

---

## 9. Existing Test Setup

### Test framework
- **Unit tests:** Jest + TypeScript (`foofoo-tests/unit/`) — test the portable `lib/re-engine.ts` mirror
- **Integration tests:** Jest + Supabase client (`foofoo-tests/integration/`) — test against live Supabase
- **E2E tests:** Playwright (`foofoo-tests/e2e/`) — browser-based full-flow tests
- **Persona tests:** Custom runner (`foofoo-tests/personas/persona-runner.ts`) — runs 50 synthetic personas against live RE

### Unit test files
| File | What it tests |
|------|--------------|
| `unit/re-scoring.test.ts` | Full RE v1+v2 scoring pipeline |
| `unit/hard-constraints.test.ts` | Diet, allergen, never-list hard filters |
| `unit/variety-guard.test.ts` | Repeat window, variety penalty |
| `unit/bucket-logic.test.ts` | F/O/N bucket boost calculations |
| `unit/auto-derivation.test.ts` | diet_type, is_jain, allergen derivation from ingredients |

### Integration test files
| File | What it tests |
|------|--------------|
| `integration/edge-functions.test.ts` | generate-daily-plan, regenerate-slot live calls |
| `integration/schema-validation.test.ts` | DB schema matches expected shape |
| `integration/rls-security.test.ts` | Row Level Security isolation |
| `integration/dpdp-compliance.test.ts` | Indian data protection compliance |
| `integration/combo-architecture.test.ts` | dish_combos and dish_combo_items |

### E2E test specs
| File | What it tests |
|------|--------------|
| `e2e/specs/TC001-authentication.spec.ts` | Auth flow |
| `e2e/specs/TC002-onboarding.spec.ts` | Full 7-step onboarding |
| `e2e/specs/TC003-home-meal-plan.spec.ts` | Home screen, plan generation, gestures |
| `e2e/specs/TC004-re-safety.spec.ts` | RE safety gates (never-list, allergen, diet) |

### 50-persona test framework
`persona-definitions.ts` defines 50 synthetic personas across:
- All 5 diet types (veg, non_veg, egg, vegan, jain)
- All major Indian regions (MH, TN, KL, KA, AP, UP, RJ, DL, WB, GJ, PB, AS, etc.)
- All 4 household types
- 3 RE maturity stages (cold_start, two_week, three_month)
- Critical constraint combinations (Jain + gluten, egg + shellfish allergy, non-veg + beef exclusion, etc.)

`persona-runner.ts` seeds each persona into Supabase, calls `generate-daily-plan`, and validates output against `expectations.must_never_contain`, `top3_cuisine_match`, and `special_checks`.

### Portable RE engine mirror
`foofoo-tests/lib/re-engine.ts` is a TypeScript mirror of `generate-daily-plan/scoring.ts`. Unit tests run against this mirror. **Must be kept in sync with production Edge Function** — divergence causes false-positive test passes.

---

## 10. Existing Deployment / Preview Flow

| Target | How | Notes |
|--------|-----|-------|
| Production web | Vercel static export | Auto-deploy DISABLED (`ignoreCommand: exit 1`) — manual deploy only |
| Edge Functions | `supabase functions deploy <name>` | Deployed individually per function |
| DB migrations | `supabase db push` | Applied to remote project (ufgfznpqixplcbhmsqqw, ap-south-1) |
| CRON jobs | `pg_cron` extension + `pg_net` | Already configured for 5AM batch, weekly inferred prefs, weekly affinity |
| Branch previews | Not configured | No Vercel preview environments set up |
| Feature flags | `experiments` + `experiment_assignments` tables exist | Not wired into RE version routing yet |

---

## 11. Recommended RE Module Boundary

### What exists that RE module must NOT touch
- All 25 existing migrations and their tables
- The stable contract of `generate-daily-plan` (its input/output JSON shape must remain unchanged to the app)
- Existing `profiles`, `planner`, `planner_carousel`, `suggestion_logs` tables
- The client-side repositories (`src/repositories/`) and screen components

### Where RE module plugs in
The RE module should be implemented as a **new Edge Function layer** that the existing `generate-daily-plan` function delegates to:

```
App
 └── generate-daily-plan (existing — stable contract, unchanged)
      └── calls engineResolver(userId) → returns assigned RE version
           └── calls REEngine_V2.generatePlan(input) → returns scored result
                (uses existing dishes table, existing user tables — no new tables for basic flow)
```

Alternatively (cleaner for versioning): the app is updated to call a new `generate-meal-plan` Edge Function that wraps the resolver:
```
App (updated to call new endpoint)
 └── generate-meal-plan (new stable contract)
      └── engineResolver → RE_V2 or RE_V1 → result
```
The choice between these two approaches is a **founder decision** (see §16).

### What new tables RE module adds (additive only)
New tables with `re_` prefix:
- `re_engine_versions` — registry of available RE versions
- `re_user_engine_assignments` — which RE version each user is on
- `re_meal_classes` — meal class taxonomy (new concept, not in existing schema)
- `re_class_dish_options` — class → eligible dish mappings
- `re_cohort_definitions` — cohort registry from DOC-03
- `re_persona_definitions` — persona registry from source workbook
- `re_user_persona_assignments` — user → persona assignments (overlapping)
- `re_addon_components` — member-specific add-on component definitions

---

## 12. Recommended Shared Interface Between FooFoo App and RE Module

The app should call one stable function. The RE module resolves versioning internally.

```typescript
// Stable app-facing call (never changes regardless of RE version)
POST /functions/v1/generate-meal-plan
Body: {
  planDate?: string;         // YYYY-MM-DD, defaults to today IST
  forceRegenerate?: boolean;
}
Authorization: Bearer <user-jwt>

// Response (stable shape — same for RE_V1, RE_V2, V3, V4)
{
  success: true,
  data: {
    planId: string;
    planDate: string;
    reVersion: string;           // e.g. 'v1', 'v2', 're_v2_class_first'
    generatedInMs: number;
    cached: boolean;
    breakfast: { dish: Dish; carouselCount: number };
    lunch:     { dish: Dish; carouselCount: number };
    dinner:    { dish: Dish; carouselCount: number };
    reSummary?: object;          // optional, RE-version-specific detail
  }
}
```

The existing `generate-daily-plan` function should either:
- (Option A) Be replaced by `generate-meal-plan` (new function with resolver) + app update to call new endpoint
- (Option B) Be kept as-is, and the resolver is added as a shared module imported by all 3 existing RE functions

**Recommendation: Option A** — cleaner versioning boundary, single entry point.

---

## 13. Proposed RE Version Registry Design

```sql
-- New additive table: re_engine_versions
CREATE TABLE re_engine_versions (
  id             TEXT PRIMARY KEY,  -- 'v1', 'v2', 're_v2_class_first'
  display_name   TEXT,
  description    TEXT,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- New additive table: re_user_engine_assignments
CREATE TABLE re_user_engine_assignments (
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  engine_id      TEXT REFERENCES re_engine_versions(id),
  assigned_at    TIMESTAMPTZ DEFAULT NOW(),
  assigned_by    TEXT,  -- 'cold_start_default', 'experiment', 'founder_override'
  PRIMARY KEY (user_id)
);
```

**Version resolution logic (inside resolver):**
1. Check `re_user_engine_assignments` for user → assigned engine
2. If none → check `experiments` / `experiment_assignments` (existing A/B tables)
3. If none → fall back to default engine (currently v1/v2 based on `user_inferred_prefs`)

---

## 14. Proposed Experiment / User-Assignment Design for Multiple RE Versions Live

The existing `experiments` and `experiment_assignments` tables already provide the hook. The RE resolver uses them:

```typescript
// engineResolver.ts
async function resolveEngineForUser(userId: string, supabase: SupabaseClient): Promise<string> {
  // 1. Check explicit assignment
  const { data: assignment } = await supabase
    .from('re_user_engine_assignments')
    .select('engine_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (assignment) return assignment.engine_id;

  // 2. Check experiment assignment (existing tables)
  const { data: expAssignment } = await supabase
    .from('experiment_assignments')
    .select('arm')
    .eq('user_id', userId)
    .eq('experiment_id', 're_version_experiment')
    .maybeSingle();
  if (expAssignment) return expAssignment.arm;  // arm = engine_id

  // 3. Default: use v2 if inferred prefs exist, else v1
  const { data: inferredPrefs } = await supabase
    .from('user_inferred_prefs')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return inferredPrefs ? 'v2' : 'v1';
}
```

---

## 15. Risks to Existing App Behavior from RE v2 Changes

| Risk | Severity | Mitigation |
|------|---------|-----------|
| `generate-daily-plan` contract change breaks Home screen | HIGH | Keep existing function unchanged; new function is additive |
| New `re_meal_classes` + `re_class_dish_options` tables slow down plan generation | MEDIUM | Index on `meal_class_code`; pre-filter pool before scoring |
| RE v2 class-first approach returns no results if dish pool doesn't have class-tagged dishes | HIGH | Maintain RE v1 as fallback; validate dish pool has class coverage before BUILD-04 |
| Additive migrations fail on production due to lock contention on large tables | LOW | Run migrations during low-traffic window; use `IF NOT EXISTS` |
| Test persona runner breaks if new tables don't have seed data | MEDIUM | Seed `re_meal_classes` and `re_class_dish_options` before running persona tests |
| `foofoo-tests/lib/re-engine.ts` diverges from new RE scoring logic | MEDIUM | RE module CLAUDE.md: mirror must be updated in sync with any scoring change |
| Existing `re_version` stamp in `planner` table ('v1'/'v2') conflicts with new version naming | LOW | New RE versions use distinct stamps (e.g. 're_v2_class_first') — no conflict |
| `user_category_preferences` bucket model incompatible with class-first approach | HIGH (design) | Class-first approach still uses cuisine/dish buckets — they remain inputs to class selection; no change to existing table needed |

---

## 16. Open Questions for Founder (APVerse) Confirmation Before BUILD-01

These must be answered before writing any implementation code.

| # | Question | Why it matters |
|---|----------|---------------|
| Q1 | **Routing strategy:** Should the new class-first RE be a new Edge Function (`generate-meal-plan`) that replaces `generate-daily-plan` in the app, OR should it be a shared module imported by the existing 3 functions? | Determines how the app changes (or doesn't) |
| Q2 | **Gradual rollout scope:** Should RE v2 class-first activate for ALL users simultaneously (once deployed), or only for users explicitly assigned via `re_user_engine_assignments`? | Determines whether we need experiment infrastructure before BUILD-01 |
| Q3 | **Existing `re_version='v1'/'v2'` stamp in planner table:** Should this be migrated/extended, or should new RE versions use a new column/table? | Avoids confusion between current v1/v2 and new versioned system |
| Q4 | **Meal class taxonomy source:** The source workbook `Indian_Meal_Cohort_Persona_DB_v3.xlsx` is in the docs folder. Has anyone read the actual meal class IDs and names from it? Are they the canonical IDs to use, or is there a newer version? | CLASS IDs must come from the workbook — cannot proceed to BUILD-01 without confirming the workbook is the active source |
| Q5 | **Cohort/persona assignment in onboarding:** Should cohort assignment happen silently post-onboarding (background job from existing profile answers), or should there be new onboarding questions? | Affects whether BUILD-02 requires UI changes |
| Q6 | **`household_members` table:** The RE v2 spec requires per-member add-on components (infant, elderly, diabetic, etc.). Currently there is only `household_type` (a single field). Should BUILD-02 add a `household_members` table with per-member dietary profiles? | This is a significant schema addition — must be confirmed before BUILD-01 |
| Q7 | **`generate-daily-plans-batch` (5AM CRON):** Should batch generation continue to use RE v1 fallback while RE v2 is being built, or should it also route through the new resolver? | Affects whether existing CRON needs updating |
| Q8 | **Existing 50-persona test framework:** Should BUILD-01 add new persona definitions for the class-first RE, or reuse the existing 50? | Affects `foofoo-tests` scope |
| Q9 | **`home_state` format:** Currently stored as free text state name (e.g. "Maharashtra"). The `region_food_affinity` table uses 2-letter state codes (e.g. "MH"). Are they already reconciled in production, or is this a known data quality issue? | Affects how home_state is used in cohort assignment |
| Q10 | **Sprint priority:** Is BUILD-01 (RE data model + seed import) the immediate next step, or should BUILD-00B findings be reviewed first and BUILD-01 planned in a dedicated session? | Process question — avoids rushing into schema changes |

---

## 17. Exact BUILD-01 Implementation Plan Outline (High Level)

> **Note:** This is a high-level outline only. Detailed plan + schema comes in next session after Q1–Q10 above are answered.

### BUILD-01: RE Data Model & Seed Import

**Purpose:** Create the new `re_*` tables in Supabase and import seed data from `Indian_Meal_Cohort_Persona_DB_v3.xlsx`.

**Prerequisite:** Q1, Q4, Q6, Q9 above must be answered.

**Step 1 — Read source workbook**
- Parse `Indian_Meal_Cohort_Persona_DB_v3.xlsx` to extract:
  - Meal class codes and names
  - Class-to-dish option mappings
  - Cohort hierarchy (36 states, 41 personas)
  - Weekly class plans per cohort

**Step 2 — Write migration `Up` scripts (additive only)**
- `re_engine_versions` — version registry
- `re_user_engine_assignments` — user → version assignment
- `re_meal_classes` — meal class taxonomy (BF_LIGHT_GRAIN, etc.)
- `re_class_dish_options` — class → dish mappings (references existing `dishes.id`)
- `re_cohort_definitions` — main cohorts (MC_FAMILY, MC_SOLO, etc.)
- `re_persona_definitions` — 41 backend personas
- `re_user_persona_assignments` — user → persona (overlapping, array)
- `re_household_members` (if Q6 confirmed) — per-member dietary profiles
- `re_addon_class_options` — add-on component definitions

**Step 3 — Write migration `Down` scripts** for each Up script

**Step 4 — Register all migrations in root `SYSTEM_STATE.md`**

**Step 5 — Write seed import scripts** (TypeScript / SQL) to populate:
- `re_meal_classes` from workbook
- `re_class_dish_options` (mapping workbook dish names → existing `dishes.id`)
- `re_cohort_definitions` and `re_persona_definitions`

**Step 6 — Write tests** for:
- Schema validation (new tables exist with correct columns)
- Seed data integrity (no orphaned class-dish mappings)
- No existing tables broken

**Step 7 — Apply to Supabase staging** (not production until confirmed)

---
