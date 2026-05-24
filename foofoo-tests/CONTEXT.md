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
1. NEVER modify the foofoo-app/ folder. Read-only.
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
