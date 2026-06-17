# BUILD_05_REPAIR_PLAN — Member add-on engine

**Source to re-read before any repair:** DOC-04/06 (+ workbook), `CANONICAL_REQUIREMENTS_LEDGER`, `CANONICAL_ALGORITHM_LEDGER`, traceability matrix.

**Plan:** NO REPAIR — 0 leaks, separate table, attached_to_primary_class. Verify multi-member end-to-end once BUILD-02 multi-member capture lands.

**DB changes:** additive migration only if needed (Up+Down, register in SYSTEM_STATE).
**Tests:** add/extend tests per DOC-25; golden households in Phase 8.
**No-go:** staging only; additive only; no production; one build per pass.
**Acceptance:** matches canonical source for this build; parity invariants hold; tests green.
**Rollback:** Down migration + git revert of the build's commit.
**Expected final status:** PASS (parity) once P1/P2/P3 items delivered; currently NO-REPAIR PASS.
