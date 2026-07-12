import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  clearMocks: true,
  setupFiles: ["<rootDir>/tests/setup.ts"],
  verbose: true,
};

export default config;
