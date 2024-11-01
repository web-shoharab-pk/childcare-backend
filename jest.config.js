module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"], // Add this line
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/tests/**',
    '!src/**/*.d.ts'
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  }
};
