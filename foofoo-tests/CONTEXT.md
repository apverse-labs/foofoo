# FooFoo Test Project — Context File
# Claude Code must read this entire file before writing any test

## What is FooFoo
An AI-powered Indian meal decision app. React Native + Expo + Supabase + PostgreSQL.
iOS-first, tested on Windows via Expo web and EAS cloud builds.
Non-technical founders building with AI assistance.

## App project location
../foofoo/   (within the same repo: apverse-labs/foofoo/foofoo/)

## Critical documents to read before writing tests
All documents are in ../foofoo/ProductDocs/ — read them in this order:
1. Doc 11A — `11A Final_Merged_Database_Schema_v4.MD`        (41 MVP tables, exact column names, types, FKs)
2. Doc 10  — `10 Recommendation_Engine_Specification_v3.MD`  (scoring pipeline, hard constraints, soft weights)
3. Doc 12  — `12 MVP_Sprint_Plan+Phase1_v3.MD`               (what was built in each sprint, definition of done)
4. Doc 12A — `12A Sprint_Plan_Appendix_Updates_and_Phase1_v3.MD` (appendix + Phase 1 updates)
5. Doc 09  — `09 UI_UX_Design_System_and_Wireframes_v2.MD`   (gesture behaviour, screen states)
6. Doc 06  — `06 PRD_and_User_Personas_v4.MD`                (feature list, onboarding flow, success metrics)
7. Doc 08  — `08 Information_Architecture_and_Sitemap_v2.MD` (all 30 MVP screens, user flows)
8. Doc 11  — `11 Technical_Architecture_and_Database_Design_v3.MD` (overall technical architecture)

## Dev environment
- Supabase dev project: Mumbai region — https://ufgfznpqixplcbhmsqqw.supabase.co
- Dev DB has 500 dishes, all Tier 1+2 tagged, all ingredients with flags
- Auto-derivation has been run: all dishes have allergens[], diet_type, is_jain, ingredient_ids[]
- RE v1 + v2 are live (Edge Functions deployed)
- Test user email pattern: test-persona-{N:001-050}@foofoo.dev
- Test user password: FooFooTest@{N} (e.g. FooFooTest@001)

## Hard rules for ALL tests
1. NEVER modify the foofoo/ folder. Read-only.
2. NEVER use production Supabase. Dev only.
3. Every test must clean up after itself (delete test data on teardown)
4. Hard constraint violations (allergen, diet_type, Jain) = CRITICAL FAIL, stop suite
5. All persona tests must validate cultural appropriateness, not just data correctness

## What "passing" means for FooFoo
- Hard constraints: 0 violations across all 50 personas across 7 simulated days
- RE quality: top 3 suggestions match persona's Frequently bucket cuisine ≥60% of the time
- Variety: no dish repeats within persona's repeat_tolerance window
- Performance: plan generation <3s on every persona
- DPDP: deleted user leaves 0 rows in all non-audit tables

## Persona file location
./personas/persona-definitions.ts — 50 personas, fully defined, do not modify

## Report output
./reports/html/   — visual HTML dashboard
./reports/md/     — one markdown file per persona + master summary

## RE Module (BUILD-01 through BUILD-10)
- RE staging: kwypxyqxojauhiehuirz
- RE docs: ../Meal_Planning_RE_Engine/Meal_Planning_RE_Technical_Docs_v1/
- RE types: ../foofoo/src/types/index.ts (REFeedbackSignal, REDishCandidate etc)
- RE repos: ../foofoo/src/repositories/re-*.repository.ts
- SCHEMA-RE-001–005 all live on staging
- RE user table: re_user_household_profiles, re_user_weekly_plans, re_user_feedback, etc.
- Test user pattern: re-qa-P001@foofoo-test.dev

### RE QA suite layout (added this sprint)
- lib/supabase-re.ts        — RE staging clients (anon + optional service role)
- config/targets.ts         — QA_TARGET selection (re-staging | mvp-prod)
- config/success-gates.ts   — PASS/FAIL thresholds (GATES)
- integration/re-schema-validation.test.ts   — all RE tables + key columns + RLS
- integration/re-seed-integrity.test.ts       — seed counts + FK integrity (needs service key)
- integration/re-module-integration.test.ts   — 5 RE repos against staging (read-only)
- integration/re-persona-journey.test.ts       — 50 personas, light mode
- integration/re-rls-security.test.ts          — cross-user isolation (needs service key)
- integration/re-dpdp-compliance.test.ts        — deletion cascade (needs service key)
- personas/re-persona-definitions.ts            — 50 RE personas (RP001..RP050)
- personas/re-persona-runner.ts                  — light + full journey runner
- reports/re-report-generator.ts                  — md + html dashboards

### Important RE staging facts (verified via MCP, 2026-06-14)
- Reference/seed tables (re_states, re_meal_classes, re_class_dish_options,
  re_weekly_class_plans, re_cohorts, re_personas, re_household_addon_plans, …)
  have RLS ENABLED but NO policies → the ANON client reads 0 rows from them.
  Schema-existence probes still work (SELECT ... LIMIT 0 returns no error).
  Real seed COUNTS require the service-role key (SUPABASE_RE_SERVICE_KEY).
- User tables (re_user_*) have one `auth.uid() = profile_id` policy each.
- Verified seed counts: re_states=36, re_meal_classes=131, re_class_dish_options=946,
  re_cohorts=2952, re_personas=41, re_weekly_class_plans=20664,
  re_household_addon_plans=7992. FK integrity: 0 orphans.
- re_weekly_class_plans columns are *_primary_class / *_secondary_class
  (NOT breakfast_class). PK = plan_day_id. Has cohort_id + persona_id.
