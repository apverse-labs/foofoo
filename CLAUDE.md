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
* PROTECTED BRANCHES (Never Delete / Never Merge without Explicit Command): `main`, `deploy-*`
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
