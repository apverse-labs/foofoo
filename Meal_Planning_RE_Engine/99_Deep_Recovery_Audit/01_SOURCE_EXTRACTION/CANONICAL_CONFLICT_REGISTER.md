# CANONICAL_CONFLICT_REGISTER

Cross-source comparison: Tier-1 workbook counts vs numeric claims in Tier-2 DOCX vs Tier-3 MD, plus structural reconciliations. Resolution per source-of-truth hierarchy.

| Conflict ID | Files | Locations | Conflict | Severity | Resolution | Founder? |
|---|---|---|---|---|---|---|
| CONF-001 | DOC-12 xlsx vs source workbook | DOC-12 (8 sheets, 31,636 rows) vs Weekly_Class_Plan_v3 (20,664) | DOC-12 matrix spec has a different row total/normalization than the canonical weekly plan | MEDIUM | Reconcile in Phase 3: confirm DOC-12 is long-format/multi-sheet superset; Tier-1 Weekly_Class_Plan_v3 (20,664) governs DB seed | NO |
| CONF-002 | DOC-07 xlsx vs source workbook | DOC-07 sheets sum 1,339 vs Class_Dish_Options_v3 (1,050) | DOC-07 bundles Class_Dish_Options + Addon_Dish_Options + lookups in one file; per-sheet must be compared, not summed | LOW | Compare DOC-07.Class_Dish_Options_v3 sheet (expect 1,050) in Phase 3; not a true conflict | NO |
| CONF-003 | filename vs DOC-00 numbering | folder DOC-NN vs DOC-00 map | DOC ordering in folders is by topic not strict numeric (e.g. DOC-16/17 under 02_Cohorts, DOC-12 under 06_Planning) | LOW | Index-only (Tier 3); filenames + content are authoritative; no action | NO |
| CONF-004 | DOC-01 | '...03 Meal Class...' | DOCX claims 03 meal class; Tier-1 workbook = 131 | LOW | Verify wording context (may be illustrative); Tier-1 governs | NO |

**4 entries.** No Tier-1-vs-Tier-2 hard data conflict found that changes canonical counts; structural reconciliations (DOC-12/DOC-07 normalization) deferred to Phase 3 DB parity. If the numeric-claim scan produced only illustrative-number hits, that is expected (prose examples).