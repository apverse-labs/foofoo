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
