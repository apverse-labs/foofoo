# FooFoo — Architect Rules for Claude Code Sessions

## Project
React Native / Expo web app + Supabase backend. Indian market meal-decision assistant.
Stack: Expo SDK 56, React 19, React Native 0.85.3, Supabase (ap-south-1), TanStack Query, Vercel (static export).

---

## Architect Rules (mandatory — apply every session)

### Rule 1 — SYSTEM STATE LEDGER
Every response MUST open with the current ledger from `SYSTEM_STATE.md`, updated with any changes made in that turn. Format:

```
# SYSTEM STATE LEDGER
## 📌 Active Checkpoints & Branches
* [CKPT-NNN] (Branch: [name]) -> [description]. [Schema ID].

## 🚀 Active Deployments & Infrastructure
* DEP ID: [DEP-ENV-NNN]
  - Code Base: [CKPT-NNN]
  - DB Target: [Schema ID]
  - Target / Persona: [e.g. Internal QA / Production]
  - Git Release Branch: [branch name] <-- PROTECTED (NEVER DELETE)
  - Status: [Active / Deprecated]

## 🔀 Git Merge & Clean-up Constraints
* PROTECTED BRANCHES (Never Delete / Never Merge without Explicit Command): `main`, `develop`, `deploy-*`
* FEASIBLE MERGES CURRENTLY:
  - [branch] can be safely merged into [target] and then deleted.
* BLOCKED MERGES:
  - [branch] CANNOT be merged into [target] due to [reason].
```

### Rule 2 — Deep Component Isolation
Code changes must be decoupled using Factory/Strategy patterns or dynamic backend environment config. Deep logic changes (including DB layer) must not break other checkpoints/deployments.

### Rule 3 — Reversible DB Migrations
Every DB schema change requires:
- An `Up` SQL script (applies the change)
- A `Down` SQL script (rolls it back)
- An entry added to the Schema Registry in `SYSTEM_STATE.md`

### Rule 4 — Deployment Gate
Auto-deploy is DISABLED on Vercel (`ignoreCommand: exit 1` in `vercel.json`).
Never run `vercel deploy` or trigger a production deployment without explicit user approval in the current conversation turn.

### Rule 5 — Git Guardrail
**Strictly forbidden:** suggesting a merge or branch deletion without first verifying against the "Git Merge & Clean-up Constraints" section of `SYSTEM_STATE.md`.

Every response that writes or changes code MUST conclude with a **"Git Next Steps"** section:
1. Which branch the code lives on right now.
2. Whether it is safe to merge into another branch, and exactly which branch.
3. Explicit warning if applicable: "DO NOT delete branch [Name] — tied to active deployment [DEP-ID]."

**Standard merge flow:** feature branch → `develop` (staging/QA) → `main` (production). Never skip `develop`.

### Rule 6 — GitHub is Ground Truth (No Local Shortcuts)
**The local git clone is never a reliable source of truth.** It can be stale, incomplete, or polluted by the current session's filesystem operations.

Before asserting anything about branches, files, or folder structure:
1. **Always verify via GitHub MCP tools** (`mcp__github__list_branches`, `mcp__github__get_file_contents`) — not `git branch -a`, `ls`, or `git ls-files`.
2. **Never infer file existence from the local filesystem.** A folder or file on disk may be a session artifact, not a committed file.
3. **When a branch is not found locally**, check GitHub via MCP tools before concluding it doesn't exist.
4. **No shortcuts.** If in doubt, look it up on GitHub. The cost of one MCP call is always lower than the cost of a wrong assumption.

---

## Nomenclature

| Concept           | Format                    | Example            |
|-------------------|---------------------------|--------------------|
| Checkpoint        | `CKPT-NNN`                | `CKPT-002`         |
| Deployment        | `DEP-<ENV>-NNN`           | `DEP-PROD-001`     |
| Schema version    | `SCHEMA-<LABEL>-NNN`      | `SCHEMA-AUTH-002`  |
| Migration file    | `YYYYMMDD_NNN_label.sql`  | `20260605_001_add_sessions.sql` |
| Release branch    | `deploy-<env>`            | `deploy-prod`, `deploy-staging` |

---

## Persistent State File
`SYSTEM_STATE.md` is the source of truth. Read it at session start; write updates at session end.

---

## Meal Planning RE Module

A versioned Recommendation Engine module lives at `Meal_Planning_RE_Engine/`.
It has its own rules file at `Meal_Planning_RE_Engine/CLAUDE.md` — read it at the start of any RE session.

Key constraints (summary — full rules in module CLAUDE.md):
- The RE module must never break the existing production FooFoo app.
- The app calls a stable interface only; it never imports a specific RE version directly.
- All RE DB migrations are additive only and must be registered in `SYSTEM_STATE.md`.
- Canonical source workbook (`Indian_Meal_Cohort_Persona_DB_v3.xlsx`) and docs folder are read-only.
- RE versions (V1–V4) are independently testable and deployable.
