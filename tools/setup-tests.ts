import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import ResizeObserver from 'resize-observer-polyfill';

global.ResizeObserver = ResizeObserver;

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
