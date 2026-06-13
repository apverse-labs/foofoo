# FooFoo — Meal Planning RE Module Rules

## Module Identity

- This is a versioned Recommendation Engine (RE) module inside the existing FooFoo app — NOT a standalone app.
- The existing FooFoo production app must never break due to RE module changes.
- The RE module integrates with the app exclusively through stable, versioned contracts and interfaces.
- The canonical source workbook `Indian_Meal_Cohort_Persona_DB_v3.xlsx` (in the docs folder) must never be overwritten or modified.
- Transformed seed data goes into implementation seed folders — never back into the docs folder.
- Do not invent canonical IDs that exist in docs or the source workbook; always derive them from those sources.

---

## Canonical Documentation

Read these at the start of every RE session before writing any code:

1. `Meal_Planning_RE_Technical_Docs_v1/README_IMPLEMENTATION_WALKTHROUGH_FOR_CLAUDE_v1.0.md`
2. `Meal_Planning_RE_Technical_Docs_v1/00_Master_Index/DOC-00_Master_Document_Map_and_Implementation_Order_v1.0.md`
3. `Meal_Planning_RE_Technical_Docs_v1/07_Technical_Build/DOC-24_AI_Coding_Agent_Implementation_Prompt_Pack_v1.0.md`
4. `Meal_Planning_RE_Technical_Docs_v1/07_Technical_Build/DOC-23_API_Contract_Specification_v1.0.docx`
5. `Meal_Planning_RE_Technical_Docs_v1/09_Source_Data/Indian_Meal_Cohort_Persona_DB_v3.xlsx`

---

## Core RE Architecture Chain

```
few onboarding answers
  → household profile
  → cohort/persona assignment (with overlapping persona support)
  → 7-day class-first meal plan
  → member-specific add-on components
  → class-to-dish expansion (from class_dish_options only)
  → Food DNA ranking
  → feedback learning loop
```

---

## Architecture Rules (Non-Negotiable)

1. **Class-first planning always** — never recommend dishes directly from cuisine or persona. Generate meal classes first, always.
2. **Dishes come from class_dish_options only** — expand to dishes only by joining on `meal_class_code` or `addon_class_code`.
3. **Never mix dishes across meal classes** — a dish candidate belongs to exactly one meal class in a given plan slot. Prevents the earlier mismatch (e.g. `BF_STUFFED_FLATBREAD` carrying dishes from `BF_FRIED_FESTIVE`).
4. **Primary household meals and member-specific add-ons are always separate** — infant, toddler, child, elderly, diabetic, pregnancy, postpartum, recovery, and fitness needs create add-on components; they must not replace the main family meal unless explicitly marked primary-eligible.
5. **`home_state` and `current_city` are always separate inputs** — `home_state` encodes native food identity; `current_city` encodes lifestyle and availability overlay. An MP-origin family in Mumbai is not a generic Mumbai family nor a generic MP family.
6. **Cohort/persona assignment must support overlapping personas** — a user can belong to multiple cohorts simultaneously; scoring must handle this.
7. **RE versions must be separately testable and deployable** — no RE version's tests or deployment should depend on another RE version's runtime.
8. **The main app calls a stable RE interface — never a specific RE version directly.** Version resolution is internal to the RE module via the resolver layer.
9. **All DB migrations must be additive only** — no dropping or renaming of production tables or columns. Backward compatibility is mandatory.
10. **Canonical source workbook is read-only** — `Indian_Meal_Cohort_Persona_DB_v3.xlsx` and the docs folder are reference material, not build artifacts.
11. **Transformed seed data goes into implementation seed folders** — e.g., `Meal_Planning_RE_Engine/seeds/`, not into `Meal_Planning_RE_Technical_Docs_v1/`.
12. **Do not invent canonical IDs** — meal class IDs, dish IDs, cohort IDs, persona IDs must always be derived from the docs or source workbook, never created ad-hoc.

---

## RE Versioning Requirement

The RE is a versioned system. Minimum target shape:

| Version | Description |
|---------|-------------|
| RE_V1   | Cold-start, class-first, rule-based planning |
| RE_V2   | Personal history and feedback adaptation |
| RE_V3   | Cluster-seeded recommendations |
| RE_V4   | Full personalization and collaborative filtering |

Each version implements the same public interface:

```typescript
interface MealPlanningREEngine {
  engineVersion: string;
  generateWeeklyPlan(input: GenerateWeeklyPlanInput): Promise<WeeklyMealPlanResult>;
  expandDishCandidates(input: ExpandDishCandidatesInput): Promise<DishCandidateResult>;
  scoreCandidates(input: ScoreCandidatesInput): Promise<ScoredRecommendationResult>;
  recordFeedback(input: FeedbackInput): Promise<FeedbackUpdateResult>;
}
```

**Resolution contract (app → RE module):**
```
app calls: generateMealPlan(userId, householdProfile, context)
RE module resolves: userId → assigned RE version → engine instance → result
```

The app never imports a specific version (`RE_V1`, `RE_V2`, etc.) directly. All version dispatch is internal to the RE module.

---

## Module Folder Structure (Target — Do Not Build Yet)

```
Meal_Planning_RE_Engine/
├── CLAUDE.md                              ← this file (module guardrails)
│
├── Meal_Planning_RE_Technical_Docs_v1/    ← READ-ONLY reference docs & source workbook
│   ├── README_IMPLEMENTATION_WALKTHROUGH_FOR_CLAUDE_v1.0.md
│   ├── 00_Master_Index/
│   │   ├── DOC-00_Master_Document_Map_and_Implementation_Order_v1.0.md
│   │   └── PACKAGE_MANIFEST_v1.0.md
│   ├── 01_Product_Foundation/
│   ├── 02_Cohorts_Personas/
│   ├── 03_Meal_Taxonomy/
│   ├── 04_Regional_Intelligence/
│   ├── 05_Onboarding/
│   ├── 06_Planning_Engine/
│   ├── 07_Technical_Build/
│   ├── 08_Operations/
│   └── 09_Source_Data/
│       └── Indian_Meal_Cohort_Persona_DB_v3.xlsx   ← NEVER MODIFY
│
├── 00_Implementation/                     ← all implementation code lives here
│   ├── interface/
│   │   └── MealPlanningREEngine.ts        ← stable public interface (all versions implement this)
│   │
│   ├── versions/
│   │   ├── RE_V1/                         ← cold-start rule-based engine
│   │   │   ├── index.ts
│   │   │   ├── classSelector.ts
│   │   │   ├── dishExpander.ts
│   │   │   ├── scorer.ts
│   │   │   └── __tests__/
│   │   ├── RE_V2/                         ← history + feedback engine
│   │   ├── RE_V3/                         ← cluster-seeded engine
│   │   └── RE_V4/                         ← full personalization engine
│   │
│   ├── resolver/
│   │   └── engineResolver.ts              ← userId → RE version → engine instance
│   │
│   ├── seeds/
│   │   ├── meal_classes/                  ← transformed from source workbook
│   │   ├── class_dish_options/
│   │   ├── cohorts/
│   │   └── personas/
│   │
│   ├── migrations/
│   │   ├── up/                            ← additive SQL migrations
│   │   └── down/                          ← rollback SQL migrations
│   │
│   └── __tests__/
│       └── integration/                   ← cross-version integration tests
```

---

## DB Migration Rules (RE Module Specific)

- All migrations are additive only (new tables, new columns with defaults, new indexes).
- Every migration requires both an Up script and a Down script.
- Migration files follow root project naming: `YYYYMMDD_NNN_label.sql`
- Migration files live in `00_Implementation/migrations/up/` and `.../down/`.
- Every migration must be registered in the root `SYSTEM_STATE.md` Schema Registry before it is applied.
- No migration may drop, rename, or destructively alter any table that exists in SCHEMA-BASE-001.
- All RE-specific tables must use a `re_` prefix to avoid colliding with existing MVP tables.

---

## Integration Guardrails

- The RE module exposes exactly one entry point to the FooFoo app: `generateMealPlan(userId, householdProfile, context)`.
- The app must not import any RE version module, internal class, or seed file directly.
- Feature flags or Supabase config control which RE version is active per user — the resolver handles this internally.
- Before writing any RE code, inspect the existing FooFoo project and identify: frontend flow, existing onboarding, user profile model, existing recipe/dish data, current meal planning logic, Supabase/API structure, feature flag mechanism, test setup, and deployment flow. Do not assume greenfield.

---

## Build Sequence

| Build ID | Name | Purpose |
|----------|------|---------|
| BUILD-00A | Module Guardrails & Tracker | This file + root CLAUDE.md update |
| BUILD-00B | Existing Project Integration Audit | Inspect current app before writing any RE code |
| BUILD-01 | RE Data Model & Seed Import | DB schema, seed tables, IDs, constraints |
| BUILD-02 | Onboarding Profile Builder | Dynamic onboarding, household/member capture |
| BUILD-03 | Cohort/Persona Assignment Engine | Profile → cohort → persona → overlays |
| BUILD-04 | Weekly Class-First Plan Engine | 7-day class plan, weekday/weekend rhythm |
| BUILD-05 | Member-Specific Add-on Engine | Infant/elderly/dietary add-ons |
| BUILD-06 | Dish Expansion & Food DNA Ranking | Class → dish candidates → ranked output |
| BUILD-07 | Feedback Learning Loop | Swipes, locks, Never list, class weight updates |
| BUILD-08 | API/App Integration | Stable JSON endpoints, app integration |
| BUILD-09 | Admin/Data Operations | CMS workflows, data QA |
| BUILD-10 | Analytics, QA, Experimentation, Governance | Funnel tracking, A/B, taxonomy changes |

Do not skip directly to dish recommendation. Implement in build order.

---

## Canonical Data Sources (Never Modify)

| Source | Location | Use |
|--------|----------|-----|
| `Indian_Meal_Cohort_Persona_DB_v3.xlsx` | `Meal_Planning_RE_Technical_Docs_v1/09_Source_Data/` | Master cohort/persona/dish reference |
| `DOC-00_Master_Document_Map_and_Implementation_Order_v1.0.md` | `00_Master_Index/` | Implementation sequence authority |
| `README_IMPLEMENTATION_WALKTHROUGH_FOR_CLAUDE_v1.0.md` | `Meal_Planning_RE_Technical_Docs_v1/` | Session-by-session build instructions |

---

## Session Rules for This Module

1. Read this file at the start of every RE module session before writing any code.
2. Read `SYSTEM_STATE.md` at session start; update it at session end.
3. Verify all file and branch references via GitHub MCP tools — never from local filesystem state (Rule 6 of root CLAUDE.md).
4. Never implement RE logic without first cross-referencing the relevant DOC-NN file from the Master Index.
5. Never apply a DB migration without first writing the Down script and registering the schema change in `SYSTEM_STATE.md`.
6. Never deploy to production without explicit user approval in the current conversation turn.
7. Every response that writes or changes code must include a "Git Next Steps" section per root CLAUDE.md Rule 5.

---

## Expected Output Format for Every Build

For each build, produce:

1. Files changed
2. Purpose
3. Implementation summary
4. Tests added
5. Commands run
6. Assumptions
7. Open questions
8. Next build recommendation
