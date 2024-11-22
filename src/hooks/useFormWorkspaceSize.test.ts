import { renderHook } from '@testing-library/react';
import { useFormWorkspaceSize } from './useFormWorkspaceSize';
import { act } from 'react';

// Mock the pxToRem utility
jest.mock('../utils/common-utils', () => ({
  pxToRem: (px: number) => px / 16, // Simulate px to rem conversion (1rem = 16px)
}));

// Mock ResizeObserver with callback ref
let resizeCallback: (entries: any[]) => void;
class ResizeObserverMock {
  constructor(callback: (entries: any[]) => void) {
    resizeCallback = callback;
  }
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = ResizeObserverMock as any;

describe('useFormWorkspaceSize', () => {
  let ref: { current: HTMLDivElement | null };
  let parentElement: HTMLDivElement;

  beforeEach(() => {
    // Create DOM elements
    parentElement = document.createElement('div');
    const element = document.createElement('div');
    parentElement.appendChild(element);
    // ref
    ref = { current: element };

    // Mock offsetWidth getter
    Object.defineProperty(parentElement, 'offsetWidth', {
      configurable: true,
      value: 400,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const setParentWidth = (width: number) => {
    Object.defineProperty(parentElement, 'offsetWidth', {
      configurable: true,
      value: width,
    });
    if (typeof resizeCallback !== 'function') {
      return;
    }
    // Trigger resize callback
    act(() => {
      resizeCallback([{ target: parentElement }]);
    });
  };

  it('should return "narrow" for width <= 26.25rem (420px)', () => {
    setParentWidth(420);
    const { result } = renderHook(() => useFormWorkspaceSize(ref));
    expect(result.current).toBe('narrow');
  });

  it('should return "wider" for width <= 32.25rem (516px)', () => {
    setParentWidth(516);
    const { result } = renderHook(() => useFormWorkspaceSize(ref));
    expect(result.current).toBe('wider');
  });

  it('should return "extra-wide" for width <= 48.25rem (772px)', () => {
    setParentWidth(772);
    const { result } = renderHook(() => useFormWorkspaceSize(ref));
    expect(result.current).toBe('extra-wide');
  });

  it('should return "ultra-wide" for width > 48.25rem (772px)', () => {
    setParentWidth(1000);
    const { result } = renderHook(() => useFormWorkspaceSize(ref));
    expect(result.current).toBe('ultra-wide');
  });

  it('should handle null ref', () => {
    const nullRef = { current: null };
    const { result } = renderHook(() => useFormWorkspaceSize(nullRef));
    expect(result.current).toBe('narrow');
  });

  it('should update size when container width changes', () => {
    const { result } = renderHook(() => useFormWorkspaceSize(ref));

    // Start with narrow
    act(() => {
      setParentWidth(400);
    });
    expect(result.current).toBe('narrow');

    // Change to wider
    act(() => {
      setParentWidth(516);
    });
    expect(result.current).toBe('wider');

    // Change to extra-wide
    act(() => {
      setParentWidth(772);
    });
    expect(result.current).toBe('extra-wide');

    // Change to ultra-wide
    act(() => {
      setParentWidth(1000);
    });
    expect(result.current).toBe('ultra-wide');
  });
});
