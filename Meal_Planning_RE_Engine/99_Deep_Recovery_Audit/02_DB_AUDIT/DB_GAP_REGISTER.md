# DB_GAP_REGISTER

> Gaps between `foofoo-staging` and Tier-1/Tier-2 canonical sources. Severity: BLOCKER / HIGH / MEDIUM / LOW / NONE.

| Gap ID | Source ref | DB table/col | Expected | Actual | Severity | Build | Recommended fix |
|---|---|---|---|---|---|---|---|
| DBG-001 | DOC-12 matrix workbook | re_weekly_class_plans | cell-level parity vs DOC-12 31,636-row layout | counts match Tier-1 Weekly_Class_Plan_v3 (20,664); DOC-12 not cell-diffed | LOW | 04 | Follow-up: cell-diff DOC-12 (de-normalized) → 20,664 to confirm class assignments per cohort/day/slot. Not a blocker — Tier-1 governs. |
| DBG-002 | n/a (lifecycle) | re_user_* (7 tables) | populated after onboarding | empty (no staging users) | NONE | 02/04/05/07 | Expected pre-launch; will populate at first onboarding. No action. |
| DBG-003 | DOC-08 Food DNA | (no per-dish DNA columns) | per-dish Food DNA tags | not seeded (DOC-08 is a spec, workbook has no per-dish DNA) | LOW | 06 | Forward build: dish-tagging data pipeline before food_dna_match scoring. Faithful to v3 to omit. |

## Verdict
**No BLOCKER or HIGH DB gaps.** Seed parity is exact (counts + ID sets + integrity). The three entries are: one LOW follow-up verification (DOC-12 cell-diff), one expected-empty lifecycle note, and one known forward build (Food DNA tagging) already in the PACK backlog.

## Cross-reference (added 2026-06-17)
- `foofoo-tests/reports/md/re-schema-registry.md` — root-level mirror of `SYSTEM_STATE.md`'s RE schema entries (SCHEMA-RE-001 through SCHEMA-RE-016); use that doc for migration-by-migration apply status, this register for source-vs-DB parity gaps.
- `foofoo-tests/reports/md/rls-audit.md` § "apverse-labs-re Scope" — root RLS audit explicitly excludes the `re_*` tables covered by this DB audit; SCHEMA-RE-006 (RLS policy fix for 16 RE tables) is tracked in `SYSTEM_STATE.md`, not in either RLS doc tree directly.
- `foofoo-tests/reports/md/dependency-audit.md` § "apverse-labs-re Scope" — no RE-specific dependency surface exists yet since `00_Implementation` has no shipped source.
