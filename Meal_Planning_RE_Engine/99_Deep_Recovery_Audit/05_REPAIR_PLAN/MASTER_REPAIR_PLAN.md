# MASTER_REPAIR_PLAN

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
