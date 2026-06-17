/**
 * jest.global-setup.ts
 *
 * Jest globalSetup hook. Loads .env.test (if present) and maps the app's
 * EXPO_PUBLIC_-prefixed RE env vars onto the bare SUPABASE_RE_* names the test
 * suite reads, so a single set of secrets works for both the app and the tests.
 *
 * Runs once before the whole jest run.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '.env.test') });

  // Canonical names (GitHub Secrets): SUPABASE_STAGING_* → EXPO_PUBLIC_ so
  // src/services/supabase-re.ts resolves when imported under jest.
  // Legacy SUPABASE_RE_* and EXPO_PUBLIC_ names are also accepted as fallbacks.
  const map: Array<[string, string]> = [
    ['SUPABASE_STAGING_URL',              'EXPO_PUBLIC_SUPABASE_RE_URL'],
    ['SUPABASE_STAGING_ANON_KEY',         'EXPO_PUBLIC_SUPABASE_RE_ANON_KEY'],
    ['SUPABASE_STAGING_SERVICE_ROLE_KEY', 'SUPABASE_RE_SERVICE_KEY'],
    // Legacy fallbacks (local dev with old var names)
    ['EXPO_PUBLIC_SUPABASE_RE_URL',       'SUPABASE_STAGING_URL'],
    ['EXPO_PUBLIC_SUPABASE_RE_ANON_KEY',  'SUPABASE_STAGING_ANON_KEY'],
  ];

  for (const [from, to] of map) {
    if (process.env[from] && !process.env[to]) {
      process.env[to] = process.env[from];
    }
  }
}
