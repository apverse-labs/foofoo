# BUILD_02_REPAIR_PLAN — Onboarding & household profile

**Source to re-read before any repair:** DOC-03/04/10/11/16/17/18/20 (+ workbook), `CANONICAL_REQUIREMENTS_LEDGER`, `CANONICAL_ALGORITHM_LEDGER`, traceability matrix.

**Plan:** REPAIR (MEDIUM, P1): build 5 capture UIs — allergy screen (excluded_ingredients int IDs), class-swipe step writing class_affinity_vector, multi-member loop (member_segments[]), weekday_time_pressure, fasting_pattern+egg_allowed. Persist onboarding_step (resume). Decide canonical flow (flip EXPO_PUBLIC_RE_ONBOARDING_ENABLED). Schema already complete (RE-008).

**DB changes:** additive migration only if needed (Up+Down, register in SYSTEM_STATE).
**Tests:** add/extend tests per DOC-25; golden households in Phase 8.
**No-go:** staging only; additive only; no production; one build per pass.
**Acceptance:** matches canonical source for this build; parity invariants hold; tests green.
**Rollback:** Down migration + git revert of the build's commit.
**Expected final status:** PASS (parity) once P1/P2/P3 items delivered; currently PARTIAL (backlog).
