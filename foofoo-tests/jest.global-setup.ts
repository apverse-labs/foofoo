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

  // Map EXPO_PUBLIC_ RE vars → bare names when the bare names are absent.
  const map: Array<[string, string]> = [
    ['EXPO_PUBLIC_SUPABASE_RE_URL', 'SUPABASE_RE_URL'],
    ['EXPO_PUBLIC_SUPABASE_RE_ANON_KEY', 'SUPABASE_RE_ANON_KEY'],
    ['EXPO_PUBLIC_SUPABASE_RE_SERVICE_KEY', 'SUPABASE_RE_SERVICE_KEY'],
    // Reverse map too: if only bare names are set, expose EXPO_PUBLIC_ ones so
    // the app's src/services/supabase-re.ts resolves when imported by tests.
    ['SUPABASE_RE_URL', 'EXPO_PUBLIC_SUPABASE_RE_URL'],
    ['SUPABASE_RE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_RE_ANON_KEY'],
  ];

  for (const [from, to] of map) {
    if (process.env[from] && !process.env[to]) {
      process.env[to] = process.env[from];
    }
  }
}
