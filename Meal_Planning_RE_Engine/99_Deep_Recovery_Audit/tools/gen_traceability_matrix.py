#!/usr/bin/env python3
"""Phase 5 — REQUIREMENT_TO_DB_CODE_TEST_MATRIX (.md + .xlsx)."""
import os, openpyxl
OUT = "/home/user/foofoo/Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/04_TRACEABILITY_MATRIX"
os.makedirs(OUT, exist_ok=True)

COLS = ["req_id","source_file","source_loc","requirement","build","exp_db","act_db","db_status",
        "exp_code","act_code","code_status","exp_test","act_test","test_status",
        "severity","repair_action","priority","founder_decision"]

ROWS = [
 ["REQ-B01","DOC-02/05/07/08/12/22 + workbook","seed sheets","Seed all canonical entities with exact IDs/counts","BUILD-01",
  "15 reference tables","re_* tables match (Phase 3)","PASS","import_workbook.py","present","PASS",
  "seed_validation + MCP","MCP-verified","PASS","NONE","none — parity exact","-","NO"],
 ["REQ-B01b","DOC-12 matrix","31,636-row layout","Weekly matrix cell-parity vs DOC-12","BUILD-01/04",
  "re_weekly_class_plans=20664","counts match Tier-1","PASS","-","-","N/A",
  "cell-diff DOC-12","not done","PARTIAL","LOW","follow-up cell-diff (non-blocking)","P3","NO"],
 ["REQ-B02","DOC-03/04/10/11/16/17/18/20","onboarding flow","Capture DOC-10 18-field contract via dynamic onboarding","BUILD-02",
  "re_user_household_profiles 18 fields","schema complete (RE-008)","PASS","re-step-*.tsx + repo","present","PARTIAL",
  "build02 re_onboarding","present","PARTIAL","MEDIUM","build 5 capture UIs (allergy/swipe/multi-member/time/fast)","P2","NO"],
 ["REQ-B03","DOC-03/09/11/15","assignment logic","Table-driven cohort/persona + overlays + confidence","BUILD-03",
  "re_user_household_profiles","confidence+routing_trace (RE-009)","PASS","re-cohort-resolver.ts","present","PASS",
  "build03 resolver","present","PASS","NONE","none","-","NO"],
 ["REQ-B04","DOC-12/13/14/15/16","weekly algorithm","Class-first 7-day plan from matrix; weekday/weekend","BUILD-04",
  "re_weekly_class_plans","20664 ok; nonveg slot (RE-010)","PASS","re-plan.repository.ts","present","PASS",
  "unit re-plan","present","PASS","LOW","city-overlay weight blend = backlog","P3","NO"],
 ["REQ-B05","DOC-04/06","add-on architecture","Member add-ons separate; never replace primary","BUILD-05",
  "re_household_addon_plans","0 leaks (Phase 3)","PASS","re-addon.repository.ts","present","PASS",
  "unit re-addon","present","PASS","NONE","none","-","NO"],
 ["REQ-B06","DOC-07/08/19","dish expansion+scoring","Dishes only from class pool; hard filters before score","BUILD-06",
  "re_class_dish_options","0 cross-class (Phase 3)","PASS","re-dish-expander.ts","present","PASS",
  "unit re-dish-expander(30)","present","PASS","LOW","Food DNA + cook-fit (no v3 data) = backlog","P3","NO"],
 ["REQ-B07","DOC-19/21","feedback loop","Class + dish affinity; Never/Not-Today; revealed>aspiration","BUILD-07",
  "re_user_feedback/dish/class affinity","present","PASS","re-feedback.repository.ts","present","PASS",
  "unit re-feedback(19)","present","PASS","NONE","class loop closed (PACK 7)","-","NO"],
 ["REQ-B08","DOC-23","API contract","Stable versioned interface; class-first response; resolver","BUILD-08",
  "(reads all)","-","PASS","re-engine.service + re-engine/**","present","PASS",
  "unit re-engine-resolver(8)","present","PASS","NONE","boundary enforced (PACK 8)","-","NO"],
 ["REQ-B09","DOC-22/27/28","admin/governance","Taxonomy QA checks + semantic versioning + audit log","BUILD-09",
  "re_taxonomy_releases","present","PASS","re-admin + re-governance","present","PASS",
  "unit re-admin+gov(28)","present","PASS","LOW","Admin CMS UI = backlog","P3","NO"],
 ["REQ-B10","DOC-25/26/28","analytics/versioning","Acceptance/quality metrics; RE version attribution","BUILD-10",
  "re_engine_versions","present","PASS","re-analytics.repository.ts","present","PASS",
  "unit re-analytics","present","PASS","LOW","dashboards UI + golden e2e = backlog","P3","NO"],
 ["REQ-INV1","DOC-06/13","arch invariant","Class-first; no dish-before-class","ALL","-","held","PASS","-","held","PASS","-","invariants","PASS","NONE","-","-","NO"],
 ["REQ-INV2","DOC-06","arch invariant","Add-on-only never primary (0 leaks)","BUILD-04/05","-","0 leaks","PASS","-","held","PASS","DB invariant","PASS","PASS","NONE","-","-","NO"],
 ["REQ-INV3","DOC-09","arch invariant","home_state != current_city","BUILD-03","-","held","PASS","resolver","held","PASS","unit","PASS","PASS","NONE","-","-","NO"],
]

# summary
def cnt(col, val): return sum(1 for r in ROWS if r[COLS.index(col)]==val)
summary = {
 "blockers": sum(1 for r in ROWS if r[COLS.index("severity")]=="BLOCKER"),
 "high": sum(1 for r in ROWS if r[COLS.index("severity")]=="HIGH"),
 "medium": sum(1 for r in ROWS if r[COLS.index("severity")]=="MEDIUM"),
 "low": sum(1 for r in ROWS if r[COLS.index("severity")]=="LOW"),
 "missing_db": sum(1 for r in ROWS if r[COLS.index("db_status")] in ("MISSING","FAIL")),
 "missing_code": sum(1 for r in ROWS if r[COLS.index("code_status")] in ("MISSING","FAIL")),
 "missing_tests": sum(1 for r in ROWS if r[COLS.index("test_status")] in ("MISSING","FAIL")),
 "wrong_arch": 0,
}

# md
md = ["# REQUIREMENT_TO_DB_CODE_TEST_MATRIX", "",
      "Build-level + invariant traceability. Granular 482 requirements live in "
      "`01_SOURCE_EXTRACTION/CANONICAL_REQUIREMENTS_LEDGER.md`; this matrix tracks them at build/invariant "
      "granularity with parity status from Phases 3–4.", "",
      "## Summary",
      f"- BLOCKER: **{summary['blockers']}** · HIGH: **{summary['high']}** · MEDIUM: {summary['medium']} · LOW: {summary['low']}",
      f"- Missing DB entities: {summary['missing_db']} · Missing code: {summary['missing_code']} · Missing tests: {summary['missing_tests']}",
      f"- Wrong-architecture areas: {summary['wrong_arch']}", "",
      "| " + " | ".join(COLS) + " |",
      "|" + "|".join("---" for _ in COLS) + "|"]
for r in ROWS:
    md.append("| " + " | ".join(str(x) for x in r) + " |")
open(os.path.join(OUT,"REQUIREMENT_TO_DB_CODE_TEST_MATRIX.md"),"w").write("\n".join(md))

# xlsx
wb = openpyxl.Workbook(); ws = wb.active; ws.title="matrix"
ws.append(COLS)
for r in ROWS: ws.append(r)
ws2 = wb.create_sheet("summary")
for k,v in summary.items(): ws2.append([k,v])
wb.save(os.path.join(OUT,"REQUIREMENT_TO_DB_CODE_TEST_MATRIX.xlsx"))
print("wrote matrix .md + .xlsx |", summary)
