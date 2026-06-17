# TEST_COVERAGE_AUDIT

> Tests vs canonical QA (DOC-25) and V3 parity. Pure-logic vs DB-integration distinction is critical.

## Suites
- `foofoo-tests/unit/**` — **16 suites, 361 tests, all passing.** Pure-logic (scoring, diet filter, region affinity, class affinity, cohort resolution helpers, feedback math, resolver, governance semver, admin QA helpers).
- `foofoo-tests/integration/**` + `00_Implementation/__tests__/build01..03/**` — DB-integration (row counts, ID existence, RLS). **Require `SUPABASE_STAGING_ANON_KEY`/service creds**; in a sandbox without secrets they report "Received: 0" (no DB reachable). Their asserted data is independently verified via Supabase MCP in Phase 3 (exact parity).

## DOC-25 coverage map

| QA concern (DOC-25) | Covered by | Status |
|---|---|---|
| canonical seed counts/IDs | build01 seed_validation + Phase-3 MCP | ✅ (MCP-verified) |
| class-first planning | re-plan unit + DB invariant | ✅ |
| add-on separation (0 leaks) | DB invariant (Phase 3) | ✅ |
| dish-class isolation (no cross-class) | re-dish-expander unit + DB (0 multi-class) | ✅ |
| hard constraints before scoring | re-dish-expander unit | ✅ |
| state/city overlay separation | re-cohort-resolver unit | ✅ |
| non-veg cadence | seed (re_nonveg_logic) + nonveg slot | 🟨 data present; end-to-end golden test pending |
| health/lifecycle overlays | re-cohort-resolver overlay tests | ✅ |
| cook dependency | overlay persona tests | 🟨 capture ok; dish-complexity effect = backlog |
| Food DNA scoring | — | 🟨 N/A (no v3 dish DNA) |
| API response shape | re-engine-resolver + interface | ✅ |
| RE versioning | re-engine-resolver (8) | ✅ |
| feedback learning (class+dish) | re-feedback (19) + class-affinity tests | ✅ |
| golden households end-to-end | — | ❌ not yet (Phase 8 deliverable) |
| wrong-pattern negative tests | partial (asserted via invariants) | 🟨 |

## Gaps
1. **Golden-household end-to-end tests** (15 profiles, DOC-25 Synthetic_Test_Cases) — not implemented; this is the Phase 8 capstone.
2. **Non-veg cadence + cook-complexity** end-to-end assertions — backlog.
3. **Integration tests can't self-verify in sandbox** — need CI staging secrets; data is MCP-verified meanwhile.

No falsely-passing logic test detected (unit tests use canonical IDs/fixtures, not invented data).
