# SYSTEM STATE LEDGER
> Last updated: 2026-06-05
> Maintained by: Lead Systems & Release Architect (Claude)
> Rules: See CLAUDE.md § Architect Rules

---

## 📌 Active Checkpoints & Branches

| CKPT ID   | Branch  | Description                                              | DB Schema Version |
|-----------|---------|----------------------------------------------------------|-------------------|
| CKPT-001  | main    | Baseline — React Native/Expo web + Supabase MVP + architect rules + Vercel deploy gate | SCHEMA-BASE-001 |

> **Checkpoint Naming:** `CKPT-NNN` (sequential integer, zero-padded to 3 digits)
> **Schema Naming:** `SCHEMA-<LABEL>-NNN` where LABEL is a short domain tag (BASE, AUTH, MENU, ORDER, etc.)

---

## 🚀 Active Deployments & Infrastructure

| DEP ID    | CKPT     | DB Target         | Target / Persona   | Git Release Branch | Status      |
|-----------|----------|-------------------|--------------------|--------------------|-------------|
| DEP-INIT  | CKPT-001 | SCHEMA-BASE-001   | Internal QA        | main               | Active      |

> **Deployment Naming:** `DEP-<ENV>-NNN` for future entries (e.g. `DEP-PROD-001`, `DEP-STG-001`, `DEP-QA-001`)
> **Release branches** prefixed `deploy-*` are PROTECTED — never delete, never merge without explicit command.

---

## 🔀 Git Merge & Clean-up Constraints

### PROTECTED BRANCHES (Never Delete / Never Merge without Explicit Command)
- `main`
- `deploy-*` (any branch matching this prefix)

### FEASIBLE MERGES CURRENTLY
- Branch `claude/cool-euler-wzNoS` → already squash-merged into `main` via PR #34. **Safe to delete** (no active deployment tied to it).

### BLOCKED MERGES
- *(none at this time)*

---

## 🗄️ DB Schema Registry

| Schema ID        | Migration File                   | Up Applied | Down Available | Notes                        |
|------------------|----------------------------------|------------|----------------|------------------------------|
| SCHEMA-BASE-001  | (pre-existing / remote baseline) | ✅          | ❌ (pre-ledger) | 42 MVP tables, ap-south-1    |

---

## ⚙️ Deployment Gate Policy

- **Auto-deploy:** DISABLED (Vercel `ignoreCommand: exit 1`)
- **Deploy trigger:** Manual only — explicit human approval required each time, per conversation turn
- **Deploy command:** `vercel deploy --prod --token $VERCEL_TOKEN` (run only after explicit go-ahead)
