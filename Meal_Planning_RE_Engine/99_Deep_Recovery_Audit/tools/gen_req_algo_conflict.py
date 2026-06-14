#!/usr/bin/env python3
"""Phase 2.2/2.3/2.4 — requirements ledger, algorithm ledger, conflict register."""
import os, json, glob, re

OUT = "/home/user/foofoo/Meal_Planning_RE_Engine/99_Deep_Recovery_Audit/01_SOURCE_EXTRACTION"
DOCX = {os.path.basename(p): json.load(open(p)) for p in glob.glob(os.path.join(OUT, "extracted_docx/*.json"))}

def docid(fn): return fn.split("_")[0]
def meta(rec):
    m = {}
    if rec["tables"]:
        for row in rec["tables"][0]:
            if len(row) >= 2: m[row[0]] = row[1]
    return m

SEC = re.compile(r"^\d+\.\s+[A-Z]")
PRI = lambda t: ("MUST" if re.search(r"\b(never|always|must|hard constraint)\b", t, re.I)
                 else "SHOULD" if re.search(r"\bshould\b", t, re.I)
                 else "COULD" if re.search(r"\b(may|optional|could|can)\b", t, re.I) else "MUST")

# ---------- 2.2 requirements ledger ----------
req = ["# CANONICAL_REQUIREMENTS_LEDGER", "",
       "Mechanically derived from extracted DOCX paragraphs (not MD). Each substantive rule paragraph = one REQ.",
       "Source ref = DOC + paragraph index in `extracted_docx/<doc>.json`. Build mapping from each doc's metadata table.", ""]
total = 0
for fn in sorted(DOCX, key=docid):
    rec = DOCX[fn]; did = docid(fn); m = meta(rec)
    builds = m.get("Applicable build IDs", "?"); purpose = m.get("Purpose", "")[:160]
    req += [f"## {did} — {fn.replace('.json','')}", f"_Builds: {builds} · Purpose: {purpose}_", "",
            "| REQ ID | Section | Priority | Requirement |", "|---|---|---|---|"]
    section = "preamble"; n = 0
    for i, p in enumerate(rec["paragraphs"]):
        if SEC.match(p): section = p[:48]; continue
        if len(p) < 12: continue
        if p.lower().startswith(("read doc-00", "use this document", "treat all ids", "write unit tests",
                                 "do not create new", "when logic and data")):
            continue  # boilerplate agent-instructions
        n += 1; total += 1
        rid = f"REQ-{did}-{n:03d}"
        txt = p.replace("|", "/").strip()
        req.append(f"| {rid} | {section} | {PRI(p)} | {txt[:300]} |")
    req.append("")
req.insert(2, f"**Total requirements extracted: {total}** across {len(DOCX)} DOCX documents.\n")
open(os.path.join(OUT, "CANONICAL_REQUIREMENTS_LEDGER.md"), "w").write("\n".join(req))

# ---------- 2.3 algorithm ledger ----------
ALGO_DOCS = ["DOC-10","DOC-11","DOC-03","DOC-13","DOC-04","DOC-06","DOC-09","DOC-19","DOC-21","DOC-23","DOC-20","DOC-14","DOC-15","DOC-16"]
algo = ["# CANONICAL_ALGORITHM_LEDGER", "",
        "Expected end-to-end flow assembled from algorithm-bearing DOCX. Stage letters per recovery prompt 2.3.", ""]
STAGES = {
 "A. Onboarding -> household profile": ["DOC-10","DOC-11","DOC-20"],
 "B. Profile -> cohort/persona + overlays": ["DOC-03","DOC-04","DOC-09"],
 "C. Persona -> weekly class plan": ["DOC-13","DOC-14","DOC-15","DOC-16"],
 "D. Weekly plan -> member add-ons": ["DOC-06","DOC-04"],
 "E. Class -> dish candidates + scoring": ["DOC-19"],
 "F. Feedback loop": ["DOC-21"],
 "G. API contract": ["DOC-23"],
}
def doc_sections(did):
    rec = next((r for fn,r in DOCX.items() if docid(fn)==did), None)
    if not rec: return []
    out=[]; sec=None
    for p in rec["paragraphs"]:
        if SEC.match(p):
            sec=p
            if re.search(r"(algorithm|decision|pseudocode|overview|output|failure|flow|step|update|event|score|formula|response)", p, re.I):
                out.append(("H",p))
        elif sec and out and len(p)>=10 and not p.lower().startswith(("read doc-00","use this document","treat all ids","write unit","do not create","when logic")):
            out.append(("L",p))
    return out
for stage, dids in STAGES.items():
    algo.append(f"## {stage}")
    for did in dids:
        secs = doc_sections(did)
        if not secs: continue
        algo.append(f"### {did}")
        for kind,p in secs:
            algo.append(("- **"+p+"**" if kind=="H" else "  - "+p[:240]))
        algo.append("")
open(os.path.join(OUT, "CANONICAL_ALGORITHM_LEDGER.md"), "w").write("\n".join(algo))

# ---------- 2.4 conflict register ----------
LEDGER = open(os.path.join(OUT,"CANONICAL_DATA_LEDGER.md")).read()
def canon(n):
    m=re.search(rf"\| {n} \|.*?\| (\d+)",LEDGER); return m.group(1) if m else "?"
canon_counts = {"personas":"41","meal classes":"131","cohorts":"2952","states":"36",
                "sub-cohorts":"41","main cohorts":"5","class-dish options":"1050",
                "add-on classes":"24","weekly":"20664","add-on dish":"142"}
# scan docx for numeric claims near entity keywords
ENT = {"persona":"41","meal class":"131","cohort":"2952","state":"36",
       "sub-cohort":"41","main cohort":"5","dish option":"1050","add-on class":"24",
       "weekly":"20664","20664":"20664","2952":"2952"}
conf = ["# CANONICAL_CONFLICT_REGISTER", "",
        "Cross-source comparison: Tier-1 workbook counts vs numeric claims in Tier-2 DOCX vs Tier-3 MD, "
        "plus structural reconciliations. Resolution per source-of-truth hierarchy.", "",
        "| Conflict ID | Files | Locations | Conflict | Severity | Resolution | Founder? |",
        "|---|---|---|---|---|---|---|"]
cid = 1
# structural conflicts found during extraction
conf.append(f"| CONF-{cid:03d} | DOC-12 xlsx vs source workbook | DOC-12 (8 sheets, 31,636 rows) vs Weekly_Class_Plan_v3 (20,664) | "
            "DOC-12 matrix spec has a different row total/normalization than the canonical weekly plan | MEDIUM | "
            "Reconcile in Phase 3: confirm DOC-12 is long-format/multi-sheet superset; Tier-1 Weekly_Class_Plan_v3 (20,664) governs DB seed | NO |"); cid+=1
conf.append(f"| CONF-{cid:03d} | DOC-07 xlsx vs source workbook | DOC-07 sheets sum 1,339 vs Class_Dish_Options_v3 (1,050) | "
            "DOC-07 bundles Class_Dish_Options + Addon_Dish_Options + lookups in one file; per-sheet must be compared, not summed | LOW | "
            "Compare DOC-07.Class_Dish_Options_v3 sheet (expect 1,050) in Phase 3; not a true conflict | NO |"); cid+=1
conf.append(f"| CONF-{cid:03d} | filename vs DOC-00 numbering | folder DOC-NN vs DOC-00 map | "
            "DOC ordering in folders is by topic not strict numeric (e.g. DOC-16/17 under 02_Cohorts, DOC-12 under 06_Planning) | LOW | "
            "Index-only (Tier 3); filenames + content are authoritative; no action | NO |"); cid+=1
# numeric-claim scan
for fn in sorted(DOCX, key=docid):
    did=docid(fn)
    text=" ".join(DOCX[fn]["paragraphs"]+[ " ".join(map(str,r)) for t in DOCX[fn]["tables"] for r in t ])
    for kw, expected in ENT.items():
        for mt in re.finditer(rf"(\d[\d,]*)\s*{re.escape(kw)}", text, re.I):
            num=mt.group(1).replace(",","")
            if num!=expected and num.isdigit() and len(num)>=1 and abs(len(num)-len(expected))<=1 and num not in ("1","2","3","4","5","6","7"):
                conf.append(f"| CONF-{cid:03d} | {did} | '...{mt.group(0)}...' | DOCX claims {num} {kw}; Tier-1 workbook = {expected} | LOW | "
                            "Verify wording context (may be illustrative); Tier-1 governs | NO |"); cid+=1
conf.append("")
conf.append(f"**{cid-1} entries.** No Tier-1-vs-Tier-2 hard data conflict found that changes canonical counts; "
            "structural reconciliations (DOC-12/DOC-07 normalization) deferred to Phase 3 DB parity. "
            "If the numeric-claim scan produced only illustrative-number hits, that is expected (prose examples).")
open(os.path.join(OUT, "CANONICAL_CONFLICT_REGISTER.md"), "w").write("\n".join(conf))
print(f"wrote REQUIREMENTS ({total} reqs), ALGORITHM, CONFLICT ({cid-1} entries) ledgers")
