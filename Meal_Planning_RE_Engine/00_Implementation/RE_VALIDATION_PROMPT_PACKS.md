# RE Validation Prompt Packs — Build-by-Build Spec Conformance Campaign

> **Purpose.** Drive a Claude Code session, build by build (BUILD-00 → BUILD-10), to
> (1) READ every governing document — **both** the binary `.docx`/`.xlsx` specs **and**
> the `.md` files, strictly both — (2) validate the live code and Supabase schema against
> that spec, and (3) correct any drift. **North Star:** the running code + DB must reproduce
> the exact recommendation science encoded in `Indian_Meal_Cohort_Persona_DB_v3.xlsx`
> (41 personas → 131 meal classes → 2,952 cohorts → 20,664 weekly class rows →
> 1,050 class-dish options → 24 add-on classes → 7,992 add-on-plan rows).
>
> **Branch discipline (non-negotiable).** All work on `apverse-labs-RE`. NEVER push to
> `main` or `develop`. Every code/DB change ships with Up+Down migration scripts and a
> `SYSTEM_STATE.md` Schema Registry entry. No production deploy without explicit approval.

---

## WHY THIS CAMPAIGN EXISTS (read first)

A prior session built BUILD-01…BUILD-10 **without ever reading the binary documents.**
The GitHub MCP `get_file_contents` tool returns `.docx`/`.xlsx` as opaque binary blobs, so
the agent silently fell back to the four `.md` files (DOC-00, DOC-24, README, PACKAGE_MANIFEST)
and **invented** the rest of the architecture from those summaries. Known symptoms:

- Two parallel onboarding flows exist (`app/(onboarding)/step-*` legacy + `app/(re-onboarding)/re-step-*`) and it is unclear which is spec-compliant.
- No `00_Implementation/versions/RE_V1/` engine folder, despite the spec mandating a versioned class-first engine behind a stable interface.
- The MVP edge functions (`generate-daily-plan`, etc.) do **dish-first** scoring, which directly violates the #1 invariant: *generate meal classes first, expand to dishes second.*

This campaign exists to close that gap permanently.

---

## BOOTSTRAP — make Claude Code able to read the binaries (paste at the start of EVERY pack)

```
You are validating the FooFoo Meal Planning RE module on branch apverse-labs-RE.

CRITICAL READING RULE: The technical docs are .docx and .xlsx binaries. You CANNOT read
them via the GitHub MCP get_file_contents tool — it returns binary. You MUST extract their
text locally. For any document DOC-NN you reference, run this first and read the output:

  # one-time: ensure extractor deps
  pip install openpyxl -q

  # .docx → text
  python3 - <<'PY'
  import zipfile
  from xml.etree import ElementTree as ET
  W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
  def docx(p):
      z=zipfile.ZipFile(p); root=ET.parse(z.open('word/document.xml')).getroot()
      for para in root.iter(W+'p'):
          line=''.join(t.text or '' for t in para.iter(W+'t')).strip()
          if line: print(line)
  docx('PATH/TO/DOC-NN.docx')
  PY

  # .xlsx → tab-separated text, all sheets (use openpyxl, NOT raw xml — formulas/shared strings)
  python3 - <<'PY'
  import openpyxl
  wb=openpyxl.load_workbook('PATH/TO/DOC-NN.xlsx', read_only=True, data_only=True)
  for s in wb.sheetnames:
      print(f"\n=== SHEET: {s} ===")
      for row in wb[s].iter_rows(values_only=True):
          vals=[str(v) for v in row if v is not None]
          if vals: print('\t'.join(vals))
  PY

To get the files locally without polluting the tree, extract from git:
  git show apverse-labs-RE:"Meal_Planning_RE_Engine/Meal_Planning_RE_Technical_Docs_v1/<path>" > /tmp/DOC-NN.<ext>

RULE 6 (GitHub is ground truth): verify branch/file existence via git on the
apverse-labs-RE ref or GitHub MCP — never assume from a possibly-stale local checkout.

DUAL-SOURCE RULE: For each build you MUST read BOTH the binary spec docs AND the
matching .md files (DOC-00 master map, DOC-24 prompt pack, BUILD-NN_*.md plan,
IMPLEMENTATION_BUILD_TRACKER.md). If the .md and the binary disagree, the binary
spec + v3 workbook WIN, and you must flag the .md as drift to be corrected.

OUTPUT CONTRACT for every pack — produce exactly these sections:
  1. Documents actually read (path + sheet/section names + 1-line proof of content)
  2. Spec model (the rules/IDs/tables this build must honor, in your words)
  3. Code findings (file:line — compliant / drift / missing)
  4. DB findings (table/column/constraint — compliant / drift / missing, via supabase MCP list_tables)
  5. v3-science trace (show one concrete worked example flowing through this build's logic)
  6. Corrections made (diffs) + migrations (Up+Down) + SYSTEM_STATE.md registry entry
  7. Exit-criteria checklist (pass/fail per item)
  8. Open questions for the founder (only true blockers)

Do NOT mark a build "validated" unless every exit-criteria item passes or is explicitly
waived by the founder. Stop and ask if a fix requires schema-destructive change (forbidden;
migrations are additive-only) or touches main/develop.
```

---

## PACK 0 — BUILD-00: Documentation & Source-Data Contract

**Read (binary):** DOC-01 (Blueprint, .docx), DOC-02 (Domain Glossary, .xlsx).
**Read (md):** DOC-00 master map, DOC-24 prompt pack, README walkthrough, PACKAGE_MANIFEST, root `CLAUDE.md`, module `CLAUDE.md`.
**Read (source):** `Indian_Meal_Cohort_Persona_DB_v3.xlsx` — every sheet name + the README sheet's row-count contract.

**Validate:**
- All 28 canonical docs present at the paths DOC-00 lists (use git ls-tree on apverse-labs-RE).
- The v3 workbook row counts match the README sheet: 41 personas / 131 meal classes / 2,952 cohorts / 20,664 weekly rows / 1,050 class dishes / 24 add-on classes / 7,992 add-on rows. Print actuals from openpyxl.
- The 9 non-negotiable invariants from DOC-01 are written verbatim somewhere enforceable (module CLAUDE.md) and not contradicted by code comments.

**Correct:** Fix any doc-map/tracker drift. Do NOT touch the workbook (read-only).

**Exit criteria:**
- [ ] Every DOC-NN file opens and its text is quoted in the report (proof of read).
- [ ] Workbook row counts verified by script, not by trusting the README prose.
- [ ] A glossary of canonical IDs (MC*, SC*, P*, BF_*/LD_*/SN_*/DN_* class codes) is dumped to a scratch file for later packs to diff against.

---

## PACK 1 — BUILD-01: Data Model & Seed Import

**Read (binary):** DOC-05 (Meal Class Taxonomy, .xlsx), DOC-07 (Dish Catalog Class→Dish, .xlsx), DOC-08 (Food DNA Tagging, .xlsx), DOC-22 (DB Schema & Seed Spec, .xlsx).
**Read (md):** `BUILD-01_Data_Model_Seed_Import_Implementation_Plan.md`, `BUILD-01_README.md`, `IMPLEMENTATION_BUILD_TRACKER.md`.
**Read (source workbook sheets):** `Meal_Class_Master_v3`, `Class_Dish_Options_v3`, `Persona_Master_v3`, `State_Profile_v3`, `City_Migration_Overlay_v3`, `Cohort_Matrix_v3`, `Weekly_Class_Plan_v3`, `Addon_Component_Class_Master`, `Addon_Dish_Options`, `Household_Addon_Component_Plan`, `NonVeg_Logic_v3`, `Routing_Rules_v3`, `Meal_Class_Overlap_Resolution`.

**Validate (DB — via supabase MCP `list_tables` on staging `kwypxyqxojauhiehuirz`):**
- Every workbook sheet that is reference data has a matching `re_*` table with the same column semantics as DOC-22.
- Row counts in each `re_*` reference table EQUAL the workbook (run `execute_sql` count). A short table = a broken import = silent recommendation gaps.
- `re_*` tables use canonical IDs from the workbook (no invented IDs). Spot-check 10 persona IDs and 10 class codes against the PACK-0 glossary.
- All 24 RE tables have RLS with ≥1 policy (SCHEMA-RE-006 fixed a blackout; confirm it held).

**Validate (code):** `00_Implementation/seeds/import_workbook.py` is idempotent, maps every sheet, and fails loudly on row-count mismatch.

**v3-science trace:** Pick persona P10 (family with toddler). Show its `bf_boost_classes`/`ld_boost_classes` from `Persona_Master_v3` exist as rows in `re_meal_classes`, and each maps to ≥1 dish in `re_class_dish_options`.

**Exit criteria:**
- [ ] reference-table row counts == workbook for all 13 sheets.
- [ ] zero invented IDs.
- [ ] import script re-runnable without dupes.

---

## PACK 2 — BUILD-02: Onboarding & Household Profile Builder

**Read (binary):** DOC-03 (Cohort Hierarchy/Persona Mapping, .docx), DOC-04 (Household Composition, .docx), DOC-10 (Onboarding Journey, .docx), DOC-11 (Answer→Feature Map, .xlsx), DOC-16 (Cook Capability, .docx), DOC-17 (Health/Fitness Overlays, .docx), DOC-18 (Diet/Religion/Allergy/Fasting, .docx), DOC-20 (Cold-Start Safe Assumptions, .docx).
**Read (md):** `ONBOARDING_FIELD_MAPPING.md`, `BUILD-00B_Existing_Project_Integration_Audit.md`, tracker.
**Read (workbook):** `Main_Cohort_Hierarchy`, `Subcohort_Routing`, `Persona_Master_v3`, `Answer_to_Feature_Map`, `Household_Profile_Schema`.

**FIRST, resolve the two-onboarding confusion:** Determine which flow is canonical —
`app/(onboarding)/step-1..7` (legacy MVP) or `app/(re-onboarding)/re-step-*` (RE). Read
`re-onboarding.repository.ts` + `re-engine.service.ts`. Report which one writes the
DOC-10 output contract fields and which is dead/duplicate. The legacy 7-step flow is known
to capture only ~40% of required signals (no cohort, no household members, dish-level not
class-level swipes, nonveg as a boolean, binary cook role). Decide & document the kill/keep.

**Validate the DOC-10 8-step contract is fully captured** (these fields must land in DB):
`main_cohort_id, sub_cohort_id, base_persona_id, overlay_persona_ids[], home_state,
current_city, city_tier, migration_overlay, diet_mode, nonveg_mode, egg_allowed,
excluded_ingredients[] (integer IDs), fasting_pattern, member_segments[],
cook_capability, weekday_time_pressure, class_affinity_vector`.

**Validate dynamic branching (DOC-10 §6):** kids→age-band; elders→soft/diabetic; couple→no child screens; nonveg→frequency+protein. Linear flow = drift.

**Validate the swipe step:** must swipe on **meal CLASSES** (class codes from `re_meal_classes`), NOT dishes/cuisines. Dish-level swipe = invariant violation; produce a class-affinity vector keyed by `meal_class_code`.

**Correct (with Up+Down migrations):** add missing profile columns + a `household_members` table per DOC-04 §7 data structure. Wire the canonical flow; retire the duplicate behind a feature flag (`RE_ONBOARDING_ENABLED`) — do not delete production code paths abruptly.

**v3-science trace:** Run the DOC-01 worked example — *MP-origin vegetarian family in Mumbai with infant + diabetic elder* — through onboarding and show the produced `onboarding_result` object matches DOC-10 §7 shape exactly.

**Exit criteria:**
- [ ] one canonical onboarding flow; duplicate flagged/retired.
- [ ] all DOC-10 §7 output-contract fields persisted.
- [ ] swipe = class-level.
- [ ] dynamic branching live.
- [ ] cold-start defaults (DOC-20) fire on skip without blocking plan generation.

---

## PACK 3 — BUILD-03: Cohort / Persona Assignment

**Read (binary):** DOC-03, DOC-09 (State/Region/City Migration Overlay, .docx), DOC-11 (.xlsx), DOC-15 (Non-Veg Patterns, .docx), DOC-20.
**Read (md):** tracker; existing `__tests__/build03/re_cohort_resolver.test.ts`.
**Read (workbook):** `Routing_Rules_v3`, `Subcohort_Routing`, `Persona_Master_v3`, `State_Profile_v3`, `City_Migration_Overlay_v3`, `NonVeg_Logic_v3`.

**Validate (code):** the resolver maps onboarding answers → `base_persona_id` + `overlay_persona_ids[]` using `Routing_Rules_v3` (not hand-coded heuristics). Overlapping personas supported (DOC-03 §7). Confidence score emitted (DOC-03 §6 / DOC-20 §7).
**Validate (DB):** `re_user_engine_assignments` (or equivalent) stores base+overlays+confidence with own-row RLS.
**Validate the separation invariant:** `home_state` drives food identity, `current_city` drives the migration overlay 3-weight blend (home/migrant/national). They must NOT be collapsed.

**v3-science trace:** P41 composite (child + diabetic/elderly) — show resolver returns base family persona + child add-on overlay + diabetic overlay, with a confidence value, matching DOC-03 §8 output.

**Exit criteria:**
- [ ] assignment is table-driven from `Routing_Rules_v3`, zero invented mappings.
- [ ] overlays + confidence persisted.
- [ ] state≠city blend verified with a migrant example (MP→Mumbai).

---

## PACK 4 — BUILD-04: Weekly Class-First Plan Engine  ★ core of the science

**Read (binary):** DOC-12 (Cohort→Weekly Class Matrix, .xlsx), DOC-13 (Weekly Plan Generation Algorithm, .docx), DOC-14 (Class Rotation/Variety, .docx), DOC-09, DOC-15, DOC-16, DOC-18.
**Read (md):** tracker, DOC-24 prompt pack section for BUILD-04.
**Read (workbook):** `Cohort_Matrix_v3`, `Weekly_Class_Plan_v3` (the 20,664 rows), `Meal_Class_Overlap_Resolution`, `State_Profile_v3`.

**Validate THE central invariant:** the engine generates a 7-day × meal-slot **class** plan
FIRST, from the cohort matrix + state/city overlay + weekday/weekend rhythm + variety rules
— and only later expands to dishes (that's BUILD-06). If the live home screen pulls dishes
directly (as `generate-daily-plan` MVP edge fn does), that is the headline violation to fix.

**Validate (DB):** `re_user_weekly_plans` columns hold class codes per (day, slot, primary/secondary), not dish IDs.
**Validate weekday/weekend logic (DOC-13/14):** weekday = quick/repeatable/cook-aware; weekend = indulgence/regional/non-veg-special where the persona+state allow.
**Validate variety guard (DOC-14):** no class repeats beyond allowed window; overlap resolution applied so a class never borrows another class's dishes.

**v3-science trace — the 20,664 number:** Pick one persona+state, regenerate its week, and show each of the 21 slots (7×3) resolves to the SAME `primary_class_code` that `Weekly_Class_Plan_v3` has for that persona. This is the literal proof that code == Excel.

**Exit criteria:**
- [ ] plan output is classes, not dishes.
- [ ] a regenerated week matches `Weekly_Class_Plan_v3` for ≥3 distinct personas.
- [ ] weekday/weekend + variety rules demonstrably applied.

---

## PACK 5 — BUILD-05: Member-Specific Add-on Engine

**Read (binary):** DOC-04, DOC-06 (Primary vs Add-on Architecture, .docx), DOC-17.
**Read (workbook):** `Addon_Component_Class_Master` (24 classes), `Addon_Dish_Options`, `Household_Addon_Component_Plan` (7,992 rows).
**Validate:** add-ons attach as separate columns/objects and NEVER replace the family primary meal (unless household is single-segment, e.g. elderly-only). Trigger rules per DOC-04 §6 fire from `member_segments[]`. `re_user_addon_plans` stores per-member, per-slot add-ons with safety constraints applied independently (allergy/diabetic/Jain).
**v3-science trace:** infant + diabetic-elder household — dinner primary stays dal-sabzi-roti; infant gets dal-rice mash add-on; elder gets low-GI side. Matches DOC-04 §9.
**Exit criteria:** [ ] zero add-on-replaces-primary cases; [ ] 7,992-row plan reproduced for sampled households; [ ] member safety constraints enforced.

---

## PACK 6 — BUILD-06: Dish Expansion & Food DNA Ranking

**Read (binary):** DOC-07, DOC-08, DOC-18, DOC-19 (RE Scoring Rules, .docx).
**Read (workbook):** `Class_Dish_Options_v3` (1,050), Food DNA sheet, `NonVeg_Logic_v3`.
**Validate the #2/#3 invariants:** dishes come ONLY from `class_dish_options` joined on `meal_class_code`/`addon_class_code`; never mix dishes across classes (the BF_STUFFED_FLATBREAD↔BF_FRIED_FESTIVE bug). Hard filters (diet/allergy/Jain/fasting/Never) applied BEFORE scoring. Food DNA scoring matches DOC-19 weights.
**v3-science trace:** expand `BF_LIGHT_GRAIN` → only poha/upma/dalia-family dishes appear; a Jain user never sees onion/garlic dishes; a Gujarat user's non-veg slots respect 0.5/week intensity.
**Exit criteria:** [ ] no cross-class dish leakage; [ ] hard filters pre-score; [ ] DNA weights == DOC-19.

---

## PACK 7 — BUILD-07: Feedback Personalization Loop

**Read (binary):** DOC-19, DOC-21 (Feedback Learning Loop, .docx), DOC-17.
**Validate (DB):** `re_user_feedback`, `re_user_dish_affinity`, `re_user_class_affinity` (SCHEMA-RE-004) capture swipes/locks/Not-Today/Never/repeats and update class weights + dish affinity per DOC-21. "Onboarding is prior; revealed behavior overrides" (DOC-00 invariant #10).
**v3-science trace:** simulate 20 actions for a user; show class affinity drifts and a Never-listed dish is hard-excluded next plan.
**Exit criteria:** [ ] all six feedback signals wired; [ ] class weights update; [ ] Never honored as hard filter.

---

## PACK 8 — BUILD-08: API & App Integration

**Read (binary):** DOC-23 (API Contract, .docx). **Read (code):** `re-engine.service.ts`, `re-plan.repository.ts`, edge fns.
**Validate the resolver contract:** app calls ONE stable entry `generateMealPlan(userId, householdProfile, context)`; it never imports a specific RE version. Version dispatch internal. Error/response envelope matches the project standard. The home tab consumes class-first plans, not the legacy dish-first path.
**Exit criteria:** [ ] single stable interface; [ ] no version import leakage; [ ] JSON contracts == DOC-23.

---

## PACK 9 — BUILD-09: Admin CMS & Data Operations

**Read (binary):** DOC-27 (Admin CMS, .docx), DOC-28 (Versioning/Governance, .docx).
**Validate (DB):** `re_taxonomy_releases` (SCHEMA-RE-005) audit log; new class/persona/enum additions go THROUGH governance, never ad-hoc in app code (DOC invariant). `re-admin.repository.ts` matches CMS workflows.
**Exit criteria:** [ ] taxonomy changes auditable; [ ] no app-code-invented enums.

---

## PACK 10 — BUILD-10: Analytics, Experimentation, QA, Governance + FINAL NORTH-STAR GATE

**Read (binary):** DOC-25 (QA Test Cases, .xlsx), DOC-26 (Analytics/Experimentation, .docx), DOC-28.
**Run the full DOC-25 test matrix.** Then the **North-Star reconciliation**:

> For a representative sample of personas × states, generate the live weekly plan end-to-end
> (onboarding → assignment → class plan → add-ons → dish expansion) and diff it against what
> the v3 workbook predicts for the same inputs. The campaign is DONE when the live system
> reproduces the workbook's class plan (and add-on plan) for the sampled cohorts, and any
> divergence is an explicitly-approved behavioral-learning override, not a bug.

**Exit criteria:**
- [ ] DOC-25 cases pass.
- [ ] live plan == v3 workbook for sampled personas/states (the literal definition of "reached v3 north star").
- [ ] `SYSTEM_STATE.md` and `IMPLEMENTATION_BUILD_TRACKER.md` reflect true state (no false "complete").

---

## RUNNING THE CAMPAIGN

1. Run packs in order; do not advance until a pack's exit criteria pass.
2. Each pack ends with a commit on `apverse-labs-RE` and a `SYSTEM_STATE.md` update.
3. Keep a `RE_VALIDATION_LOG.md` appending each pack's OUTPUT CONTRACT report — this becomes the audit trail proving the docs were actually read.
4. After PACK 10, request founder approval before any `apverse-labs-RE → develop → main` merge.
