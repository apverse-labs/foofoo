# SYSTEM STATE LEDGER (v2.0)
> Last updated: 2026-06-14
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
- **Project Ref:** `kwypxyqxojauhiehuirz` (foofoo-staging, ap-south-1)
- **Code Base / Checkpoint:** CKPT-001 + RE BUILD-01 (apverse-labs-RE)
- **Git Release Branch:** `develop` ← PROTECTED (NEVER DELETE)
- **Target Audience:** Internal QA / Beta Cohort — RE module validation
- **Status:** Active — RE BUILD-01 through BUILD-04 DDL fully applied (2026-06-14). SCHEMA-RE-001 + SCHEMA-RE-002 live on staging.

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

| Schema ID        | Migration File                              | Up Applied | Down Available | Notes                                                                    |
|------------------|---------------------------------------------|------------|----------------|--------------------------------------------------------------------------|
| SCHEMA-BASE-001  | (pre-existing / remote baseline)            | ✅          | ❌ (pre-ledger) | 42 MVP tables, ap-south-1                                                |
| SCHEMA-RE-001    | 20260614_001_re_seed_tables.sql             | ✅ staging  | ✅              | 19 RE tables + household_members + profiles.re_engine_version; foofoo-staging only; NOT yet on production |
| SCHEMA-RE-002    | 20260614_003_re_user_weekly_plans.sql       | ✅ staging  | ✅              | BUILD-04: `re_user_weekly_plans` (per-user 7-day class plan, RLS own-rows). Applied 2026-06-14 via Supabase MCP to foofoo-staging. 17 cols, 1 RLS policy (re_uwp_all_own), index idx_re_uwp_profile_week. NOT yet on production. |

---

## ⚙️ Deployment Gate Policy

- **Auto-deploy:** DISABLED (Vercel `ignoreCommand: exit 1`)
- **Deploy trigger:** Manual only — explicit human approval required each time, per conversation turn
- **Staging flow:** feature branch → PR → `develop` → QA sign-off → PR → `main` → manual `vercel deploy`
