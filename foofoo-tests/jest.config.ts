import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/unit", "<rootDir>/integration", "<rootDir>/tests"],
  testMatch: [
    "**/__tests__/**/*.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.json"
    }]
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
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
