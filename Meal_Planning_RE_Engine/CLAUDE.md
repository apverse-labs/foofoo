# CLAUDE.md — Meal Planning RE Engine Module

## Module purpose

This folder contains the versioned Meal Planning Recommendation Engine for the existing Foofoo app.

This is not a standalone app. It is a modular RE engine that must integrate with the existing Foofoo codebase through stable interfaces, APIs, seed data, and experiment assignment logic.

## Canonical documentation

The canonical implementation contract is inside:

Meal_Planning_RE_Engine/Meal_Planning_RE_Technical_Docs_v1/

Start with:

- Meal_Planning_RE_Technical_Docs_v1/README_IMPLEMENTATION_WALKTHROUGH_FOR_CLAUDE_v1.0.md
- Meal_Planning_RE_Technical_Docs_v1/00_Master_Index/DOC-00_Master_Document_Map_and_Implementation_Order_v1.0.md
- Meal_Planning_RE_Technical_Docs_v1/07_Technical_Build/DOC-24_AI_Coding_Agent_Implementation_Prompt_Pack_v1.0.md
- Meal_Planning_RE_Technical_Docs_v1/07_Technical_Build/DOC-23_API_Contract_Specification_v1.0.docx
- Meal_Planning_RE_Technical_Docs_v1/09_Source_Data/Indian_Meal_Cohort_Persona_DB_v3.xlsx

## Core RE architecture

The system must follow this chain:

few onboarding answers
-> household profile
-> cohort/persona and overlays
-> 7-day class-first meal plan
-> member-specific add-ons
-> class-to-dish expansion
-> Food DNA ranking
-> feedback learning loop

## Non-negotiable rules

1. Do not recommend dishes directly from cuisine.
2. Always generate meal classes first.
3. Expand dishes only from the selected meal_class_code.
4. Do not mix dishes across meal classes.
5. Keep primary household meals separate from add-on components.
6. Infant, toddler, child, elderly, diabetic, pregnancy, postpartum, recovery, and fitness needs usually create add-ons; they should not replace the main family meal unless explicitly marked primary-eligible.
7. Home state and current city are separate inputs.
8. Home state controls native food affinity.
9. Current city controls lifestyle overlay.
10. Cohort/persona assignment must support overlapping personas.
11. Do not invent canonical IDs if they exist in the docs or source workbook.
12. Do not overwrite the canonical source workbook.
13. Any transformed seed data must be generated into implementation seed folders, not back into the docs folder.
14. The RE module must be versioned so different users can be assigned to different RE engines.
15. Do not break existing Foofoo app behavior while implementing this module.

## Versioned RE requirement

Build the RE engine as a versioned system.

Minimum target shape:

- RE_V1: cold-start class-first rule-based planning
- RE_V2: personal history and feedback adaptation
- RE_V3: cluster-seeded recommendations
- RE_V4: full personalization and collaborative filtering

Each version should implement the same public interface.

The main app should call a stable RE service, not a specific RE version directly.

## Existing project integration rule

Before coding, inspect the existing Foofoo project and identify:

- current frontend flow,
- existing onboarding,
- current user profile model,
- existing recipe/dish data,
- current meal planning logic,
- database / Supabase / API structure,
- feature flag or experiment mechanism,
- test setup,
- deployment flow.

Do not assume a greenfield architecture.

## Build sequence

Follow this sequence:

- BUILD-00A: Module guardrails and tracker
- BUILD-00B: Existing project integration audit
- BUILD-01: RE data model and seed import
- BUILD-02: Onboarding profile builder
- BUILD-03: Cohort/persona assignment engine
- BUILD-04: Weekly class-first plan engine
- BUILD-05: Member-specific add-on engine
- BUILD-06: Dish expansion and Food DNA ranking
- BUILD-07: Feedback learning loop
- BUILD-08: API/app integration
- BUILD-09: Admin/data operations
- BUILD-10: Analytics, QA, experimentation, governance

Do not skip directly to dish recommendation.

## Safety rule for existing project

All migrations must be additive unless explicitly approved.

Do not rename, delete, or alter existing production tables, routes, or user flows without a written migration plan.

Prefer adapters over rewriting existing modules.

## Expected output format for every build

For each build, produce:

1. files changed,
2. purpose,
3. implementation summary,
4. tests added,
5. commands run,
6. assumptions,
7. open questions,
8. next build recommendation.
