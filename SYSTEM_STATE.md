# SYSTEM STATE LEDGER (v2.0)
> Last updated: 2026-06-05
> Maintained by: Lead Systems & Release Architect (Claude)
> Rules: See CLAUDE.md § Architect Rules

---

## 📌 Active Checkpoints & Branches

| CKPT ID   | Branch    | Description                                                                 | DB Schema Version |
|-----------|-----------|-----------------------------------------------------------------------------|-------------------|
| CKPT-001  | main      | Baseline — React Native/Expo web + Supabase MVP + architect rules + deploy gate | SCHEMA-BASE-001 |

> **Checkpoint Naming:** `CKPT-NNN` (sequential, zero-padded)
> **Schema Naming:** `SCHEMA-<LABEL>-NNN` (e.g. BASE, AUTH, MENU, ORDER)

---

## 🚀 Active Cloud Deployments
> ⚠️ **Supabase Free Tier Limit: 2 active projects max**

### DEP-STAGING (Project A — Supabase Staging)
- **Project Ref:** `[PENDING — create Project A on Supabase free tier before activating staging]`
- **Code Base / Checkpoint:** CKPT-001
- **Git Release Branch:** `develop` ← PROTECTED (NEVER DELETE)
- **Target Audience:** Internal QA / Beta Cohort
- **Status:** Standby (no Supabase project yet)

### DEP-PRODUCTION (Project B — Supabase Production)
- **Project Ref:** `ufgfznpqixplcbhmsqqw` (foofoo-mvp, ap-south-1)
- **Code Base / Checkpoint:** CKPT-001
- **Git Release Branch:** `main` ← PROTECTED (NEVER DELETE)
- **Target Audience:** Live Production Users
- **Status:** Active

---

## 🔀 Git Merge & Clean-up Constraints

### PROTECTED BRANCHES (Never Delete / Never Merge without Explicit Approval)
- `main` — tied to **DEP-PRODUCTION**
- `develop` — tied to **DEP-STAGING**
- `deploy-*` — any future release branch matching this prefix

### FEASIBLE MERGES CURRENTLY
- Feature branches → `develop` (for staging validation), then `develop` → `main` (for production release), with explicit approval at each step.

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
- **Staging flow:** feature branch → PR → `develop` → QA sign-off → PR → `main` → manual `vercel deploy`
