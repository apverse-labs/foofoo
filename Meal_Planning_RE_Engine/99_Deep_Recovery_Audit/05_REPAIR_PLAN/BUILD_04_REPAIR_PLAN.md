# BUILD_04_REPAIR_PLAN — Weekly class-first plan

**Source to re-read before any repair:** DOC-12/13/14/15/16 (+ workbook), `CANONICAL_REQUIREMENTS_LEDGER`, `CANONICAL_ALGORITHM_LEDGER`, traceability matrix.

**Plan:** MINOR (LOW, P2): consume city-overlay weights (55/30/15) from re_city_migration_overlays at class selection; current code sets only city_overlay_applied flag. Verification: DOC-12 cell-diff. Core class-first plan correct.

**DB changes:** additive migration only if needed (Up+Down, register in SYSTEM_STATE).
**Tests:** add/extend tests per DOC-25; golden households in Phase 8.
**No-go:** staging only; additive only; no production; one build per pass.
**Acceptance:** matches canonical source for this build; parity invariants hold; tests green.
**Rollback:** Down migration + git revert of the build's commit.
**Expected final status:** PASS (parity) once P1/P2/P3 items delivered; currently PARTIAL (backlog).
