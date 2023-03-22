module.exports = {
  verbose: true,
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
  moduleNameMapper: {
    '\\.(s?css)$': 'identity-obj-proxy',
    '^@carbon/icons-react/es/(.*)$': '@carbon/icons-react/lib/$1',
    '^carbon-components-react/es/(.*)$': 'carbon-components-react/lib/$1',
    '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
    'react-i18next': '<rootDir>/__mocks__/react-i18next.js',
    'lodash-es': 'lodash',
    'react-markdown': '<rootDir>/__mocks__/react-markdown.tsx',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironment: 'jsdom',
};
