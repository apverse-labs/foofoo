# SYSTEM STATE LEDGER
> Last updated: 2026-06-05
> Maintained by: Lead Systems & Release Architect (Claude)
> Rules: See CLAUDE.md § Architect Rules

---

## 📌 Active Checkpoints (Code Snapshots)

| CKPT ID   | Branch  | Description                                      | DB Schema Version |
|-----------|---------|--------------------------------------------------|-------------------|
| CKPT-001  | main    | Baseline — React Native/Expo web, Supabase MVP   | SCHEMA-BASE-001   |

> **Checkpoint Naming:** `CKPT-NNN` (sequential integer, zero-padded to 3 digits)
> **Schema Naming:** `SCHEMA-<LABEL>-NNN` where LABEL is a short domain tag (BASE, AUTH, MENU, ORDER, etc.)

---

## 🚀 Active Deployments & Infrastructure

| DEP ID    | CKPT     | DB Target         | Target / Persona   | Platform  | Status      |
|-----------|----------|-------------------|--------------------|-----------|-------------|
| DEP-INIT  | CKPT-001 | SCHEMA-BASE-001   | Internal QA        | Vercel    | Active      |

> **Deployment Naming:** `DEP-<ENV>-NNN` for future entries (e.g. `DEP-PROD-001`, `DEP-STG-001`, `DEP-QA-001`)

---

## 🗄️ DB Schema Registry

| Schema ID        | Migration File                  | Up Applied | Down Available | Notes                        |
|------------------|---------------------------------|------------|----------------|------------------------------|
| SCHEMA-BASE-001  | (pre-existing / remote baseline)| ✅          | ❌ (pre-ledger) | 42 MVP tables, ap-south-1    |

---

## ⚙️ Deployment Gate Policy

- **Auto-deploy:** DISABLED (Vercel `ignoreCommand: exit 1`)
- **Deploy trigger:** Manual only — explicit human approval required before each `vercel deploy`
- **Deploy command:** `vercel deploy --prod --token $VERCEL_TOKEN` (run in session with explicit user go-ahead)

---

## 📋 Rules Reference (condensed)

1. **Every response** opens with the current SYSTEM STATE LEDGER block.
2. **Component isolation:** Factory/Strategy patterns or env-config switches; changes must not bleed across checkpoints.
3. **DB migrations:** Every schema change ships with explicit `Up` and `Down` SQL scripts, registered in the Schema Registry above.
