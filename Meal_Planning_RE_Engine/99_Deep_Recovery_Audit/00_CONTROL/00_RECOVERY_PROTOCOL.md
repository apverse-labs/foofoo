# 00 — RECOVERY PROTOCOL

> Process: **Deep Recovery & Parity Audit** for the FooFoo Meal Planning RE Engine.
> Created: 2026-06-14 · Branch: `apverse-labs-RE` · DB target: `foofoo-staging` (kwypxyqxojauhiehuirz)
> Supersedes the PACK 0–10 validation campaign (`00_Implementation/RE_VALIDATION_LOG.md`) as the authoritative parity process.

---

## 1. North star — `V3_EXCEL_FULL_PARITY`

The implemented **code + Supabase `foofoo-staging` DB + tests + API behaviour + seed data + recommendation outputs** must match the **full v3 Excel / source-data logic** and the 28 canonical technical documents — not just the Markdown summaries.

`V3_EXCEL_FULL_PARITY` ≠ `RE_V3` cluster-seeded engine. This is parity with the **version-3 Excel/source-data architecture**, which the current cold-start engine must faithfully reproduce. RE_V3 (clustering) is a later engine version.

## 2. Why MD files are insufficient

Markdown files (`DOC-00`, `README`, `DOC-24`, module `*.md`) are **navigation / index / context only**. The authoritative implementation detail lives inside the binary `.docx`/`.xlsx` documents and the canonical source workbook — including tables, remarks/comments columns, Excel cell comments, formulas, hidden sheets/rows/columns, named ranges, data validations, and merged cells. A prior audit risk was over-reliance on the readable `.md` files; this protocol forbids that.

## 3. Requirement to read the actual binary sources

Every `.docx` and `.xlsx` must be **mechanically extracted** (scripts under `tools/`) into persisted artifacts under `01_SOURCE_EXTRACTION/`. No file may be claimed "read" unless it appears in `SOURCE_READ_PROOF.md` with extraction counts. If a binary cannot be read directly, write/adjust a script — never pretend.

## 4. Source-of-truth hierarchy

See `01_SOURCE_OF_TRUTH_HIERARCHY.md`. Summary, highest first:
1. `Indian_Meal_Cohort_Persona_DB_v3.xlsx` — canonical IDs & data.
2. Canonical `.docx`/`.xlsx` documents — rules, semantics, algorithms, scoring, API, QA, governance.
3. MD files — index/guide only.
4. Code & DB — implementation artifacts; corrected if they conflict with 1–2.
5. Excel-vs-document conflicts → log in `CANONICAL_CONFLICT_REGISTER.md` with evidence; resolve only if hierarchy is unambiguous, else escalate.

## 5. Audit-before-repair rule

No code or DB change until Phases 0–6 are complete **and** the founder approves at gate **G6**. Phases 0–5 are strictly read-only.

## 6. Staging-only DB rule

All DB inspection and (later) repair targets `foofoo-staging` only. Production (`foofoo-mvp` / ufgfznpqixplcbhmsqqw) is never touched.

## 7. No destructive-migration rule

Repairs (Phase 7) use **additive, idempotent** migrations only — no DROP/RENAME/destructive ALTER of existing tables/columns; every migration ships Up+Down and is registered in `SYSTEM_STATE.md` before apply.

## 8. Build-by-build repair sequence

Repairs run **one build at a time** (BUILD-01 → BUILD-10), each with its own repair plan + log, never combined.

## 9. Required evidence format

Every claim/finding/correction must carry source references:
- DOCX: file path + heading/table/paragraph ref.
- XLSX / source workbook: file path + sheet + row/column/cell range (+ formula/comment if any).
- Code: file path + function/class.
- DB: table/column + row count.

## 10. Definition of "source-read proof"

A file is "read" iff `SOURCE_READ_PROOF.md` lists it with: extraction output path, method, counts of paragraphs/tables/sheets/rows, comments/notes count, and any limitation. Absence from the proof table = not read.

## 11. Definition of "parity pass"

For a given entity/requirement: the DB/code/test state matches the canonical source (IDs, counts, rules, algorithm, output shape) with **zero unexplained gaps**; any deliberate divergence is documented with source justification.

## 12. Definition of "parity fail"

Any of: missing/extra canonical IDs; row-count mismatch without documented exclusion; orphan/non-canonical references; wrong architecture (e.g. dish-before-class, add-on-as-primary, merged home_state/current_city); a documented rule not implemented; an output-contract field missing; a golden household producing a non-conforming result.
