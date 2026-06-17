# DOC-24 AI Coding Agent Implementation Prompt Pack v1.0

## Purpose

This document is the direct instruction pack for Claude or another AI coding agent. It converts the 28 canonical documents into build-ready coding guidance.

## System role for coding agent

You are implementing an Indian household meal planning recommendation engine. Your output must follow the canonical logic in this documentation package. Do not invent alternative architecture. Do not generate dishes directly from cuisine. Always generate weekly meal classes first, then expand dishes from class-specific pools, then attach member-specific add-ons, then score and rank.

## Canonical source data

Use `09_Source_Data/Indian_Meal_Cohort_Persona_DB_v3.xlsx` as the seed data source. Relevant sheets include:

README, Main_Cohort_Hierarchy, Subcohort_Routing, Persona_Master_v3, Routing_Rules_v3, State_Profile_v3, City_Migration_Overlay_v3, Meal_Class_Master_v3, Meal_Class_Overlap_Resolution, Class_Dish_Options_v3, Addon_Component_Class_Master, Addon_Dish_Options, Cohort_Matrix_v3, Weekly_Class_Plan_v3, Weekly_Plan_Normalization_Note, Weekly_Plan_Join_Rules, Household_Addon_Component_Plan, NonVeg_Logic_v3, DB_Implementation_v3, Sources_v3, QA_Checks_v3, Data_Dictionary_v3

## Build order

| Build ID | What to build | Required docs |
|---|---|---|
| BUILD-00 | Documentation and Source Data Contract | Create canonical docs, read order, source workbook contract, and non-negotiable architecture rules. | DOC-00, DOC-01, DOC-02, DOC-24 |
| BUILD-01 | Data Model and Seed Import | Create DB schema, load source tables, enforce IDs, constraints, and versioned seed data. | DOC-05, DOC-07, DOC-08, DOC-22 |
| BUILD-02 | Onboarding and Household Profile Builder | Build dynamic onboarding, household/member capture, diet and city inputs, and profile object. | DOC-03, DOC-04, DOC-10, DOC-11, DOC-16, DOC-17, DOC-18, DOC-20 |
| BUILD-03 | Cohort Persona Assignment | Map profile answers to main cohort, sub-cohort, backend persona, state/city overlay, non-veg mode, and confidence. | DOC-03, DOC-09, DOC-11, DOC-15, DOC-20 |
| BUILD-04 | Weekly Class-First Plan Engine | Generate 7-day meal-class plan from cohort matrix, regional rules, city overlay, weekday/weekend rhythm, variety rules. | DOC-12, DOC-13, DOC-14 |
| BUILD-05 | Member-Specific Add-on Component Engine | Attach infant/toddler/child/elderly/pregnancy/postpartum/diabetic/fitness add-ons without replacing family primary meal. | DOC-04, DOC-06, DOC-17 |
| BUILD-06 | Dish Expansion and Food DNA Ranking | Expand selected meal classes into dish candidate pools and rank dishes using Food DNA + constraints + context. | DOC-07, DOC-08, DOC-18, DOC-19 |
| BUILD-07 | Feedback Personalization Loop | Use swipes, locks, Not Today, Never, search, and accepted repeats to adjust preferences and class weights. | DOC-19, DOC-21 |
| BUILD-08 | API and App Integration | Expose onboarding/profile/plan/generation/feedback endpoints with stable JSON contracts. | DOC-23, DOC-25 |
| BUILD-09 | Admin CMS and Data Operations | Build admin workflows to maintain classes, dishes, add-ons, Food DNA tags, data QA, and releases. | DOC-27, DOC-28 |
| BUILD-10 | Analytics, Experimentation, QA, Governance | Track funnel, plan quality, acceptance, add-on relevance, class accuracy, taxonomy changes, and A/B tests. | DOC-25, DOC-26, DOC-28 |

## Non-negotiable code architecture

1. `OnboardingService` captures a small number of user-facing inputs.
2. `HouseholdProfileService` converts onboarding answers into a structured household profile.
3. `PersonaAssignmentService` maps profile features to backend persona IDs and overlays.
4. `WeeklyClassPlanService` generates a class-first 7-day plan.
5. `AddonComponentService` attaches member-specific add-ons.
6. `DishExpansionService` expands meal classes into dish candidate pools by class code.
7. `RecommendationScoringService` ranks dish candidates using constraints, regional weights, Food DNA, and feedback.
8. `FeedbackLearningService` updates user preference vectors from revealed behavior.
9. `ValidationService` checks constraints, class/dish joins, add-on separation, and output shape.

## Core data-flow pseudocode

```python
def generate_week_plan(onboarding_answers, user_context):
    profile = HouseholdProfileService.build_profile(onboarding_answers, user_context)
    constraints = ConstraintService.resolve(profile)
    persona_result = PersonaAssignmentService.assign(profile, constraints)
    class_plan = WeeklyClassPlanService.generate(persona_result, profile, constraints)
    class_plan = VarietyService.validate_and_rebalance(class_plan, profile)
    addon_plan = AddonComponentService.generate(class_plan, profile, constraints)
    dish_candidates = DishExpansionService.expand(class_plan, constraints)
    ranked = RecommendationScoringService.rank(dish_candidates, profile, class_plan, addon_plan)
    return PlanAssembler.build_response(profile, class_plan, addon_plan, ranked)
```

## Data integrity rules

- Never join dish options to a weekly plan by text labels. Join only by `meal_class_code`.
- Never attach add-on dishes to primary meal slots as a replacement.
- Never use a meal class as primary when `allowed_as_weekly_primary_v3` or equivalent governance marks it add-on-only.
- Never infer non-veg consumption unless user diet mode allows it.
- Never use source workbook v1 or v2 for implementation when v3 is present.
- All enum values must come from DOC-02, DOC-05, DOC-08, DOC-11, DOC-18, or DOC-22.

## Required modules

| Module | Inputs | Outputs | Docs |
|---|---|---|---|
| OnboardingService | screen answers | raw answer object | DOC-10 |
| HouseholdProfileService | answers, city, home state | normalized profile | DOC-04, DOC-11 |
| PersonaAssignmentService | profile | persona IDs, confidence | DOC-03 |
| RegionalOverlayService | home_state, current_city | class affinity modifiers | DOC-09 |
| NonVegService | diet mode, state, persona | non-veg cadence | DOC-15 |
| WeeklyClassPlanService | cohort_id, persona, overlays | 7-day class plan | DOC-12, DOC-13 |
| AddonComponentService | household members, class plan | add-on plan | DOC-04, DOC-06, DOC-17 |
| DishExpansionService | class plan | dish candidate list | DOC-07 |
| FoodDNAService | dish candidates | Food DNA vector | DOC-08 |
| ScoringService | candidates, profile, history | ranked cards | DOC-19 |
| FeedbackLearningService | user events | updated preference vector | DOC-21 |
| APIService | app calls | JSON responses | DOC-23 |
| QAService | synthetic profiles | pass/fail report | DOC-25 |

## Initial test case Claude must implement

Input: MP-origin vegetarian family living in Mumbai, couple with infant, diabetic elder, assisted cook.

Expected behavior:

- Home state signal remains MP-style home meals.
- Current city signal adds Mumbai/Tier 1 speed, health, and lifestyle overlays.
- Weekly primary classes are family-level classes.
- Infant receives soft-food add-ons.
- Diabetic elder receives low-GI/light add-ons.
- No non-veg dishes appear unless diet mode explicitly allows them.
- Dishes are expanded only from the selected class pools.

## Stop conditions

A build is not complete until:

- Seed data loads successfully.
- IDs are stable and unique.
- Unit tests cover normal and edge cases.
- DOC-25 QA cases pass.
- Output is deterministic with a fixed random seed.
- No class/dish mismatch occurs.

## Claude output style

When writing code, include clear comments that reference the relevant DOC ID and build ID. Example: `# DOC-13 / BUILD-04: apply weekday-weekend class cadence`.
