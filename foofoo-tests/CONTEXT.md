# FooFoo Test Project — Context File
# Claude Code must read this entire file before writing any test

## What is FooFoo
An AI-powered Indian meal decision app. React Native + Expo + Supabase + PostgreSQL.
iOS-first, tested on Windows via Expo web and EAS cloud builds.
Non-technical founders building with AI assistance.

## App project location
../foofoo-app/   (sibling folder in this workspace)

## Critical documents to read before writing tests
All documents are in ../foofoo-app/docs/ — read them in this order:
1. Doc 11A — Final Merged DB Schema (41 MVP tables, exact column names, types, FKs)
2. Doc 10  — RE Specification (scoring pipeline, hard constraints, soft weights)
3. Doc 12  — Sprint Plan (what was built in each sprint, definition of done)
4. Doc 09  — Design System + Wireframes (gesture behaviour, screen states)
5. Doc 06  — PRD v4 (feature list, onboarding flow, success metrics)
6. Doc 08  — Information Architecture (all 30 MVP screens, user flows)

## Dev environment
- Supabase dev project: Mumbai region
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
