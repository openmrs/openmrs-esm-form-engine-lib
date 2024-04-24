import '@testing-library/jest-dom';
import 'jest-when';

// https://github.com/jsdom/jsdom/issues/1695
window.HTMLElement.prototype.scrollIntoView = function () {};
