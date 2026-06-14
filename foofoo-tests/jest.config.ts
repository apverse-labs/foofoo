import type { Config } from "jest";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.test for local integration test runs.
// In CI the env vars are injected directly — this is a no-op when the file doesn't exist.
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: [
    "<rootDir>/unit",
    "<rootDir>/integration",
    "<rootDir>/tests",
    "<rootDir>/../Meal_Planning_RE_Engine/00_Implementation/__tests__",
  ],
  testMatch: [
    "**/__tests__/**/*.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.json",
      diagnostics: false,
    }]
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  modulePaths: ["<rootDir>/node_modules"],
  moduleNameMapper: {
    "^@supabase/supabase-js$": "<rootDir>/node_modules/@supabase/supabase-js",
    // Mock React Native / Expo modules that can't run in Node (unit tests only)
    "^expo-secure-store$": "<rootDir>/tests/__mocks__/expo-secure-store.ts",
    "^react-native$": "<rootDir>/tests/__mocks__/react-native.ts",
    // Stub the Supabase service clients for RE repository unit tests
    "^.*src/services/supabase$": "<rootDir>/tests/__mocks__/supabase-client.ts",
    "^.*src/services/supabase-re$": "<rootDir>/tests/__mocks__/supabase-client.ts",
    "^@react-native-async-storage/async-storage$": "<rootDir>/tests/__mocks__/async-storage.ts",
  },
  collectCoverageFrom: [
    "unit/**/*.ts",
    "integration/**/*.ts",
    "!**/*.d.ts"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: [],
  testTimeout: 30000,
  verbose: true,
  // Integration tests need more time for Supabase round-trips
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"]
};

export default config;
