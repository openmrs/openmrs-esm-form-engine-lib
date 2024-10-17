/** @type {import('jest').Config} */
module.exports = {
  verbose: true,
  clearMocks: true,
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
    },
  },
  coverageReporters: ['json-summary', 'lcov'],
  collectCoverageFrom: ['./src/**', '!./src/components/**/*.snap'],
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!@openmrs)'],
  moduleDirectories: ['node_modules', '__mocks__', __dirname],
  moduleNameMapper: {
    '^dexie$': require.resolve('dexie'),
    '\\.(s?css)$': 'identity-obj-proxy',
    '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
    '^react-i18next$': '<rootDir>/__mocks__/react-i18next.js',
    'lodash-es': 'lodash',
    'react-markdown': '<rootDir>/__mocks__/react-markdown.tsx',
    '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironment: 'jsdom',
};
