import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/*.e2e.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "../tsconfig.json"
    }]
  },
  reporters: ["detox/runners/jest/reporter"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  testEnvironment: "detox/runners/jest/testEnvironment",
  testTimeout: 120000,
  verbose: true
};

export default config;
