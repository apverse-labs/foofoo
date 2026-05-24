/**
 * Example unit/integration test.
 * Replace with real test cases once CONTEXT.md is added and requirements are clear.
 */

describe("foofoo-tests bootstrap", () => {
  it("Jest is configured correctly", () => {
    expect(true).toBe(true);
  });

  it("environment variables are documented", () => {
    // Reminder: set these in .env.test before running integration tests
    const requiredEnvVars = [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY"
    ];

    const missing = requiredEnvVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      console.warn(`Missing env vars (needed for Supabase tests): ${missing.join(", ")}`);
    }

    // This test always passes — it's a docs-in-test reminder pattern
    expect(true).toBe(true);
  });
});
