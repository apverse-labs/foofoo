# BUILD-06 / 09 / 10 — DEFERRALS (cannot fix by fabrication)

These items are intentionally **not** "fixed" with code, because doing so would either fabricate
canonical data (forbidden by the module rules + DOC-27 governance) or ship unverifiable UI. Each
entry states the **right step** instead.

## BUILD-06 — Food DNA dish tagging (`food_dna_match`, `cook_fit`)
**Why not fixable now:** the v3 source workbook has **no per-dish Food DNA** (DOC-08 is a *tagging
specification*, not data). `re_class_dish_options` carries only `dish_name` + `diet_type` +
`region_relevance` — no spice/texture/heaviness/richness/cooking-method, and no ingredient linkage.
DOC-27 §6 explicitly requires **human-reviewed subjective tags** through the Admin CMS + governance.
Inventing these values would violate "do not invent canonical data" and DOC-27/DOC-28 governance.

**Right step (governed, not code-conjurable):**
1. Stand up the DOC-27 tagging workflow: add dish → auto-derive deterministic tags *from ingredient
   data* → AI suggests subjective tags → **human review** → QA → publish via `re_taxonomy_releases`.
2. Requires upstream: an ingredient↔dish linkage for RE dishes (today they are name-only).
3. Only after tags exist can `computeDishScore` add the `food_dna_match` (−0.10..+0.30) and `cook_fit`
   (−0.20..+0.10) terms. Faithful to v3 to omit until then — the scoring formula already leaves the slots open.

## BUILD-06 — allergy hard-filter on RE dishes
Same root cause: RE dishes have no ingredient IDs, so `excluded_ingredients` can't be matched against
them. Right step = ingredient linkage data build, then a hard filter in `expandClassToDishes`.
(Onboarding *capture* of allergies is fixed in BUILD-02; the *filter* needs the data.)

## BUILD-09 — Admin CMS UI screens
Repository logic + governance semver + QA checks exist and are tested (PACK 9). The UI is a large
admin surface that can't be runtime-verified in this environment. Right step = build screens against
the existing `re-admin.repository.ts` / `re-governance.service.ts` API in an Expo session where they
can be visually verified. Deferred, not broken.

## BUILD-10 — analytics dashboards
Metrics functions (`re-analytics.repository.ts`) exist + tested. Dashboards are UI; same rationale as
BUILD-09. Golden-household **logic** tests are delivered (`golden-households.test.ts`); full DB-backed
end-to-end golden runs need CI staging secrets.

## BUILD-02 — RN screen wiring
Capture functions are built + tested; wiring the 5 screens to call them needs the Expo app to verify
visually (HTML proposal is the spec). Deferred as UI build.
