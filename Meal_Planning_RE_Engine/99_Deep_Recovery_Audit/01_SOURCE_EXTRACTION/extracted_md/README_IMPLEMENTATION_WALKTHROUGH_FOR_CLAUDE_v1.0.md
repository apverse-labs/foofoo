# DOC-00 Master Document Map and Implementation Order v1.0

## Purpose

This is the master walkthrough for Claude or any AI coding agent. It defines the canonical documentation structure, the implementation build series, the read order, the source-data contract, and the rules that must not be broken while building the meal planning recommendation engine.

This package intentionally uses separate canonical documents rather than a merged starter pack. ZIP files are containers only. DOC-01 to DOC-28 are the source-of-truth documents.

## One-line product logic

Few onboarding answers -> household profile -> cohort/persona and overlays -> 7-day class-first meal plan -> member-specific add-ons -> class-to-dish expansion -> Food DNA ranking -> feedback learning loop.

## Canonical source data

The canonical seed workbook is:

`09_Source_Data/Indian_Meal_Cohort_Persona_DB_v3.xlsx`

The workbook contains 36 states/UTs, 41 personas, meal classes, dish options, weekly class plans, add-on component plans, city migration overlays, non-veg logic, DB implementation notes, source references, and QA checks. All implementation must start from this workbook unless a later approved source-data version is released through DOC-28.

## Non-negotiable implementation invariants

1. Generate meal classes first. Do not directly recommend dishes from cuisine or persona.
2. Expand to dishes only by joining on `meal_class_code` or `addon_class_code`.
3. Do not mix dishes from one class into another class. This prevents the earlier mismatch issue where `BF_STUFFED_FLATBREAD` carried dishes from `BF_FRIED_FESTIVE`.
4. Primary household meals and member-specific add-ons are different objects.
5. Baby, toddler, child, elderly, pregnancy, postpartum, diabetic, recovery, and fitness needs usually create add-ons, not replacement family meals.
6. Home state and current city are separate fields. An MP-origin family in Mumbai should not be treated like a generic Mumbai family or a generic MP family.
7. Use dynamic onboarding. Do not show 41 backend personas to users.
8. Apply hard constraints before planning and scoring: diet, allergy, Jain, fasting, member safety, and Never list.
9. Use weekday/weekend logic. Weekday meals are generally quick, repeatable, and cook-capability-aware. Weekend meals allow more indulgence, regional specials, and non-veg/festive meals where appropriate.
10. Treat onboarding as prior belief. Revealed behavior must gradually override aspirational responses.

## Build series

| Build ID | Build name | Purpose | Primary documents |
|---|---|---|---|
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

## Canonical 28-document map

| Doc ID | Title | Folder | File type | Build IDs |
|---|---|---|---|---|
| DOC-00 | Master Document Map and Implementation Order | 00_Master_Index | md | BUILD-00 |
| DOC-01 | Master Product RE Blueprint | 01_Product_Foundation | docx | BUILD-00, BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06 |
| DOC-02 | Domain Glossary Canonical Definitions | 01_Product_Foundation | xlsx | BUILD-00, BUILD-01 |
| DOC-03 | Cohort Hierarchy Persona Mapping | 02_Cohorts_Personas | docx | BUILD-02, BUILD-03 |
| DOC-04 | Household Composition Member Needs | 02_Cohorts_Personas | docx | BUILD-02, BUILD-05 |
| DOC-05 | Meal Class Taxonomy | 03_Meal_Taxonomy | xlsx | BUILD-01, BUILD-04, BUILD-06 |
| DOC-06 | Primary vs Addon Meal Architecture | 03_Meal_Taxonomy | docx | BUILD-04, BUILD-05 |
| DOC-07 | Dish Catalog Class to Dish Mapping | 03_Meal_Taxonomy | xlsx | BUILD-01, BUILD-06 |
| DOC-08 | Food DNA Tagging Specification | 03_Meal_Taxonomy | xlsx | BUILD-06, BUILD-07 |
| DOC-09 | State Region City Migration Overlay | 04_Regional_Intelligence | docx | BUILD-03, BUILD-04 |
| DOC-10 | Onboarding Journey Dynamic Flow | 05_Onboarding | docx | BUILD-02 |
| DOC-11 | Onboarding Answer to Feature Mapping | 05_Onboarding | xlsx | BUILD-02, BUILD-03 |
| DOC-12 | Cohort to Weekly Meal Class Matrix | 06_Planning_Engine | xlsx | BUILD-04 |
| DOC-13 | Weekly Meal Plan Generation Algorithm | 06_Planning_Engine | docx | BUILD-04, BUILD-05, BUILD-06 |
| DOC-14 | Class Rotation Variety Balance Rules | 06_Planning_Engine | docx | BUILD-04 |
| DOC-15 | Non Veg Consumption Patterns | 04_Regional_Intelligence | docx | BUILD-03, BUILD-04, BUILD-06 |
| DOC-16 | Cook Dependency Kitchen Capability | 02_Cohorts_Personas | docx | BUILD-02, BUILD-04 |
| DOC-17 | Health Fitness Lifestyle Overlays | 02_Cohorts_Personas | docx | BUILD-02, BUILD-05, BUILD-07 |
| DOC-18 | Diet Religion Allergy Fasting Constraints | 04_Regional_Intelligence | docx | BUILD-02, BUILD-04, BUILD-06 |
| DOC-19 | RE Scoring Rules | 06_Planning_Engine | docx | BUILD-06, BUILD-07 |
| DOC-20 | Cold Start Safe Assumptions | 05_Onboarding | docx | BUILD-02, BUILD-03, BUILD-04 |
| DOC-21 | Feedback Learning Loop | 06_Planning_Engine | docx | BUILD-07 |
| DOC-22 | Database Schema Seed Data Spec | 07_Technical_Build | xlsx | BUILD-01 |
| DOC-23 | API Contract Specification | 07_Technical_Build | docx | BUILD-08 |
| DOC-24 | AI Coding Agent Implementation Prompt Pack | 07_Technical_Build | md | BUILD-00 through BUILD-10 |
| DOC-25 | QA Test Cases Validation Spec | 07_Technical_Build | xlsx | BUILD-08, BUILD-10 |
| DOC-26 | Analytics Experimentation Spec | 08_Operations | docx | BUILD-10 |
| DOC-27 | Admin CMS Data Operations Spec | 08_Operations | docx | BUILD-09 |
| DOC-28 | Versioning Governance Changelog | 08_Operations | docx | BUILD-10 |

## Recommended read order for Claude

### Pass 1: Understand the system
Read DOC-00, DOC-01, DOC-02.

### Pass 2: Understand users and household logic
Read DOC-03, DOC-04, DOC-16, DOC-17, DOC-18.

### Pass 3: Understand meal taxonomy and source data
Read DOC-05, DOC-06, DOC-07, DOC-08, DOC-09, DOC-15.

### Pass 4: Understand onboarding-to-profile conversion
Read DOC-10, DOC-11, DOC-20.

### Pass 5: Implement planning and recommendation engine
Read DOC-12, DOC-13, DOC-14, DOC-19, DOC-21.

### Pass 6: Implement backend/API/testing
Read DOC-22, DOC-23, DOC-24, DOC-25.

### Pass 7: Prepare launch operations
Read DOC-26, DOC-27, DOC-28.

## Implementation phasing

### MVP-1: Class-first cold start planner
Includes BUILD-00 through BUILD-04. Output: onboarding -> household profile -> cohort assignment -> 7-day primary class plan.

### MVP-2: Add-ons and dish expansion
Includes BUILD-05 and BUILD-06. Output: member-specific add-ons and dish candidates under each class.

### MVP-3: Personalization
Includes BUILD-07. Output: feedback learning, class affinity updates, dish-level ranking updates, repeat tolerance.

### MVP-4: API and app integration
Includes BUILD-08. Output: production-grade endpoints and app integration contracts.

### Ops-1: Data operations and analytics
Includes BUILD-09 and BUILD-10. Output: admin CMS workflows, QA dashboards, experimentation, governance.

## Expected output object hierarchy

```json
{
  "household_profile": {
    "home_state": "Madhya Pradesh",
    "current_city": "Mumbai",
    "main_cohort_id": "MC_FAMILY",
    "sub_cohort_id": "SC_COUPLE_WITH_INFANT",
    "backend_persona_ids": ["P_COUPLE_WITH_INFANT"],
    "overlay_persona_ids": ["O_DIABETIC_ELDER"],
    "diet_mode": "veg_with_egg_optional",
    "cook_capability": "assisted_cook_needs_instruction"
  },
  "weekly_class_plan": [
    {
      "day": "Monday",
      "meal_slot": "breakfast",
      "primary_class_code": "BF_LIGHT_GRAIN",
      "secondary_class_code": "BF_POHA_UPMA",
      "addon_components": ["ADDON_INFANT_SOFT_FOOD"],
      "dish_candidates": ["poha", "upma", "dalia"]
    }
  ]
}
```

## Claude implementation instruction

When coding, Claude should implement in build order. Each build must have unit tests before moving to the next build. Do not optimize prematurely into collaborative filtering or generative dish selection. The first working system must be deterministic and explainable.

## Acceptance criteria for this documentation package

- All 28 canonical documents exist in the requested folder tree.
- All spreadsheet specifications include README sheets and source-data mapping.
- All Word documents include implementation rules, examples, and acceptance criteria.
- DOC-24 contains direct AI coding-agent instructions.
- The v3 source workbook is included unchanged in `09_Source_Data`.
- A coding agent can build onboarding, household profile, cohort assignment, weekly class planning, add-ons, dish expansion, scoring, feedback, APIs, QA, analytics, and admin operations using this package.


## Note

This root README mirrors DOC-00 for convenience. The canonical document is in `00_Master_Index/`.
