const nextJest = require("next/jest")

const createJestConfig = nextJest({
  dir: "./",
})

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testPathIgnorePatterns: ["<rootDir>/e2e", ".*/__mocks__/.*"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  // Mirrors tsconfig baseUrl "." and paths "@/*": ["./src/*", "./*"]
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: { "^@/(.*)$": ["<rootDir>/src/$1", "<rootDir>/$1"] },
}

module.exports = createJestConfig(customJestConfig)
