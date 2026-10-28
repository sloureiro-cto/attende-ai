const nextJest = require("next/jest")

const createJestConfig = nextJest({
  dir: "./",
})

// Mirrors tsconfig baseUrl "." and paths "@/*": ["./src/*", "./*"]
const moduleResolution = {
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: { "^@/(.*)$": ["<rootDir>/src/$1", "<rootDir>/$1"] },
}

/** The app: components, hooks, actions (jsdom unless a file asks for node). */
const appConfig = {
  displayName: "app",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["<rootDir>/e2e", ".*/__mocks__/.*", "<rootDir>/server/"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  ...moduleResolution,
  moduleNameMapper: { ...moduleResolution.moduleNameMapper, "^server-only$": "<rootDir>/server/test/serverOnlyStub.js" },
}

/** The Attende backend (server/): node, dummy env, in-memory Mongo, fake JSYNQ and Stripe. */
const serverConfig = {
  displayName: "server",
  testEnvironment: "node",
  testMatch: ["<rootDir>/server/test/**/*.test.ts"],
  setupFiles: ["<rootDir>/server/test/setupEnv.ts"],
  ...moduleResolution,
  moduleNameMapper: { ...moduleResolution.moduleNameMapper, "^server-only$": "<rootDir>/server/test/serverOnlyStub.js" },
}

module.exports = async () => ({
  // The server integration tests start an in-memory Mongo and fake HTTP services.
  testTimeout: 60000,
  projects: [await createJestConfig(appConfig)(), await createJestConfig(serverConfig)()],
})
