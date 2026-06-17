#!/usr/bin/env python3
"""Phase 2.1 — sheet inventory + ID registry + data ledger from extracted xlsx JSON."""
import os, json, glob, re

OUT = "/home/user/foofoo/Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/01_SOURCE_EXTRACTION"
WB = json.load(open(os.path.join(OUT, "extracted_source_workbook/Indian_Meal_Cohort_Persona_DB_v3.json")))
SPECS = {os.path.basename(p): json.load(open(p)) for p in glob.glob(os.path.join(OUT, "extracted_xlsx/*.json"))}

ID_HINT = re.compile(r"(_id$|_code$|^id$|persona|cohort|class|state|city|dish|addon|overlay|version)", re.I)
REMARK_HINT = re.compile(r"(remark|note|comment|why|reason|description)", re.I)

def cands(headers):
    pk = [h for h in headers if h and ID_HINT.search(str(h))]
    rk = [h for h in headers if h and REMARK_HINT.search(str(h))]
    return pk, rk

# ---------- sheet inventory ----------
si = ["# CANONICAL_SHEET_INVENTORY", "",
      "Every sheet in the source workbook + all spec workbooks, with structure and candidate keys.",
      "All formulas/DV/named-ranges/hidden = 0 across the board (see SOURCE_READ_PROOF).", ""]
def dump_wb(title, rec):
    si.append(f"## {title} — `{os.path.basename(rec['file'])}` ({len(rec['sheets'])} sheets)")
    si.append("| Sheet | State | Rows(data) | Cols | Candidate key cols | Remarks cols |")
    si.append("|---|---|---|---|---|---|")
    for s in rec["sheets"]:
        data_rows = max(len(s["rows"]) - 1, 0)
        pk, rk = cands(s["headers"])
        si.append(f"| {s['name']} | {s['state']} | {data_rows} | {s['max_col']} | "
                  f"{', '.join(map(str,pk[:6])) or '—'} | {', '.join(map(str,rk[:4])) or '—'} |")
    si.append("")
dump_wb("SOURCE WORKBOOK (Tier 1)", WB)
for fn in sorted(SPECS):
    dump_wb(f"SPEC {fn.split('_')[0]}", SPECS[fn])
open(os.path.join(OUT, "CANONICAL_SHEET_INVENTORY.md"), "w").write("\n".join(si))

# ---------- helpers to pull a column from a workbook sheet ----------
def sheet(rec, name):
    for s in rec["sheets"]:
        if s["name"] == name: return s
    return None
def col_values(s, colname):
    if not s: return []
    hdr = s["headers"]
    if colname not in hdr: return []
    i = hdr.index(colname)
    return [r[i] for r in s["rows"][1:] if i < len(r) and r[i] not in (None, "")]

# ---------- ID registry ----------
def distinct(vals):
    seen=[];
    for v in vals:
        if v not in seen: seen.append(v)
    return seen

registry = []  # (category, count, dup, sheet, col, sample)
def reg(category, recname, sheetname, colname):
    s = sheet(WB if recname=="WB" else SPECS[recname], sheetname)
    vals = col_values(s, colname) if s else []
    d = distinct(vals)
    dup = len(vals) - len(d)
    sample = ", ".join(map(str, d[:5]))
    registry.append((category, len(d), len(vals), dup, f"{sheetname}.{colname}", sample))

reg("state_id","WB","State_Profile_v3","state_id")
reg("persona_id","WB","Persona_Master_v3","persona_id")
reg("main_cohort_id","WB","Main_Cohort_Hierarchy","main_cohort_id")
reg("sub_cohort_id","WB","Subcohort_Routing","sub_cohort_id")
reg("cohort_id","WB","Cohort_Matrix_v3","cohort_id")
reg("meal_class_code","WB","Meal_Class_Master_v3","meal_class_code")
reg("addon_class_code","WB","Addon_Component_Class_Master","addon_class_code")
reg("routing_rule_id","WB","Routing_Rules_v3","rule_id")
reg("dish_option_id","WB","Class_Dish_Options_v3","dish_option_id")
reg("addon_dish_option_id","WB","Addon_Dish_Options","addon_dish_option_id")
reg("weekly_plan_day_id","WB","Weekly_Class_Plan_v3","plan_day_id")
reg("household_addon_plan_id","WB","Household_Addon_Component_Plan","addon_plan_id")

idr = ["# CANONICAL_ID_REGISTRY", "",
       "Distinct canonical IDs by category, sourced from the v3 source workbook (Tier 1).",
       "`dup` = duplicate rows of the same ID within the source column (0 = clean PK).", "",
       "| Category | Distinct | Rows | Dup | Source (sheet.col) | Sample |",
       "|---|---|---|---|---|---|"]
for c,n,rows,dup,src,samp in registry:
    idr.append(f"| {c} | {n} | {rows} | {dup} | `{src}` | {samp} |")
open(os.path.join(OUT, "CANONICAL_ID_REGISTRY.md"), "w").write("\n".join(idr))

# ---------- data ledger (canonical counts) ----------
def rows_of(name):
    s=sheet(WB,name); return max(len(s["rows"])-1,0) if s else "MISSING"
# primary-eligible split in Meal_Class_Master_v3
mcm = sheet(WB,"Meal_Class_Master_v3")
prim = "?"
if mcm and "allowed_as_weekly_primary" in mcm["headers"]:
    pe = col_values(mcm,"allowed_as_weekly_primary")
    truthy = sum(1 for v in pe if str(v).strip().lower() in ("true","y","yes","1"))
    prim = f"{truthy} primary-eligible / {len(pe)-truthy} not-primary"

dl = ["# CANONICAL_DATA_LEDGER", "",
      "Exact canonical counts from the v3 source workbook (Tier 1). These are the parity targets.", "",
      "| Entity | Sheet | Canonical count |",
      "|---|---|---|",
      f"| states/UTs | State_Profile_v3 | {rows_of('State_Profile_v3')} |",
      f"| city migration overlays | City_Migration_Overlay_v3 | {rows_of('City_Migration_Overlay_v3')} |",
      f"| main cohorts | Main_Cohort_Hierarchy | {rows_of('Main_Cohort_Hierarchy')} |",
      f"| sub-cohorts | Subcohort_Routing | {rows_of('Subcohort_Routing')} |",
      f"| personas | Persona_Master_v3 | {rows_of('Persona_Master_v3')} |",
      f"| routing rules | Routing_Rules_v3 | {rows_of('Routing_Rules_v3')} |",
      f"| cohorts (matrix) | Cohort_Matrix_v3 | {rows_of('Cohort_Matrix_v3')} |",
      f"| meal classes | Meal_Class_Master_v3 | {rows_of('Meal_Class_Master_v3')} ({prim}) |",
      f"| meal-class overlap rules | Meal_Class_Overlap_Resolution | {rows_of('Meal_Class_Overlap_Resolution')} |",
      f"| class-dish options | Class_Dish_Options_v3 | {rows_of('Class_Dish_Options_v3')} |",
      f"| add-on classes | Addon_Component_Class_Master | {rows_of('Addon_Component_Class_Master')} |",
      f"| add-on dish options | Addon_Dish_Options | {rows_of('Addon_Dish_Options')} |",
      f"| weekly class-plan rows | Weekly_Class_Plan_v3 | {rows_of('Weekly_Class_Plan_v3')} |",
      f"| household add-on plan rows | Household_Addon_Component_Plan | {rows_of('Household_Addon_Component_Plan')} |",
      f"| non-veg logic rows | NonVeg_Logic_v3 | {rows_of('NonVeg_Logic_v3')} |",
      "",
      "## Cross-source note (Tier-2 spec vs Tier-1 workbook)",
      f"- DOC-12 (Cohort_to_Weekly_Meal_Class_Matrix) spec workbook holds "
      f"{sum(max(len(s['rows'])-1,0) for s in SPECS['DOC-12_Cohort_to_Weekly_Meal_Class_Matrix_v1.0.json']['sheets'])} "
      "total rows across its sheets — must be reconciled against Weekly_Class_Plan_v3 in Phase 3.",
      f"- DOC-07 dish catalog spec rows: {sum(max(len(s['rows'])-1,0) for s in SPECS['DOC-07_Dish_Catalog_Class_to_Dish_Mapping_v1.0.json']['sheets'])} (vs workbook Class_Dish_Options_v3).",
      f"- DOC-08 Food DNA spec rows: {sum(max(len(s['rows'])-1,0) for s in SPECS['DOC-08_Food_DNA_Tagging_Specification_v1.0.json']['sheets'])}.",
      ]
open(os.path.join(OUT, "CANONICAL_DATA_LEDGER.md"), "w").write("\n".join(dl))
print("wrote CANONICAL_SHEET_INVENTORY / CANONICAL_ID_REGISTRY / CANONICAL_DATA_LEDGER")
for c,n,rows,dup,src,samp in registry: print(f"  {c}: {n} distinct ({dup} dup) <- {src}")
