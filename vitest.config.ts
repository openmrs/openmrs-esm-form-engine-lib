import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^.*\.s?css$/, replacement: 'identity-obj-proxy' }],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
    setupFiles: ['./tools/setup-tests.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
    server: {
      deps: {
        inline: [/@openmrs/],
      },
    },
    fakeTimers: {
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'Date',
      ],
    },
    alias: [
      { find: '@openmrs/esm-framework/src/internal', replacement: '@openmrs/esm-framework/mock' },
      { find: '@openmrs/esm-framework', replacement: '@openmrs/esm-framework/mock' },
      { find: 'react-i18next', replacement: here('./__mocks__/react-i18next.js') },
      { find: 'react-markdown', replacement: here('./__mocks__/react-markdown.tsx') },
      { find: /^__mocks__$/, replacement: here('./__mocks__/index.ts') },
      { find: /^__mocks__\/(.*)$/, replacement: here('./__mocks__/') + '$1' },
      { find: /^src\/(.*)$/, replacement: here('./src/') + '$1' },
    ],
  },
});
