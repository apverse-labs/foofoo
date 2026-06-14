# foofoo-tests

Test suite for the **foofoo** project. Contains:

| Layer | Tool | Location |
|---|---|---|
| Unit / Integration | Jest + ts-jest | `tests/` |
| E2E (mobile) | Detox | `e2e/` |
| DB helpers | Supabase JS client | `lib/supabase.ts` |

## Setup

```bash
# Install dependencies
npm install

# Copy and fill in env vars
cp .env.test.example .env.test
$EDITOR .env.test
```

## Running tests

```bash
# Unit / integration
npm test

# Unit / integration (watch)
npm run test:watch

# Coverage
npm run test:coverage

# E2E — iOS simulator (must have the app built first)
npm run test:e2e:build   # build once
npm run test:e2e:ios

# E2E — Android emulator
npm run test:e2e:android
```

## Detox configuration

Edit `.detoxrc.ts` to point `binaryPath` and `build` at your actual app workspace / scheme / APK path.

## See also

- `CONTEXT.md` — project context and test conventions
- `.env.test.example` — required environment variables

## RE (Recommendation Engine) QA suite

Extends this suite to validate the RE module (BUILD-01 … BUILD-10) on the RE
staging Supabase project (`kwypxyqxojauhiehuirz`). Existing unit/integration
tests and the MVP persona runner are untouched.

### RE env vars (in `.env.test`, template in `.env.test.template`)

```
SUPABASE_RE_URL=https://kwypxyqxojauhiehuirz.supabase.co
SUPABASE_RE_ANON_KEY=...
SUPABASE_RE_SERVICE_KEY=...   # optional; needed for seed counts / RLS / DPDP / personas
QA_TARGET=re-staging          # re-staging | mvp-prod
```
The app's `EXPO_PUBLIC_SUPABASE_RE_*` variants are also accepted (mapped in
`jest.global-setup.ts`).

### RE scripts

```bash
npm run test:re               # all RE unit + integration tests
npm run test:unit:re          # RE unit tests only
npm run test:integration:re   # RE schema / seed / module / persona integration
npm run test:personas:re      # 50 RE personas, light mode (jest)
npm run test:security:re      # RE RLS + DPDP (needs SUPABASE_RE_SERVICE_KEY)
npm run run:personas:re       # RE persona runner CLI
npm run report:re             # generate md + html RE persona reports
```

### What each RE file does

| File | Purpose |
|---|---|
| `lib/supabase-re.ts` | RE staging clients (anon + optional service role) |
| `config/targets.ts` | QA target selection (`re-staging` \| `mvp-prod`) |
| `config/success-gates.ts` | PASS/FAIL thresholds (`GATES`) |
| `integration/re-schema-validation.test.ts` | all RE tables, key columns, RLS |
| `integration/re-seed-integrity.test.ts` | seed counts + FK integrity (service key) |
| `integration/re-module-integration.test.ts` | the 5 RE repositories vs staging |
| `integration/re-persona-journey.test.ts` | 50 personas, light mode |
| `integration/re-rls-security.test.ts` | cross-user isolation (service key) |
| `integration/re-dpdp-compliance.test.ts` | deletion cascade (service key) |
| `personas/re-persona-definitions.ts` | 50 RE personas (RP001..RP050) |
| `personas/re-persona-runner.ts` | RE persona journey runner (light/full) |
| `reports/re-report-generator.ts` | RE md + html dashboards |

### Important staging note

RE reference/seed tables have **RLS enabled with no policy**, so the anon client
reads **0 rows** from them. Schema-existence probes still work; real seed counts,
persona dish validation, RLS isolation and DPDP cascade all require
`SUPABASE_RE_SERVICE_KEY` and **skip cleanly** when it is absent (they are not
counted as failures).
