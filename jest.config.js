const nextJest = require("next/jest");

const createJestConfig = nextJest({
	dir: "./",
});

const config = {
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	testEnvironment: "jsdom",
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
	clearMocks: true,
	resetMocks: true,
	// Use node environment for API route tests
	globals: {
		"ts-jest": {
			isolatedModules: true,
		},
	},
};

module.exports = createJestConfig(config);
