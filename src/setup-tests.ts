import '@testing-library/jest-dom';
import 'jest-when';

global.ResizeObserver = require('resize-observer-polyfill');

// https://github.com/jsdom/jsdom/issues/1695
window.HTMLElement.prototype.scrollIntoView = function () {};

Object.defineProperty(window, 'i18next', {
  writable: true,
  configurable: true,
  value: {
    language: 'en',
    t: jest.fn(),
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
