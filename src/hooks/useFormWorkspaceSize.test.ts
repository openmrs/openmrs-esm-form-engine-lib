import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { useFormWorkspaceSize } from './useFormWorkspaceSize';

// Mock the pxToRem utility
jest.mock('../utils/common-utils', () => ({
  pxToRem: (px: number) => px / 16, // Simulate px to rem conversion (1rem = 16px)
}));

describe('useFormWorkspaceSize', () => {
  let ref: { current: HTMLDivElement | null };
  let parentElement: HTMLDivElement;
  let resizeCallback: ResizeObserverCallback | null;
  let originalResizeObserver: typeof global.ResizeObserver;

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

    // Store original ResizeObserver
    originalResizeObserver = global.ResizeObserver;
    resizeCallback = null;

    // Store the ResizeObserver callback
    global.ResizeObserver = class MockResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    // Restore original ResizeObserver
    global.ResizeObserver = originalResizeObserver;
    resizeCallback = null;
  });

  const setParentWidth = (width: number) => {
    Object.defineProperty(parentElement, 'offsetWidth', {
      configurable: true,
      value: width,
    });
    // Trigger resize callback
    act(() => {
      if (resizeCallback) {
        const entry: ResizeObserverEntry = {
          target: parentElement,
          borderBoxSize: [{ blockSize: 0, inlineSize: width }],
          contentBoxSize: [{ blockSize: 0, inlineSize: width }],
          contentRect: {
            width,
            height: 0,
            x: 0,
            y: 0,
            top: 0,
            right: width,
            bottom: 0,
            left: 0,
            toJSON: () => ({}),
          },
          devicePixelContentBoxSize: [{ blockSize: 0, inlineSize: width }],
        };
        resizeCallback([entry], {} as ResizeObserver);
      }
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
