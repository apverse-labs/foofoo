# CANONICAL_REQUIREMENTS_LEDGER

**Total requirements extracted: 482** across 19 DOCX documents.

Mechanically derived from extracted DOCX paragraphs (not MD). Each substantive rule paragraph = one REQ.
Source ref = DOC + paragraph index in `extracted_docx/<doc>.json`. Build mapping from each doc's metadata table.

## DOC-01 — DOC-01_Master_Product_RE_Blueprint_v1.0
_Builds: BUILD-00, BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06, BUILD-07, BUILD-08, BUILD-09, BUILD-10 · Purpose: Defines the full product and recommendation-engine blueprint: how onboarding, household profile, cohort assignment, weekly class-first planning, add-ons, dish e_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-01-001 | preamble | MUST | Master Product + Recommendation System Blueprint |
| REQ-DOC-01-002 | preamble | MUST | DOC-01 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-01-003 | 1. Purpose and Scope | MUST | Defines the full product and recommendation-engine blueprint: how onboarding, household profile, cohort assignment, weekly class-first planning, add-ons, dish expansion, Food DNA scoring, feedback, APIs, analytics, and admin operations fit together. |
| REQ-DOC-01-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-01-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-01-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-01-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-01-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-01-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-01-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-01-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-01-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-01-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-01-014 | 4. Product Problem and Design Principle | MUST | Users often self-report aspirational dishes, while real behavior lives at meal-class level. Therefore the engine must understand classes such as simple green vegetable sabzi, dal-rice comfort, stuffed flatbread breakfast, light grain breakfast, fish curry rice, and weekend festive breakfast. The pro |
| REQ-DOC-01-015 | 5. End-to-End Architecture | MUST | Capture minimal onboarding answers through dynamic cohort routing. |
| REQ-DOC-01-016 | 5. End-to-End Architecture | MUST | Normalize answers into household profile fields. |
| REQ-DOC-01-017 | 5. End-to-End Architecture | MUST | Assign main cohort, sub-cohort, backend persona, overlays, diet mode, cook mode, and confidence. |
| REQ-DOC-01-018 | 5. End-to-End Architecture | MUST | Generate class-first weekly plan using cohort matrix and state/city overlays. |
| REQ-DOC-01-019 | 5. End-to-End Architecture | MUST | Attach member-specific add-ons for infant, toddler, child, elderly, pregnancy, postpartum, diabetic, recovery, and fitness needs. |
| REQ-DOC-01-020 | 5. End-to-End Architecture | MUST | Expand classes into dish candidates from class-specific pools. |
| REQ-DOC-01-021 | 5. End-to-End Architecture | MUST | Rank dish candidates using Food DNA, constraints, day context, city/state signals, and feedback history. |
| REQ-DOC-01-022 | 5. End-to-End Architecture | MUST | Learn from revealed behavior and update preference vectors. |
| REQ-DOC-01-023 | 8. System Boundaries | MUST | This blueprint covers planning and recommendation. It does not require nutrition-grade medical advice, automatic grocery fulfillment, or fully generative recipes in MVP. Health/lifecycle overlays are planning aids and constraints, not medical diagnosis. |
| REQ-DOC-01-024 | 8. System Boundaries | MUST | Class-first planning is mandatory for MVP. |
| REQ-DOC-01-025 | 8. System Boundaries | MUST | Dish-level scoring can be simple initially but must use the same data model. |
| REQ-DOC-01-026 | 8. System Boundaries | COULD | The source workbook v3 is enough for seed data; later admin operations can update it through governed releases. |
| REQ-DOC-01-027 | 9. Worked Examples | MUST | MP family in Mumbai |
| REQ-DOC-01-028 | 9. Worked Examples | SHOULD | A user says they are planning for a family, originally from Madhya Pradesh, living in Mumbai, vegetarian, with an infant and diabetic elder. The system should not ask them to choose from 41 personas. It infers family + infant + diabetic overlay, uses MP home-style meals, adds Mumbai Tier 1 lifestyle |
| REQ-DOC-01-029 | 11. Acceptance Criteria | COULD | A developer can explain the complete chain from onboarding answer to ranked dish card. |
| REQ-DOC-01-030 | 11. Acceptance Criteria | COULD | The implementation can be split into build modules without ambiguity. |
| REQ-DOC-01-031 | 11. Acceptance Criteria | COULD | All future docs can reference this blueprint as the product source of truth. |

## DOC-03 — DOC-03_Cohort_Hierarchy_Persona_Mapping_v1.0
_Builds: BUILD-02, BUILD-03 · Purpose: Defines how user-facing main cohorts and sub-cohorts map to detailed backend personas and overlays. The purpose is to keep onboarding simple while retaining a r_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-03-001 | preamble | MUST | Cohort Hierarchy + Persona Mapping Specification |
| REQ-DOC-03-002 | preamble | MUST | DOC-03 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-03-003 | 1. Purpose and Scope | MUST | Defines how user-facing main cohorts and sub-cohorts map to detailed backend personas and overlays. The purpose is to keep onboarding simple while retaining a rich machine-facing persona system. |
| REQ-DOC-03-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-03-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-03-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-03-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-03-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-03-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-03-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-03-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-03-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-03-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-03-014 | 4. User-facing Cohort Design | SHOULD | Onboarding should show only a small set of main cohorts, not the full backend persona list. The v3 workbook defines 5 main cohorts and 41 backend personas/subcohorts. The user should feel the app asks natural questions, not a taxonomy quiz. |
| REQ-DOC-03-015 | 5. Backend Persona Mapping Rules | MUST | Map main cohort selection to a limited sub-cohort screen. |
| REQ-DOC-03-016 | 5. Backend Persona Mapping Rules | MUST | Map sub-cohort to a base backend persona. |
| REQ-DOC-03-017 | 5. Backend Persona Mapping Rules | MUST | Then ask targeted follow-ups for overlays: baby/toddler, school child, elderly, diabetes, pregnancy, postpartum, fitness, cook dependency, non-veg cadence. |
| REQ-DOC-03-018 | 5. Backend Persona Mapping Rules | MUST | Allow multiple overlays where real households overlap, for example family with toddler plus diabetic elder. |
| REQ-DOC-03-019 | 5. Backend Persona Mapping Rules | MUST | Store both base persona and overlay personas in the user profile. |
| REQ-DOC-03-020 | 6. Persona Confidence Model | SHOULD | Every persona assignment should carry a confidence score. High confidence comes from explicit sub-cohort selection plus supporting answers. Medium confidence comes from main cohort plus household members. Low confidence comes from skipped onboarding and should use DOC-20 cold-start assumptions. |
| REQ-DOC-03-021 | 8. Implementation Output | MUST | persona_assignment = {  "main_cohort_id": "MC_FAMILY",  "sub_cohort_id": "SC_COUPLE_WITH_INFANT",  "base_persona_id": "P_COUPLE_WITH_INFANT",  "overlay_persona_ids": ["O_DIABETIC_ELDER"],  "confidence": 0.86,  "routing_trace": ["main_cohort", "sub_cohort", "health_overlay"]} |
| REQ-DOC-03-022 | 10. Acceptance Criteria | MUST | User is never shown a long backend persona list. |
| REQ-DOC-03-023 | 10. Acceptance Criteria | COULD | Every detailed persona used by the engine can be traced to onboarding answers. |
| REQ-DOC-03-024 | 10. Acceptance Criteria | MUST | Overlapping personas are supported through overlays rather than duplicate persona explosion. |

## DOC-04 — DOC-04_Household_Composition_Member_Needs_v1.0
_Builds: BUILD-02, BUILD-05 · Purpose: Defines how household members influence planning: adults, infants, toddlers, school children, teens, elderly members, pregnant/postpartum women, diabetic member_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-04-001 | preamble | MUST | Household Composition + Member-Specific Needs Specification |
| REQ-DOC-04-002 | preamble | MUST | DOC-04 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-04-003 | 1. Purpose and Scope | MUST | Defines how household members influence planning: adults, infants, toddlers, school children, teens, elderly members, pregnant/postpartum women, diabetic members, recovery members, and fitness-focused members. |
| REQ-DOC-04-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-04-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-04-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-04-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-04-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-04-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-04-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-04-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-04-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-04-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-04-014 | 4. Household Model | SHOULD | A household can have one or many members. The planning engine should create a common primary meal for the majority of the household and attach member-specific add-ons for special needs. This avoids the error of making infant food, elderly soft food, or diabetic dishes the main family class. |
| REQ-DOC-04-015 | 6. Add-on Trigger Rules | MUST | If any infant member exists, generate infant add-on slots for breakfast/lunch/dinner as appropriate. |
| REQ-DOC-04-016 | 6. Add-on Trigger Rules | MUST | If toddler exists, generate mild soft add-on when main meal is spicy, fried, or hard texture. |
| REQ-DOC-04-017 | 6. Add-on Trigger Rules | MUST | If diabetic elder exists, generate diabetic-friendly side/add-on and demote sugar-heavy/fried classes. |
| REQ-DOC-04-018 | 6. Add-on Trigger Rules | MUST | If pregnant/postpartum member exists, add relevant recovery/nutrition component without changing all household meals. |
| REQ-DOC-04-019 | 6. Add-on Trigger Rules | COULD | If elderly-only household, elderly soft/digestive classes may become primary because the majority household need is elderly-oriented. |
| REQ-DOC-04-020 | 8. Implementation Rules | MUST | Build household profile before planning meals. |
| REQ-DOC-04-021 | 8. Implementation Rules | MUST | Identify majority meal group. |
| REQ-DOC-04-022 | 8. Implementation Rules | MUST | Generate primary class plan for majority household. |
| REQ-DOC-04-023 | 8. Implementation Rules | MUST | Run add-on trigger logic per member segment. |
| REQ-DOC-04-024 | 8. Implementation Rules | MUST | Attach add-ons to the relevant meal slot as separate columns/objects. |
| REQ-DOC-04-025 | 8. Implementation Rules | MUST | Apply hard constraints to add-ons independently and jointly with household diet. |
| REQ-DOC-04-026 | 9. Worked Examples | MUST | Family meal plus add-ons |
| REQ-DOC-04-027 | 9. Worked Examples | MUST | Dinner primary class is dal-sabzi-roti for the family. Infant receives dal-rice mash. Diabetic elder receives low-oil lauki chana dal or cucumber curd side. The dinner is still a family dinner, not an infant or diabetic-only plan. |
| REQ-DOC-04-028 | 11. Acceptance Criteria | MUST | Member-specific needs produce add-ons without hijacking the family meal. |
| REQ-DOC-04-029 | 11. Acceptance Criteria | MUST | Whole-household special cases are handled separately. |
| REQ-DOC-04-030 | 11. Acceptance Criteria | MUST | Add-on generation is deterministic and testable. |

## DOC-06 — DOC-06_Primary_vs_Addon_Meal_Architecture_v1.0
_Builds: BUILD-04, BUILD-05 · Purpose: Defines the architectural separation between primary meal classes, secondary/tertiary class options, add-on-only classes, and combo templates. This prevents lif_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-06-001 | preamble | MUST | Primary vs Add-on Meal Architecture Specification |
| REQ-DOC-06-002 | preamble | MUST | DOC-06 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-06-003 | 1. Purpose and Scope | MUST | Defines the architectural separation between primary meal classes, secondary/tertiary class options, add-on-only classes, and combo templates. This prevents lifecycle and health classes from being incorrectly used as normal weekly primary meals. |
| REQ-DOC-06-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-06-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-06-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-06-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-06-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-06-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-06-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-06-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-06-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-06-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-06-014 | 5. Why Add-ons Are Separate | MUST | Families usually do not cook an entirely separate main meal for every member. They cook one household meal and add or adapt components for baby, toddler, elderly, diabetic, pregnant/postpartum, recovery, or fitness needs. The engine must mirror this reality. |
| REQ-DOC-06-015 | 7. Overlap Resolution Rules | MUST | If a class describes a person type rather than a meal behavior, it is likely add-on-only. |
| REQ-DOC-06-016 | 7. Overlap Resolution Rules | COULD | If a class describes a full family eating pattern, it can be primary if allowed by meal slot. |
| REQ-DOC-06-017 | 7. Overlap Resolution Rules | MUST | If a class is a template like family comfort, do not treat it as a dish pool; map to concrete meal classes. |
| REQ-DOC-06-018 | 7. Overlap Resolution Rules | MUST | Overlap resolution must be stored in data and enforced by validation, not only by developer memory. |
| REQ-DOC-06-019 | 8. Implementation Join Shape | MUST | weekly_slot = {  "primary_class_code": "DIN_SIMPLE_SABZI_DAL",  "secondary_class_code": "DIN_LIGHT_KHICHDI_CURD",  "addon_components": [    {"target_member_segment": "INFANT", "addon_class_code": "ADDON_INFANT_SOFT_FOOD"},    {"target_member_segment": "DIABETIC_ELDER", "addon_class_code": "ADDON_DIA |
| REQ-DOC-06-020 | 10. Acceptance Criteria | MUST | Add-on-only classes cannot appear in primary weekly class columns. |
| REQ-DOC-06-021 | 10. Acceptance Criteria | MUST | Dish expansion uses primary class codes for family dishes and addon_class_codes for add-ons. |
| REQ-DOC-06-022 | 10. Acceptance Criteria | MUST | Validation catches any class marked not primary appearing as a primary plan class. |

## DOC-09 — DOC-09_State_Region_City_Migration_Overlay_v1.0
_Builds: BUILD-03, BUILD-04 · Purpose: Defines how home state, current city, city tier, migration behavior, regional staples, local lifestyle, and national modern patterns influence the meal plan._

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-09-001 | preamble | MUST | State, Region, City, and Migration Overlay Specification |
| REQ-DOC-09-002 | preamble | MUST | DOC-09 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-09-003 | 1. Purpose and Scope | MUST | Defines how home state, current city, city tier, migration behavior, regional staples, local lifestyle, and national modern patterns influence the meal plan. |
| REQ-DOC-09-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-09-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-09-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-09-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-09-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-09-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-09-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-09-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-09-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-09-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-09-014 | 5. Weighting Model | SHOULD | For migrated households, use a weighted blend. A common default is 60-70 percent home-state signature, 20-25 percent current-city lifestyle, and 10-15 percent national modern influence. Actual weights should come from City_Migration_Overlay_v3 where available. |
| REQ-DOC-09-015 | 7. Migration Planning Rules | MUST | Resolve home_state and current_city separately. |
| REQ-DOC-09-016 | 7. Migration Planning Rules | MUST | Load state profile for home_state. |
| REQ-DOC-09-017 | 7. Migration Planning Rules | MUST | Load city overlay for home_state + current_city group if available. |
| REQ-DOC-09-018 | 7. Migration Planning Rules | MUST | Apply home-state classes as base class affinity. |
| REQ-DOC-09-019 | 7. Migration Planning Rules | MUST | Apply current-city lifestyle classes as modifiers, not full replacement. |
| REQ-DOC-09-020 | 7. Migration Planning Rules | MUST | Apply city tier and cook dependency to weekday complexity. |
| REQ-DOC-09-021 | 7. Migration Planning Rules | MUST | Validate plan still includes realistic familiar meals across the week. |
| REQ-DOC-09-022 | 8. Example Interpretation | SHOULD | MP-origin household in Mumbai should retain MP-style dal-sabzi-roti, poha, light grain breakfasts, and regional home meals, while also showing Mumbai/Tier 1 patterns: quick breakfasts, lighter weekday dinners, healthy snacks, and occasional city-style indulgence. |
| REQ-DOC-09-023 | 10. Acceptance Criteria | MUST | Home state and current city are stored separately. |
| REQ-DOC-09-024 | 10. Acceptance Criteria | MUST | Migration overlay modifies, not erases, home-style food identity. |
| REQ-DOC-09-025 | 10. Acceptance Criteria | MUST | Tier 1/Tier 2 lifestyle effects are visible in class distributions. |

## DOC-10 — DOC-10_Onboarding_Journey_Dynamic_Flow_v1.0
_Builds: BUILD-02 · Purpose: Defines the user-facing onboarding journey that captures a small number of high-signal answers without forcing users to choose from a long persona list._

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-10-001 | preamble | MUST | Onboarding Journey + Dynamic Question Flow Specification |
| REQ-DOC-10-002 | preamble | MUST | DOC-10 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-10-003 | 1. Purpose and Scope | MUST | Defines the user-facing onboarding journey that captures a small number of high-signal answers without forcing users to choose from a long persona list. |
| REQ-DOC-10-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-10-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-10-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-10-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-10-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-10-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-10-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-10-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-10-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-10-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-10-014 | 4. Onboarding Principles | MUST | Ask only questions that change the first-week plan. |
| REQ-DOC-10-015 | 4. Onboarding Principles | MUST | Use cards/chips/swipes instead of long forms wherever possible. |
| REQ-DOC-10-016 | 4. Onboarding Principles | MUST | Keep main cohort selection to around 4-5 options. |
| REQ-DOC-10-017 | 4. Onboarding Principles | MUST | Ask sub-cohort questions dynamically after main cohort. |
| REQ-DOC-10-018 | 4. Onboarding Principles | MUST | Capture home state and current city separately. |
| REQ-DOC-10-019 | 4. Onboarding Principles | MUST | Prefer class-level preference signals over dish-level aspirational choices. |
| REQ-DOC-10-020 | 4. Onboarding Principles | MUST | Allow skip; use DOC-20 cold-start defaults when skipped. |
| REQ-DOC-10-021 | 6. Dynamic Branching | MUST | If the user selects family with kids, ask age-band chips for infant/toddler/school child/teen. If the user selects family with elders, ask soft/digestive/diabetic follow-ups. If the user selects special health/life stage, ask pregnancy/postpartum/diabetes/fitness/recovery. If the user selects solo/c |
| REQ-DOC-10-022 | 7. Output Contract | MUST | onboarding_result = {  "main_cohort_id": "MC_FAMILY",  "sub_cohort_id": "SC_COUPLE_WITH_INFANT",  "home_state": "Madhya Pradesh",  "current_city": "Mumbai",  "diet_mode": "vegetarian",  "member_segments": ["INFANT", "DIABETIC_ELDER"],  "cook_capability": "assisted_cook_needs_instruction",  "class_pr |
| REQ-DOC-10-023 | 9. Acceptance Criteria | COULD | Onboarding can be completed quickly while still producing a valid household profile. |
| REQ-DOC-10-024 | 9. Acceptance Criteria | MUST | Every answer maps to a known backend field in DOC-11. |
| REQ-DOC-10-025 | 9. Acceptance Criteria | MUST | Skipped answers have defined fallback behavior in DOC-20. |

## DOC-13 — DOC-13_Weekly_Meal_Plan_Generation_Algorithm_v1.0
_Builds: BUILD-04, BUILD-05, BUILD-06 · Purpose: Defines the deterministic algorithm that generates a 7-day class-first meal plan from household profile, cohort/persona assignment, state/city overlay, diet con_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-13-001 | preamble | MUST | Weekly Meal Plan Generation Algorithm Specification |
| REQ-DOC-13-002 | preamble | MUST | DOC-13 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-13-003 | 1. Purpose and Scope | MUST | Defines the deterministic algorithm that generates a 7-day class-first meal plan from household profile, cohort/persona assignment, state/city overlay, diet constraints, cook capability, and weekday/weekend rules. |
| REQ-DOC-13-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-13-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-13-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-13-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-13-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-13-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-13-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-13-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-13-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-13-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-13-014 | 4. Algorithm Overview | MUST | Build or load household profile. |
| REQ-DOC-13-015 | 4. Algorithm Overview | MUST | Apply hard constraints. |
| REQ-DOC-13-016 | 4. Algorithm Overview | MUST | Assign persona and overlays. |
| REQ-DOC-13-017 | 4. Algorithm Overview | MUST | Find cohort rows in Cohort_Matrix_v3. |
| REQ-DOC-13-018 | 4. Algorithm Overview | MUST | Load weekly class plan rows from Weekly_Class_Plan_v3. |
| REQ-DOC-13-019 | 4. Algorithm Overview | MUST | Apply state profile and current city migration overlay. |
| REQ-DOC-13-020 | 4. Algorithm Overview | MUST | Apply cook capability and time pressure adjustments. |
| REQ-DOC-13-021 | 4. Algorithm Overview | MUST | Apply weekday/weekend cadence. |
| REQ-DOC-13-022 | 4. Algorithm Overview | MUST | Validate class rotation and variety. |
| REQ-DOC-13-023 | 4. Algorithm Overview | MUST | Generate add-on component plan for member segments. |
| REQ-DOC-13-024 | 4. Algorithm Overview | MUST | Expand classes to dish candidates. |
| REQ-DOC-13-025 | 4. Algorithm Overview | MUST | Return class-first plan plus ranked dishes and explanation tags. |
| REQ-DOC-13-026 | 6. Pseudocode | MUST | def generate_weekly_class_plan(profile):    constraints = resolve_constraints(profile)    persona = assign_persona(profile)    cohort = find_best_cohort(profile, persona)    base_plan = load_weekly_plan(cohort.cohort_id)    plan = apply_state_profile(base_plan, profile.home_state)    plan = apply_ci |
| REQ-DOC-13-027 | 8. Output Shape | MUST | week_plan_day = {  "date": "2026-06-15",  "day_of_week": "Monday",  "breakfast": {"primary_class_code": "BF_LIGHT_GRAIN", "dish_candidates": [...]},  "lunch": {"primary_class_code": "LUNCH_DAL_SABZI_ROTI", "dish_candidates": [...]},  "snack": {"primary_class_code": "SNACK_LIGHT_HOME", "dish_candidat |
| REQ-DOC-13-028 | 10. Acceptance Criteria | MUST | Algorithm is deterministic with fixed seed. |
| REQ-DOC-13-029 | 10. Acceptance Criteria | COULD | Plan can be generated even with minimal profile. |
| REQ-DOC-13-030 | 10. Acceptance Criteria | MUST | All output classes exist in DOC-05/DOC-12. |
| REQ-DOC-13-031 | 10. Acceptance Criteria | MUST | All add-ons are separate from primary meals. |

## DOC-14 — DOC-14_Class_Rotation_Variety_Balance_Rules_v1.0
_Builds: BUILD-04 · Purpose: Defines rotation, variety, heaviness, repeat tolerance, weekday/weekend, meal-slot, and coherence rules for realistic weekly meal-class plans._

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-14-001 | preamble | MUST | Class Rotation, Variety, and Balance Rules Specification |
| REQ-DOC-14-002 | preamble | MUST | DOC-14 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-14-003 | 1. Purpose and Scope | MUST | Defines rotation, variety, heaviness, repeat tolerance, weekday/weekend, meal-slot, and coherence rules for realistic weekly meal-class plans. |
| REQ-DOC-14-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-14-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-14-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-14-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-14-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-14-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-14-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-14-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-14-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-14-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-14-014 | 4. Why Variety Rules Exist | SHOULD | Indian meal weeks have stable patterns but not random dish chaos. Users repeat classes such as dal-sabzi-roti, rice-dal, poha/upma, simple sabzi, fish curry rice, or khichdi, but they expect sensible spacing and weekend shifts. The engine should balance familiarity and freshness. |
| REQ-DOC-14-015 | 6. Meal-Slot Specific Logic | COULD | Breakfast can repeat more than lunch/dinner for many Indian households. |
| REQ-DOC-14-016 | 6. Meal-Slot Specific Logic | MUST | Lunch is often the most stable home-style meal: dal, sabzi, roti, rice, fish curry, curd rice, etc. |
| REQ-DOC-14-017 | 6. Meal-Slot Specific Logic | MUST | Dinner is often lighter or simpler on weekdays and more special on weekends. |
| REQ-DOC-14-018 | 6. Meal-Slot Specific Logic | MUST | Snacks vary strongly by kids, office, fitness, and city lifestyle. |
| REQ-DOC-14-019 | 6. Meal-Slot Specific Logic | COULD | Weekend plans can introduce richer regional specials, fried breakfast, non-veg, sweets, or elaborate meals. |
| REQ-DOC-14-020 | 7. Heaviness and Coherence | SHOULD | Coherence sensitivity should be learned over time. Before learning, use gentle defaults: working urban families often prefer balanced weekday heaviness; elderly and health-conscious households lean lighter; young high-calorie households may tolerate heavy meals more often. The planner should not for |
| REQ-DOC-14-021 | 8. Validation Algorithm | MUST | Count primary class occurrences by slot and week. |
| REQ-DOC-14-022 | 8. Validation Algorithm | MUST | Count heavy classes per day. |
| REQ-DOC-14-023 | 8. Validation Algorithm | MUST | Check consecutive heavy meals. |
| REQ-DOC-14-024 | 8. Validation Algorithm | MUST | Check weekend special allocation. |
| REQ-DOC-14-025 | 8. Validation Algorithm | MUST | Check state/city overlay representation. |
| REQ-DOC-14-026 | 8. Validation Algorithm | MUST | Check add-on presence for required member segments. |
| REQ-DOC-14-027 | 8. Validation Algorithm | MUST | If violation occurs, replace using secondary/tertiary class or safe fallback. |
| REQ-DOC-14-028 | 10. Acceptance Criteria | MUST | Weekly plan feels realistic, not random. |
| REQ-DOC-14-029 | 10. Acceptance Criteria | MUST | Class repetition is allowed when behaviorally normal but controlled. |
| REQ-DOC-14-030 | 10. Acceptance Criteria | MUST | Weekend meals differ from weekdays in appropriate cohorts. |

## DOC-15 — DOC-15_Non_Veg_Consumption_Patterns_v1.0
_Builds: BUILD-03, BUILD-04, BUILD-06 · Purpose: Defines state, region, persona, and household-level logic for egg, chicken, fish/seafood, mutton/red meat, and non-veg frequency across weekdays and weekends._

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-15-001 | preamble | MUST | Non-Veg Consumption Pattern Specification |
| REQ-DOC-15-002 | preamble | MUST | DOC-15 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-15-003 | 1. Purpose and Scope | MUST | Defines state, region, persona, and household-level logic for egg, chicken, fish/seafood, mutton/red meat, and non-veg frequency across weekdays and weekends. |
| REQ-DOC-15-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-15-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-15-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-15-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-15-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-15-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-15-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-15-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-15-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-15-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-15-014 | 4. Core Rule | MUST | Non-veg recommendations must never appear unless diet_mode and household constraints allow them. Once allowed, non-veg cadence should come from state intensity, persona, household preference, and weekday/weekend behavior. |
| REQ-DOC-15-015 | 7. Weekday vs Weekend Cadence | COULD | Coastal/eastern regular non-veg households may eat fish on weekdays as normal home food. |
| REQ-DOC-15-016 | 7. Weekday vs Weekend Cadence | COULD | North/west urban households may keep chicken/mutton mostly for weekend dinners or special lunches. |
| REQ-DOC-15-017 | 7. Weekday vs Weekend Cadence | COULD | Eggs can appear as weekday breakfast/protein add-on if allowed. |
| REQ-DOC-15-018 | 7. Weekday vs Weekend Cadence | SHOULD | Mutton/red meat should usually be weekend/special unless household explicitly selects high non-veg frequency. |
| REQ-DOC-15-019 | 7. Weekday vs Weekend Cadence | MUST | Vegetarian, Jain, vegan, and no-nonveg households get zero non-veg classes. |
| REQ-DOC-15-020 | 8. Implementation Rules | MUST | if profile.diet_mode in ["veg", "jain", "vegan"]:    nonveg_allowed = Falseelif profile.diet_mode == "egg_only":    allowed_proteins = ["egg"]else:    allowed_proteins = resolve_from_user_and_state(profile, NonVeg_Logic_v3)nonveg_slots = allocate_nonveg_slots(allowed_proteins, state_intensity, perso |
| REQ-DOC-15-021 | 10. Acceptance Criteria | MUST | Non-veg is never inferred for vegetarian/Jain/vegan users. |
| REQ-DOC-15-022 | 10. Acceptance Criteria | MUST | Coastal/eastern fish patterns are represented when allowed. |
| REQ-DOC-15-023 | 10. Acceptance Criteria | MUST | Weekend indulgence patterns are represented for appropriate cohorts. |

## DOC-16 — DOC-16_Cook_Dependency_Kitchen_Capability_v1.0
_Builds: BUILD-02, BUILD-04 · Purpose: Defines how cook availability, cook skill, need for instructions, household time pressure, kitchen capability, and batch-cooking behavior influence meal classes_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-16-001 | preamble | MUST | Cook Dependency + Kitchen Capability Persona Specification |
| REQ-DOC-16-002 | preamble | MUST | DOC-16 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-16-003 | 1. Purpose and Scope | MUST | Defines how cook availability, cook skill, need for instructions, household time pressure, kitchen capability, and batch-cooking behavior influence meal classes and dish ranking. |
| REQ-DOC-16-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-16-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-16-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-16-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-16-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-16-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-16-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-16-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-16-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-16-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-16-014 | 4. Why Cook Capability Matters | MUST | A technically perfect meal recommendation fails if the household cannot execute it. Many urban Indian homes rely on cooks with different skill levels: skilled cook, basic cook, cook needing constant instruction, no cook, working woman managing cooking, elderly cook, or batch-prep household. |
| REQ-DOC-16-015 | 6. Class Filtering by Complexity | SHOULD | Meal classes have cook_complexity and cook_time-like attributes in the taxonomy. Weekday plans should demote high-complexity classes for no-cook/basic-cook/high-time-pressure households. Weekend can restore some complexity if cohort allows. |
| REQ-DOC-16-016 | 7. Instruction Quality Requirements | SHOULD | For assisted cook households, dish cards should include short cook instructions, not just recipe name. |
| REQ-DOC-16-017 | 7. Instruction Quality Requirements | MUST | For basic cooks, prefer dishes with repeatable base gravies, pressure cooker dal, simple sabzi, and familiar breakfast classes. |
| REQ-DOC-16-018 | 7. Instruction Quality Requirements | COULD | For no-cook households, use classes that can be assembled or outsourced, but still map to meal classes. |
| REQ-DOC-16-019 | 7. Instruction Quality Requirements | COULD | For batch-cook households, allow dal/sabzi bases that can carry forward into next day variations. |
| REQ-DOC-16-020 | 10. Acceptance Criteria | MUST | Weekday plans are executable for cook capability. |
| REQ-DOC-16-021 | 10. Acceptance Criteria | MUST | Complex dishes are not suggested to no-cook/basic-cook households by default. |
| REQ-DOC-16-022 | 10. Acceptance Criteria | MUST | Cook-dependent users get classes and dishes with appropriate instruction complexity. |

## DOC-17 — DOC-17_Health_Fitness_Lifestyle_Overlays_v1.0
_Builds: BUILD-02, BUILD-05, BUILD-07 · Purpose: Defines overlays for diabetic, weight loss, high protein, gym/fitness, elderly digestion, pregnancy, postpartum, child growth, recovery, and modern healthy life_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-17-001 | preamble | MUST | Health, Fitness, and Lifestyle Overlay Specification |
| REQ-DOC-17-002 | preamble | MUST | DOC-17 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-17-003 | 1. Purpose and Scope | MUST | Defines overlays for diabetic, weight loss, high protein, gym/fitness, elderly digestion, pregnancy, postpartum, child growth, recovery, and modern healthy lifestyle patterns. |
| REQ-DOC-17-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-17-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-17-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-17-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-17-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-17-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-17-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-17-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-17-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-17-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-17-014 | 4. Overlay Principle | SHOULD | Health and lifecycle needs modify planning and add member-specific components. They should not automatically turn the whole household into a diet plan unless the household explicitly chooses that mode. |
| REQ-DOC-17-015 | 6. Safety and Scope | MUST | The system should provide meal-planning personalization and not claim medical treatment. Health overlays must be described as preferences and food suitability filters. For serious medical conditions, the app can allow user-entered restrictions but should avoid diagnosis. |
| REQ-DOC-17-016 | 7. Ranking Effects | MUST | Diabetic overlay: demote sugar-heavy classes and boost low-GI add-ons. |
| REQ-DOC-17-017 | 7. Ranking Effects | MUST | Fitness overlay: boost protein-rich dish candidates and high-protein snacks. |
| REQ-DOC-17-018 | 7. Ranking Effects | MUST | Elderly overlay: demote very spicy, deep fried, and hard texture dishes. |
| REQ-DOC-17-019 | 7. Ranking Effects | MUST | Pregnancy/postpartum: use explicit safe/avoid flags as hard or strong constraints once defined. |
| REQ-DOC-17-020 | 7. Ranking Effects | MUST | Child overlay: boost familiar, mild, portable, and tiffin-friendly classes. |
| REQ-DOC-17-021 | 8. Implementation Output | MUST | health_overlays = [  {"type": "DIABETIC", "target_member_id": "elder_1", "strength": "hard_for_member_soft_for_household"},  {"type": "INFANT", "target_member_id": "baby_1", "strength": "addon_required"}] |
| REQ-DOC-17-022 | 10. Acceptance Criteria | MUST | Health/lifecycle overlays do not incorrectly replace primary meals. |
| REQ-DOC-17-023 | 10. Acceptance Criteria | MUST | Member-specific constraints are applied to add-ons and relevant dish ranking. |
| REQ-DOC-17-024 | 10. Acceptance Criteria | MUST | Fitness and health preferences remain configurable and learn from behavior. |

## DOC-18 — DOC-18_Diet_Religion_Allergy_Fasting_Constraints_v1.0
_Builds: BUILD-02, BUILD-04, BUILD-06 · Purpose: Defines hard and soft constraints for vegetarian, non-vegetarian, eggetarian, Jain, vegan, allergies, fasting days, onion/garlic restrictions, and lifecycle-spe_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-18-001 | preamble | MUST | Diet, Religion, Allergy, and Fasting Constraint Specification |
| REQ-DOC-18-002 | preamble | MUST | DOC-18 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-18-003 | 1. Purpose and Scope | MUST | Defines hard and soft constraints for vegetarian, non-vegetarian, eggetarian, Jain, vegan, allergies, fasting days, onion/garlic restrictions, and lifecycle-specific safety filters. |
| REQ-DOC-18-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-18-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-18-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-18-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-18-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-18-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-18-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-18-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-18-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-18-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-18-014 | 6. Fasting Logic | SHOULD | Fasting should be modeled as a mode/day/member-level override. A household may have one fasting member while others eat normal meals. Do not force the whole family into fasting meals unless the whole household selected it. |
| REQ-DOC-18-015 | 7. Implementation Order | MUST | Resolve household-wide hard constraints. |
| REQ-DOC-18-016 | 7. Implementation Order | MUST | Resolve member-specific hard constraints. |
| REQ-DOC-18-017 | 7. Implementation Order | MUST | Filter classes if the class itself is incompatible. |
| REQ-DOC-18-018 | 7. Implementation Order | MUST | Filter dish candidates by ingredient and diet tags. |
| REQ-DOC-18-019 | 7. Implementation Order | MUST | Filter add-on candidates by target member constraints. |
| REQ-DOC-18-020 | 7. Implementation Order | MUST | Apply soft preference demotions after hard filters. |
| REQ-DOC-18-021 | 7. Implementation Order | MUST | Log excluded items for explainability and QA. |
| REQ-DOC-18-022 | 8. Example | SHOULD | A Jain family with a toddler should receive Jain-compatible primary meal classes and Jain-compatible toddler add-ons. A non-Jain family with one fasting member should receive normal household meals plus fasting add-on/substitution for that member. |
| REQ-DOC-18-023 | 10. Acceptance Criteria | MUST | No hard constraint violation is possible in dish candidates or add-ons. |
| REQ-DOC-18-024 | 10. Acceptance Criteria | COULD | Fasting can be member-specific or household-wide. |
| REQ-DOC-18-025 | 10. Acceptance Criteria | MUST | Jain, vegan, allergy, and non-veg logic are explicit and testable. |

## DOC-19 — DOC-19_RE_Scoring_Rules_v1.0
_Builds: BUILD-06, BUILD-07 · Purpose: Defines how dish candidates under selected meal classes are ranked using class fit, region/city affinity, Food DNA, diet constraints, cook capability, weather/d_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-19-001 | preamble | MUST | Recommendation Engine Scoring Rules Specification |
| REQ-DOC-19-002 | preamble | MUST | DOC-19 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-19-003 | 1. Purpose and Scope | MUST | Defines how dish candidates under selected meal classes are ranked using class fit, region/city affinity, Food DNA, diet constraints, cook capability, weather/day context, history, feedback, variety, and randomization. |
| REQ-DOC-19-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-19-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-19-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-19-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-19-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-19-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-19-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-19-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-19-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-19-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-19-014 | 4. Scoring Principle | SHOULD | The weekly class plan decides the behavior slot. Scoring decides the best dish instance inside that class. A user who regularly eats simple green vegetable sabzi should not be forced into one dish like bhindi; bhindi, lauki, turai, beans, palak, kundru, and similar dishes are instances under a class |
| REQ-DOC-19-015 | 6. Hard Filter Before Score | MUST | Diet compatibility |
| REQ-DOC-19-016 | 6. Hard Filter Before Score | MUST | Allergy compatibility |
| REQ-DOC-19-017 | 6. Hard Filter Before Score | MUST | Jain/vegan/fasting compatibility |
| REQ-DOC-19-018 | 6. Hard Filter Before Score | MUST | Meal slot eligibility |
| REQ-DOC-19-019 | 6. Hard Filter Before Score | MUST | Add-on target-member safety |
| REQ-DOC-19-020 | 7. Formula | MUST | final_score = base_score + class_affinity + regional_affinity + city_overlay + day_slot_fit + cook_fit + food_dna_match + history_modifier + variety_modifier + random_factor |
| REQ-DOC-19-021 | 9. Anti-patterns | MUST | Do not score dishes from classes not selected for that slot unless used as fallback. |
| REQ-DOC-19-022 | 9. Anti-patterns | MUST | Do not let randomization override hard constraints. |
| REQ-DOC-19-023 | 9. Anti-patterns | MUST | Do not over-boost aspirational onboarding dish likes without behavior. |
| REQ-DOC-19-024 | 9. Anti-patterns | MUST | Do not collapse class affinity and cuisine affinity into the same thing. |
| REQ-DOC-19-025 | 11. Acceptance Criteria | MUST | Dish rankings come only after class selection. |
| REQ-DOC-19-026 | 11. Acceptance Criteria | MUST | Scoring is explainable with component breakdown. |
| REQ-DOC-19-027 | 11. Acceptance Criteria | COULD | Revealed behavior can gradually override onboarding priors. |

## DOC-20 — DOC-20_Cold_Start_Safe_Assumptions_v1.0
_Builds: BUILD-02, BUILD-03, BUILD-04 · Purpose: Defines fallback logic when users provide minimal onboarding information, skip questions, or have sparse history. The goal is to still generate a safe, familiar_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-20-001 | preamble | MUST | Cold Start Safe Assumptions Specification |
| REQ-DOC-20-002 | preamble | MUST | DOC-20 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-20-003 | 1. Purpose and Scope | MUST | Defines fallback logic when users provide minimal onboarding information, skip questions, or have sparse history. The goal is to still generate a safe, familiar, high-acceptance first-week class plan. |
| REQ-DOC-20-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-20-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-20-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-20-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-20-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-20-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-20-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-20-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-20-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-20-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-20-014 | 4. Cold Start Philosophy | SHOULD | A skipped onboarding answer should reduce confidence, not block planning. Use state, main cohort, diet, city tier, and default household assumptions to produce a familiar class-first plan. Keep first recommendations conservative and behaviorally common. |
| REQ-DOC-20-015 | 6. Safe Default Classes | MUST | BF_LIGHT_GRAIN or equivalent light breakfast class |
| REQ-DOC-20-016 | 6. Safe Default Classes | MUST | Lunch dal-sabzi-roti/rice class |
| REQ-DOC-20-017 | 6. Safe Default Classes | MUST | Simple green vegetable sabzi class |
| REQ-DOC-20-018 | 6. Safe Default Classes | MUST | Light khichdi/curd/dal-rice dinner class |
| REQ-DOC-20-019 | 6. Safe Default Classes | MUST | Weekend regional special only when state/cohort supports it |
| REQ-DOC-20-020 | 7. Confidence Score Use | SHOULD | Every generated plan should include an internal confidence score. Low-confidence users should receive more familiar defaults and more opportunities to swipe/adjust. High-confidence users can receive more specific regional and persona-tailored plans. |
| REQ-DOC-20-021 | 10. Acceptance Criteria | MUST | Minimal onboarding still yields a valid weekly class plan. |
| REQ-DOC-20-022 | 10. Acceptance Criteria | MUST | Low-confidence assumptions are conservative and easy to correct through swipes. |
| REQ-DOC-20-023 | 10. Acceptance Criteria | MUST | Diet hard constraints are not guessed. |

## DOC-21 — DOC-21_Feedback_Learning_Loop_v1.0
_Builds: BUILD-07 · Purpose: Defines how revealed behavior updates class preferences, dish preferences, Food DNA vectors, repeat tolerance, non-veg cadence, cook complexity, and coherence s_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-21-001 | preamble | MUST | Feedback Signal + Learning Loop Specification |
| REQ-DOC-21-002 | preamble | MUST | DOC-21 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-21-003 | 1. Purpose and Scope | MUST | Defines how revealed behavior updates class preferences, dish preferences, Food DNA vectors, repeat tolerance, non-veg cadence, cook complexity, and coherence sensitivity. |
| REQ-DOC-21-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-21-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-21-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-21-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-21-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-21-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-21-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-21-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-21-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-21-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-21-014 | 4. Behavior Beats Aspiration | MUST | The engine should treat onboarding as a prior. Users may say they like paneer butter masala but repeatedly accept bhindi, lauki, dal-rice, poha, and light khichdi. The learning loop must move toward revealed behavior without abruptly ignoring explicit constraints. |
| REQ-DOC-21-015 | 6. Learning Targets | MUST | Class affinity vector |
| REQ-DOC-21-016 | 6. Learning Targets | MUST | Dish affinity vector |
| REQ-DOC-21-017 | 6. Learning Targets | MUST | Food DNA preference vector |
| REQ-DOC-21-018 | 6. Learning Targets | MUST | Repeat tolerance by meal slot |
| REQ-DOC-21-019 | 6. Learning Targets | MUST | Cuisine drift |
| REQ-DOC-21-020 | 6. Learning Targets | MUST | Cook complexity tolerance |
| REQ-DOC-21-021 | 6. Learning Targets | MUST | Non-veg cadence |
| REQ-DOC-21-022 | 6. Learning Targets | MUST | Coherence sensitivity |
| REQ-DOC-21-023 | 6. Learning Targets | MUST | Add-on relevance acceptance |
| REQ-DOC-21-024 | 7. Update Frequency | MUST | Real-time actions like Never and Not Today should affect the current session immediately. Aggregate preference vectors can update daily or weekly using decayed history. Mature personalization should use last 30/60/90-day windows depending on signal type. |
| REQ-DOC-21-025 | 8. Pseudocode | MUST | def process_feedback(event):    if event.type == "NEVER": hard_exclude(event.dish_id)    elif event.type == "NOT_TODAY": add_temp_cooldown(event.dish_id, days=3)    else:        update_class_affinity(event.meal_class_code, event.weight)        update_dish_affinity(event.dish_id, event.weight)        |
| REQ-DOC-21-026 | 10. Acceptance Criteria | MUST | Learning updates class-level preferences, not only dish-level likes. |
| REQ-DOC-21-027 | 10. Acceptance Criteria | MUST | Not Today and Never behave differently. |
| REQ-DOC-21-028 | 10. Acceptance Criteria | COULD | Revealed behavior can correct aspirational onboarding. |

## DOC-23 — DOC-23_API_Contract_Specification_v1.0
_Builds: BUILD-08 · Purpose: Defines backend API endpoints, request/response objects, validation errors, and service boundaries for onboarding, household profile, plan generation, feedback,_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-23-001 | preamble | MUST | API Contract Specification |
| REQ-DOC-23-002 | preamble | MUST | DOC-23 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-23-003 | 1. Purpose and Scope | MUST | Defines backend API endpoints, request/response objects, validation errors, and service boundaries for onboarding, household profile, plan generation, feedback, admin seed data, and QA. |
| REQ-DOC-23-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-23-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-23-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-23-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-23-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-23-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-23-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-23-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-23-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-23-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-23-014 | 6. Generate Week Plan Request | MUST | POST /plans/week/generate{  "user_id": "u_123",  "household_profile_id": "hp_123",  "start_date": "2026-06-15",  "timezone": "Asia/Kolkata",  "generation_mode": "cold_start_v1",  "random_seed": 42} |
| REQ-DOC-23-015 | 7. Generate Week Plan Response | MUST | {  "plan_id": "wp_123",  "profile_confidence": 0.86,  "days": [    {      "date": "2026-06-15",      "day_of_week": "Monday",      "meals": {        "breakfast": {          "primary_class_code": "BF_LIGHT_GRAIN",          "dish_candidates": [{"dish_id": "d_1", "dish_name": "Poha", "score": 2.1}],    |
| REQ-DOC-23-016 | 10. Acceptance Criteria | MUST | Endpoints support class-first plan generation and dish ranking. |
| REQ-DOC-23-017 | 10. Acceptance Criteria | MUST | Responses include enough traceability for debugging. |
| REQ-DOC-23-018 | 10. Acceptance Criteria | MUST | Validation errors are explicit and do not silently break constraints. |

## DOC-26 — DOC-26_Analytics_Experimentation_Spec_v1.0
_Builds: BUILD-10 · Purpose: Defines metrics, event taxonomy, dashboards, cohort-quality checks, onboarding funnel tracking, meal-class acceptance, add-on relevance, experimentation, and da_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-26-001 | preamble | MUST | Analytics + Experimentation Specification |
| REQ-DOC-26-002 | preamble | MUST | DOC-26 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-26-003 | 1. Purpose and Scope | MUST | Defines metrics, event taxonomy, dashboards, cohort-quality checks, onboarding funnel tracking, meal-class acceptance, add-on relevance, experimentation, and data-quality monitoring. |
| REQ-DOC-26-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-26-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-26-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-26-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-26-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-26-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-26-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-26-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-26-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-26-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-26-014 | 4. Analytics Goals | MUST | Measure whether the system creates first-day WOW, improves with revealed behavior, avoids wrong constraints, and keeps data taxonomy healthy. |
| REQ-DOC-26-015 | 7. Dashboards | MUST | Onboarding funnel dashboard |
| REQ-DOC-26-016 | 7. Dashboards | MUST | Plan quality dashboard |
| REQ-DOC-26-017 | 7. Dashboards | MUST | Class acceptance dashboard |
| REQ-DOC-26-018 | 7. Dashboards | MUST | Add-on relevance dashboard |
| REQ-DOC-26-019 | 7. Dashboards | MUST | Constraint violation dashboard |
| REQ-DOC-26-020 | 7. Dashboards | MUST | Data taxonomy QA dashboard |
| REQ-DOC-26-021 | 7. Dashboards | MUST | Experiment results dashboard |
| REQ-DOC-26-022 | 8. Event Schema | MUST | event = {  "event_type": "MEAL_LOCKED",  "user_id": "u_123",  "plan_id": "wp_123",  "meal_slot": "dinner",  "meal_class_code": "DIN_SIMPLE_SABZI_DAL",  "dish_id": "d_456",  "persona_id": "P_FAMILY_SCHOOL_CHILD",  "timestamp": "2026-06-13T18:30:00+05:30"} |
| REQ-DOC-26-023 | 10. Acceptance Criteria | COULD | Product can measure first-week quality. |
| REQ-DOC-26-024 | 10. Acceptance Criteria | COULD | Analytics can detect taxonomy/data problems. |
| REQ-DOC-26-025 | 10. Acceptance Criteria | MUST | Experiments do not violate hard constraints. |

## DOC-27 — DOC-27_Admin_CMS_Data_Operations_Spec_v1.0
_Builds: BUILD-09 · Purpose: Defines how product/data teams maintain meal classes, dishes, Food DNA tags, add-ons, state/city overlays, weekly matrices, QA, and release workflows without en_

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-27-001 | preamble | MUST | Admin CMS + Data Operations Specification |
| REQ-DOC-27-002 | preamble | MUST | DOC-27 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-27-003 | 1. Purpose and Scope | MUST | Defines how product/data teams maintain meal classes, dishes, Food DNA tags, add-ons, state/city overlays, weekly matrices, QA, and release workflows without engineering dependence for every content change. |
| REQ-DOC-27-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-27-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-27-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-27-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-27-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-27-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-27-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-27-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-27-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-27-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-27-014 | 5. Data Entry Rules | MUST | Every dish must map to at least one valid meal_class_code. |
| REQ-DOC-27-015 | 5. Data Entry Rules | MUST | A dish cannot be assigned to a class just because cuisine matches; class behavior must match. |
| REQ-DOC-27-016 | 5. Data Entry Rules | MUST | Add-on dishes require addon_class_code and target_member_segment. |
| REQ-DOC-27-017 | 5. Data Entry Rules | COULD | No new enum value can be introduced without updating DOC-02 and DOC-22. |
| REQ-DOC-27-018 | 5. Data Entry Rules | MUST | Every source-data release must run DOC-25 QA checks before production. |
| REQ-DOC-27-019 | 7. Data Quality Alerts | MUST | Class with zero dish options. |
| REQ-DOC-27-020 | 7. Data Quality Alerts | MUST | Dish mapped to add-on-only class as primary. |
| REQ-DOC-27-021 | 7. Data Quality Alerts | MUST | Dish diet tag incompatible with ingredients. |
| REQ-DOC-27-022 | 7. Data Quality Alerts | MUST | Meal class code appears in weekly plan but not taxonomy. |
| REQ-DOC-27-023 | 7. Data Quality Alerts | MUST | Add-on generated for persona without matching target member. |
| REQ-DOC-27-024 | 7. Data Quality Alerts | MUST | Source workbook row counts change unexpectedly. |
| REQ-DOC-27-025 | 9. Acceptance Criteria | COULD | Non-engineers can maintain taxonomy safely. |
| REQ-DOC-27-026 | 9. Acceptance Criteria | MUST | Every change has QA and versioning. |
| REQ-DOC-27-027 | 9. Acceptance Criteria | MUST | Admin tools prevent class/dish mismatch. |

## DOC-28 — DOC-28_Versioning_Governance_Changelog_v1.0
_Builds: BUILD-10 · Purpose: Defines versioning, release governance, taxonomy changes, source-data upgrades, rollback, approvals, changelog format, and compatibility expectations._

| REQ ID | Section | Priority | Requirement |
|---|---|---|---|
| REQ-DOC-28-001 | preamble | MUST | Versioning, Governance, and Change Log Specification |
| REQ-DOC-28-002 | preamble | MUST | DOC-28 / Version 1.0 / Meal Planning RE Technical Docs v1 |
| REQ-DOC-28-003 | 1. Purpose and Scope | MUST | Defines versioning, release governance, taxonomy changes, source-data upgrades, rollback, approvals, changelog format, and compatibility expectations. |
| REQ-DOC-28-004 | 1. Purpose and Scope | MUST | This document is part of the canonical 28-document technical system. It should be read in the order defined in DOC-00. It is written for an AI coding agent that must implement the agreed recommendation engine exactly, without inventing a competing architecture. |
| REQ-DOC-28-005 | 3. Core Implementation Invariants | MUST | Always build a household profile before generating any plan. |
| REQ-DOC-28-006 | 3. Core Implementation Invariants | MUST | Always map user-facing cohort answers into backend personas and overlays; do not expose all backend personas in onboarding. |
| REQ-DOC-28-007 | 3. Core Implementation Invariants | MUST | Always generate a 7-day class-first plan before selecting dishes. |
| REQ-DOC-28-008 | 3. Core Implementation Invariants | MUST | Always keep primary family meal classes separate from member-specific add-on components. |
| REQ-DOC-28-009 | 3. Core Implementation Invariants | MUST | Never allow kid, elderly, pregnancy, postpartum, diabetic, or recovery add-on classes to replace the main family meal unless the household itself has only that member segment. |
| REQ-DOC-28-010 | 3. Core Implementation Invariants | MUST | Always apply hard constraints before scoring: diet type, allergies, Jain/fasting rules, and Never list. |
| REQ-DOC-28-011 | 3. Core Implementation Invariants | MUST | Always use home state and current city as separate signals; do not collapse them into one location field. |
| REQ-DOC-28-012 | 3. Core Implementation Invariants | MUST | Always use class-to-dish mapping keyed by meal_class_code; never mix dishes from unrelated meal classes. |
| REQ-DOC-28-013 | 3. Core Implementation Invariants | MUST | Use v3 workbook IDs as canonical seed IDs unless a later approved source-data version supersedes them. |
| REQ-DOC-28-014 | 6. Governance Rules | MUST | Every production data release must have changelog, QA run, approver, timestamp, and rollback path. |
| REQ-DOC-28-015 | 6. Governance Rules | MUST | No deletion of IDs in active user history; deprecate instead. |
| REQ-DOC-28-016 | 6. Governance Rules | MUST | Additions must include source, purpose, owner, and test cases. |
| REQ-DOC-28-017 | 6. Governance Rules | MUST | Hard constraints require stricter review than soft scoring changes. |
| REQ-DOC-28-018 | 6. Governance Rules | MUST | DOC-00 document map must be updated when new canonical documents are added. |
| REQ-DOC-28-019 | 8. Backward Compatibility | SHOULD | Existing plan history should remain interpretable even if classes are deprecated. New recommendations should not use deprecated classes unless a migration map exists. User feedback tied to old classes should map to successor classes through a controlled migration table. |
| REQ-DOC-28-020 | 10. Acceptance Criteria | MUST | All future changes are traceable. |
| REQ-DOC-28-021 | 10. Acceptance Criteria | MUST | Breaking changes are intentionally versioned. |
| REQ-DOC-28-022 | 10. Acceptance Criteria | MUST | Rollback is possible for data and taxonomy releases. |
