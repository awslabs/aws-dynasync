module.exports = {
  testEnvironment: 'node',
  //roots: ['<rootDir>/test/unit'],
  testMatch: ['<rootDir>/test/unit/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  coverageThreshold: {
    global: {
      statements: 80,
      lines: 80,
      functions: 80,
      branches: 80
    }
  }
};
