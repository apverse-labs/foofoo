# BUILD_06_REPAIR_PLAN — Dish expansion + Food DNA

**Source to re-read before any repair:** DOC-07/08/19 (+ workbook), `CANONICAL_REQUIREMENTS_LEDGER`, `CANONICAL_ALGORITHM_LEDGER`, traceability matrix.

**Plan:** FORWARD BUILD (LOW, P3): Food DNA dish-tagging pipeline to enable food_dna_match + cook_fit; allergy hard-filter needs ingredient linkage. Core class→dish + hard filters + region/history/variety/class-affinity scoring correct.

**DB changes:** additive migration only if needed (Up+Down, register in SYSTEM_STATE).
**Tests:** add/extend tests per DOC-25; golden households in Phase 8.
**No-go:** staging only; additive only; no production; one build per pass.
**Acceptance:** matches canonical source for this build; parity invariants hold; tests green.
**Rollback:** Down migration + git revert of the build's commit.
**Expected final status:** PASS (parity) once P1/P2/P3 items delivered; currently PARTIAL (backlog).
