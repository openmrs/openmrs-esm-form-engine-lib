import openmrs from '@openmrs/eslint-config';

export default [
  { ignores: ['dist/**', 'coverage/**', '**/*.d.ts'] },
  ...openmrs,
  {
    rules: {
      // Rules this repo enforces where the shared config turns them off. It
      // disabled ban-types deliberately, so that rule's successors stay off.
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',
      'no-extra-boolean-cast': 'error',
      'no-prototype-builtins': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-useless-escape': 'error',
      // `x && f()` as a statement is an idiom here. Keeping the rest of the
      // rule matters: it found an `expect(...).toBeInTheDocument` that never ran.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true }],
    },
  },
  {
    // The shared config lints tests with testing-library for the first time
    // here. These three need the tests reworked rather than reformatted, so
    // they are off until that happens.
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'testing-library/no-manual-cleanup': 'off',
      'testing-library/no-unnecessary-act': 'off',
      'testing-library/render-result-naming-convention': 'off',
    },
  },
];
