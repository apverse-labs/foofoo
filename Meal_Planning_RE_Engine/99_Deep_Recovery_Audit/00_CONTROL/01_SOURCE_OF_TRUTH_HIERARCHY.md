# 01 — SOURCE-OF-TRUTH HIERARCHY

When sources disagree, authority flows top-down. Lower tiers are corrected to match higher tiers; never the reverse.

| Tier | Source | Authoritative for | Notes |
|---|---|---|---|
| **1** | `09_Source_Data/Indian_Meal_Cohort_Persona_DB_v3.xlsx` | Canonical **data**: all IDs, meal classes, cohorts, personas, weekly matrix rows, dish pools, add-on mappings, state/city/persona data, non-veg priors | Read-only. Never modified. The single highest data authority. |
| **2** | Canonical `.docx` + spec `.xlsx` (DOC-01…DOC-28) | **Rules, semantics, algorithms, constraints, scoring, API, QA, analytics, governance** | Includes tables, remarks columns, cell comments, formulas. Highest authority for *behaviour*. |
| **3** | MD files (`DOC-00`, `README`, `DOC-24`, `PACKAGE_MANIFEST`, module `*.md`) | Navigation, build order, index, context | **Guide only.** Never the sole basis for a requirement. |
| **4** | Code (`foofoo/src/**`, `re-engine/**`, repositories) + Supabase `foofoo-staging` | Implementation artifacts | Corrected to match tiers 1–2 when in conflict. |

## Conflict resolution rules
- **Tier 1 vs Tier 2 conflict** (data workbook vs document rule): log in `CANONICAL_CONFLICT_REGISTER.md` with both cell/paragraph refs. If a document explicitly defines a rule the data must obey, the document governs *semantics* while the workbook governs *values*; reconcile, do not silently pick.
- **Tier 2 internal conflict** (two documents disagree): log; prefer the document whose `Applicable build IDs` / `Primary source data` scope is narrower/more specific to the entity.
- **Tier 3 vs Tier 1/2 conflict**: Tier 3 always loses; note the MD drift.
- **Tier 4 vs Tier 1/2 conflict**: code/DB is a defect → goes to gap register + repair plan.
- **Unresolvable / policy conflict**: mark `founder decision needed = YES` in the conflict register; do not guess.

## Canonical document → tier map (this repo)

| DOC | File | Type | Tier |
|---|---|---|---|
| — | `Indian_Meal_Cohort_Persona_DB_v3.xlsx` | xlsx | **1** |
| DOC-02,05,07,08,11,12,22,25 | spec workbooks | xlsx | 2 |
| DOC-01,03,04,06,09,10,13,14,15,16,17,18,19,20,21,23,26,27,28 | docx | 2 |
| DOC-00, DOC-24, README, PACKAGE_MANIFEST, module *.md | md | 3 |
