import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import ResizeObserver from 'resize-observer-polyfill';
import { resetFormEngineModuleState } from '../src/test-support/reset';
import { flushOpenmrsFetchRouter } from '../src/test-support/openmrs-fetch-router';

global.ResizeObserver = ResizeObserver;

// The engine keeps several pieces of module-level mutable state (adapter ID
// ledgers, AST cache, registry caches/stores, page-observer singleton). Vitest
// isolates test files, so without this, tests within a file are order-dependent:
// a test that renders a form leaks state into the next test. The router flush also
// fails any test whose fetches went unmatched.
afterEach(() => {
  resetFormEngineModuleState();
  flushOpenmrsFetchRouter();
});

// https://github.com/jsdom/jsdom/issues/1695
window.HTMLElement.prototype.scrollIntoView = function () {};

Object.defineProperty(window, 'i18next', {
  writable: true,
  configurable: true,
  value: {
    language: 'en',
    t: vi.fn(),
  },
});

// Mock getComputedStyle for consistent font size
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    fontSize: '16px',
    getPropertyValue: () => '',
  }),
});

// Mock window.getComputedStyle for elements
Object.defineProperty(HTMLElement.prototype, 'style', {
  configurable: true,
  get() {
    return {
      getPropertyValue: () => '',
      setProperty: () => {},
    };
  },
});
