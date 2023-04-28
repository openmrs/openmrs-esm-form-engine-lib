import '@testing-library/jest-dom/extend-expect';
import 'jest-when';

// https://github.com/jsdom/jsdom/issues/1695
window.HTMLElement.prototype.scrollIntoView = function() {};
