#!/usr/bin/env node
// Fails the build if the Supabase project ref doesn't match the Vercel git
// branch's expected environment. `main` must always point at the prod ref;
// every other branch (develop, feature/*, apverse-labs-RE, ...) must point
// at the staging ref. Catches env-misconfiguration at deploy time instead
// of in a user's browser.

const PROD_SUPABASE_REF = 'ufgfznpqixplcbhmsqqw';
const STAGING_SUPABASE_REF = 'kwypxyqxojauhiehuirz';

const gitRef = process.env.VERCEL_GIT_COMMIT_REF;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

if (!gitRef) {
  // Not building on Vercel (local dev, CI without git context) — nothing to verify.
  process.exit(0);
}

const expectedRef = gitRef === 'main' ? PROD_SUPABASE_REF : STAGING_SUPABASE_REF;
const expectedLabel = gitRef === 'main' ? 'production' : 'staging';

if (!supabaseUrl.includes(expectedRef)) {
  console.error(
    `\n[verify-env-match] BUILD BLOCKED\n` +
    `  Branch "${gitRef}" must build against the ${expectedLabel} Supabase project (${expectedRef}).\n` +
    `  EXPO_PUBLIC_SUPABASE_URL is set to: ${supabaseUrl || '(empty)'}\n` +
    `  Fix the Vercel project's environment variables before redeploying.\n`
  );
  process.exit(1);
}

console.log(`[verify-env-match] OK — branch "${gitRef}" -> ${expectedLabel} Supabase (${expectedRef})`);
