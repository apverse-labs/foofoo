#!/usr/bin/env python3
"""Phase 6 — master + per-build repair plans (no code)."""
import os
OUT = "/home/user/foofoo/Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/05_REPAIR_PLAN"
os.makedirs(OUT, exist_ok=True)

MASTER = """# MASTER_REPAIR_PLAN

> Derived from Phases 0–5. Repairs run one build at a time, additive-only, staging-only, **after founder approval at G6**.

## Headline
The strict re-audit confirms **V3_EXCEL_FULL_PARITY at the data + architecture level**:
exact seed parity (counts + ID sets), 0 integrity violations, 0 wrong-architecture patterns.
**No BLOCKER / HIGH repair exists.** The repair backlog is dominated by one MEDIUM (BUILD-02
onboarding capture UIs) and LOW forward builds (Food DNA tagging, dashboards, CMS UI, golden e2e tests).

## Priority order
| Priority | Build | Item | Severity | Type |
|---|---|---|---|---|
| P1 | BUILD-02 | 5 onboarding capture UIs (allergy, class-swipe→class_affinity_vector, multi-member loop, weekday_time_pressure, fasting_pattern+egg_allowed) + onboarding_step resume + canonical-flow decision | MEDIUM | UI build |
| P2 | BUILD-04 | city-overlay weight blending (55/30/15) consumed in plan generation | LOW | algorithm |
| P2 | BUILD-01/04 | DOC-12 (31,636-row) cell-diff vs Weekly_Class_Plan_v3 (verification) | LOW | verification |
| P3 | BUILD-06 | Food DNA dish tagging pipeline → enable food_dna_match + cook_fit scoring | LOW | data+algorithm |
| P3 | BUILD-06 | allergy hard-filter on RE dishes (needs ingredient linkage) | LOW | data |
| P3 | BUILD-09 | Admin CMS UI screens | LOW | UI |
| P3 | BUILD-10 | analytics dashboards + 15 golden-household e2e tests | LOW | UI+test |

## No-repair builds (parity already exact)
BUILD-01 (seed), BUILD-03 (assignment), BUILD-05 (add-on), BUILD-07 (feedback), BUILD-08 (API) — **no repair needed**; verification only.

## Global no-go rules
Additive migrations only (Up+Down, registered in SYSTEM_STATE before apply); staging only; no production;
do not modify canonical workbook; one build per repair pass; re-read source per build before coding.
"""
open(os.path.join(OUT, "MASTER_REPAIR_PLAN.md"), "w").write(MASTER)

BUILDS = {
 1: ("Data model & seed import", "NO REPAIR — exact parity (counts+IDs+integrity, Phase 3). Verification only: re-run seed_validation in CI with staging creds.", "DOC-02/05/07/08/12/22 + workbook"),
 2: ("Onboarding & household profile", "REPAIR (MEDIUM, P1): build 5 capture UIs — allergy screen (excluded_ingredients int IDs), class-swipe step writing class_affinity_vector, multi-member loop (member_segments[]), weekday_time_pressure, fasting_pattern+egg_allowed. Persist onboarding_step (resume). Decide canonical flow (flip EXPO_PUBLIC_RE_ONBOARDING_ENABLED). Schema already complete (RE-008).", "DOC-03/04/10/11/16/17/18/20"),
 3: ("Cohort/persona assignment", "NO REPAIR — table-driven, overlays+confidence+routing_trace present (RE-009). Verify golden assignments in Phase 8.", "DOC-03/09/11/15"),
 4: ("Weekly class-first plan", "MINOR (LOW, P2): consume city-overlay weights (55/30/15) from re_city_migration_overlays at class selection; current code sets only city_overlay_applied flag. Verification: DOC-12 cell-diff. Core class-first plan correct.", "DOC-12/13/14/15/16"),
 5: ("Member add-on engine", "NO REPAIR — 0 leaks, separate table, attached_to_primary_class. Verify multi-member end-to-end once BUILD-02 multi-member capture lands.", "DOC-04/06"),
 6: ("Dish expansion + Food DNA", "FORWARD BUILD (LOW, P3): Food DNA dish-tagging pipeline to enable food_dna_match + cook_fit; allergy hard-filter needs ingredient linkage. Core class→dish + hard filters + region/history/variety/class-affinity scoring correct.", "DOC-07/08/19"),
 7: ("Feedback learning loop", "NO REPAIR — class+dish affinity, Never/Not-Today, class loop closed (PACK 7). Backlog: repeat-tolerance/drift vectors (V2+).", "DOC-19/21"),
 8: ("API & app integration", "NO REPAIR — resolver boundary enforced (PACK 8). Backlog: DOC-23 structured validation error codes if a REST gateway is added.", "DOC-23"),
 9: ("Admin/data operations", "FORWARD BUILD (LOW, P3): Admin CMS UI screens. QA-check logic + governance semver present; column bugs fixed (PACK 9).", "DOC-22/27/28"),
 10:("Analytics/experimentation/governance", "FORWARD BUILD (LOW, P3): analytics dashboards + 15 golden-household e2e tests (Phase 8). Metrics + version attribution present.", "DOC-25/26/28"),
}
for n,(name,plan,src) in BUILDS.items():
    txt = f"""# BUILD_{n:02d}_REPAIR_PLAN — {name}

**Source to re-read before any repair:** {src} (+ workbook), `CANONICAL_REQUIREMENTS_LEDGER`, `CANONICAL_ALGORITHM_LEDGER`, traceability matrix.

**Plan:** {plan}

**DB changes:** {'additive migration only if needed (Up+Down, register in SYSTEM_STATE)' if 'FORWARD' in plan or 'REPAIR' in plan or 'MINOR' in plan else 'none'}.
**Tests:** add/extend tests per DOC-25; golden households in Phase 8.
**No-go:** staging only; additive only; no production; one build per pass.
**Acceptance:** matches canonical source for this build; parity invariants hold; tests green.
**Rollback:** Down migration + git revert of the build's commit.
**Expected final status:** PASS (parity) once P1/P2/P3 items delivered; currently {'NO-REPAIR PASS' if 'NO REPAIR' in plan else 'PARTIAL (backlog)'}.
"""
    open(os.path.join(OUT, f"BUILD_{n:02d}_REPAIR_PLAN.md"), "w").write(txt)
print("wrote MASTER + BUILD_01..10 repair plans")
