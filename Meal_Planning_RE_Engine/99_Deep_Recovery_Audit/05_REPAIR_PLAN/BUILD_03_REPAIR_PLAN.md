# BUILD_03_REPAIR_PLAN — Cohort/persona assignment

**Source to re-read before any repair:** DOC-03/09/11/15 (+ workbook), `CANONICAL_REQUIREMENTS_LEDGER`, `CANONICAL_ALGORITHM_LEDGER`, traceability matrix.

**Plan:** NO REPAIR — table-driven, overlays+confidence+routing_trace present (RE-009). Verify golden assignments in Phase 8.

**DB changes:** additive migration only if needed (Up+Down, register in SYSTEM_STATE).
**Tests:** add/extend tests per DOC-25; golden households in Phase 8.
**No-go:** staging only; additive only; no production; one build per pass.
**Acceptance:** matches canonical source for this build; parity invariants hold; tests green.
**Rollback:** Down migration + git revert of the build's commit.
**Expected final status:** PASS (parity) once P1/P2/P3 items delivered; currently NO-REPAIR PASS.
