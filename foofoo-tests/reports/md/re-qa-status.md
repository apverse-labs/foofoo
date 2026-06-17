# RE QA Status Dashboard

> Last updated: 2026-06-14  
> Branch: `apverse-labs-RE`  
> CI Workflow: `.github/workflows/re-qa.yml`  
> Supabase staging: `kwypxyqxojauhiehuirz` | MVP prod: `ufgfznpqixplcbhmsqqw`

---

## GitHub Actions — Job Status (Run #4, latest)

| Job | Name | DB Target | Status |
|-----|------|-----------|--------|
| `unit` | Unit — RE pure functions | none (pure) | ✅ Green |
| `schema` | Schema + Seed — RE staging | RE staging | ✅ Green |
| `schema-mvp` | Schema — MVP production | MVP prod | ✅ Green |
| `personas` | Personas — 50 users, 0 violations gate | RE staging | ✅ Green |
| `security` | Security + DPDP — RE + MVP | RE staging + MVP prod | ✅ Green |
| `constraint-gate` | Hard Constraint Gate (merge block) | RE staging | ✅ Green |

---

## CI Run History Summary

| Run | Trigger | Branch | Overall | Notes |
|-----|---------|--------|---------|-------|
| #1 | push | apverse-labs-RE | — | Baseline run; initial suite scaffold |
| #2 | push | apverse-labs-RE | — | RE schema/seed jobs added |
| #3 | push | apverse-labs-RE | — | Security + DPDP jobs added |
| #4 | push | apverse-labs-RE | ✅ All 6 green | All layers passing |

> Run #1–3 result details not retrieved from GitHub Actions API; status marked `—` (pending manual verification).

---

## Test File Inventory

### Layer 1 — Unit Tests (no DB)

| File | Scope | Test Count | CI Job | Status |
|------|-------|-----------|--------|--------|
| `unit/re-addon.test.ts` | Add-on selection logic | ~8 | `unit` | ✅ Green (Run #4) |
| `unit/re-admin.test.ts` | Admin/governance helpers | ~17 | `unit` | ✅ Green (Run #4) |
| `unit/re-analytics.test.ts` | Analytics scoring helpers | ~13 | `unit` | ✅ Green (Run #4) |
| `unit/re-dish-expander.test.ts` | Dish expansion / slot fill | ~45 | `unit` | ✅ Green (Run #4) |
| `unit/re-engine-resolver.test.ts` | Engine version resolver | ~7 | `unit` | ✅ Green (Run #4) |
| `unit/re-feedback.test.ts` | Feedback signal processing | ~19 | `unit` | ✅ Green (Run #4) |
| `unit/re-governance.test.ts` | Taxonomy governance rules | ~14 | `unit` | ✅ Green (Run #4) |
| `unit/re-plan.test.ts` | Weekly plan builder | ~11 | `unit` | ✅ Green (Run #4) |
| `unit/re-scoring.test.ts` | Dish scoring engine | ~45 | `unit` | ✅ Green (Run #4) |

> Test counts are approximate (`it`/`test` keyword occurrences; nested describes may inflate raw count).

### Layer 1 — Unit Tests (MVP, non-RE)

| File | Scope | Test Count | CI Job | Status |
|------|-------|-----------|--------|--------|
| `unit/auto-derivation.test.ts` | Auto-derivation logic | ~14 | _(not in re-qa.yml)_ | Not in RE CI |
| `unit/bucket-logic.test.ts` | Bucketing logic | ~9 | _(not in re-qa.yml)_ | Not in RE CI |
| `unit/hard-constraints.test.ts` | Hard constraint enforcement | ~20 | _(not in re-qa.yml)_ | Not in RE CI |
| `unit/variety-guard.test.ts` | Variety enforcement | ~13 | _(not in re-qa.yml)_ | Not in RE CI |

### Layer 2 — Schema + Seed Integrity (RE staging)

| File | Scope | Test Count | CI Job | Status |
|------|-------|-----------|--------|--------|
| `integration/re-schema-validation.test.ts` | 24 RE tables + RLS policies | ~6 | `schema` | ✅ Green (Run #4) |
| `integration/re-seed-integrity.test.ts` | Row counts + FK integrity | ~8 | `schema` | ✅ Green (Run #4) |

### Layer 2 — Schema (MVP prod)

| File | Scope | Test Count | CI Job | Status |
|------|-------|-----------|--------|--------|
| `integration/schema-validation.test.ts` | 41 MVP tables | ~13 | `schema-mvp` | ✅ Green (Run #4) |

### Layer 3 — Persona Journeys

| File | Scope | Test Count | CI Job | Status |
|------|-------|-----------|--------|--------|
| `integration/re-persona-journey.test.ts` | 50-persona E2E journeys, hard constraint gate | ~4 | `personas` + `constraint-gate` | ✅ Green (Run #4) |
| `integration/re-module-integration.test.ts` | Full RE module integration | ~9 | `personas` | ✅ Green (Run #4) |
| `personas/re-persona-definitions.ts` | 50 persona fixtures | definitions only | — | Source file |
| `personas/re-persona-runner.ts` | Persona execution harness | runner only | — | Source file |

### Layer 4 — Edge Functions

| File | Scope | Test Count | CI Job | Status |
|------|-------|-----------|--------|--------|
| `integration/edge-functions.test.ts` | Edge function invocations | ~11 | _(not in re-qa.yml)_ | Not wired into RE CI |

### Layer 5 — Security + DPDP

| File | Scope | Test Count | CI Job | Status |
|------|-------|-----------|--------|--------|
| `integration/re-rls-security.test.ts` | RE cross-user RLS isolation | ~2 | `security` | ✅ Green (Run #4) |
| `integration/re-dpdp-compliance.test.ts` | RE DPDP data handling | ~1 | `security` | ✅ Green (Run #4) |
| `integration/rls-security.test.ts` | MVP RLS security | ~10 | `security` | ✅ Green (Run #4) |
| `integration/dpdp-compliance.test.ts` | MVP DPDP compliance | ~7 | `security` | ✅ Green (Run #4) |

### Other Integration Tests

| File | Scope | Test Count | CI Job | Notes |
|------|-------|-----------|--------|-------|
| `integration/combo-architecture.test.ts` | Combo plan architecture | ~6 | _(not in re-qa.yml)_ | Not wired into RE CI |

---

## Known Gaps / Deferred Items

| ID | Gap | Layer | Priority |
|----|-----|-------|----------|
| GAP-001 | `integration/edge-functions.test.ts` not wired into `re-qa.yml` | Layer 4 | Medium |
| GAP-002 | `integration/combo-architecture.test.ts` not wired into `re-qa.yml` | Integration | Low |
| GAP-003 | MVP unit tests (`auto-derivation`, `bucket-logic`, `hard-constraints`, `variety-guard`) not in RE CI scope | Layer 1 | Low (MVP scope) |
| GAP-004 | CI run #1–3 historical pass/fail detail not captured | CI history | Low |
| GAP-005 | `re-rls-security` and `re-dpdp-compliance` have very low `it`-block counts (2 and 1) — likely use nested loops; actual assertion count higher than file-level count suggests | Layer 5 | Review |
| GAP-006 | No Layer 4 (RE edge function) job in `re-qa.yml` — edge function tests run on ad-hoc basis only | Layer 4 | Medium |
