import { useCurrentActivePage } from './useCurrentActivePage';
import { scrollIntoView } from '../../utils/form-helper';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { type FormPage } from '../../types';

jest.mock('../../utils/form-helper', () => ({
  scrollIntoView: jest.fn(),
}));

describe('useCurrentActivePage', () => {
  const mockPages = [
    { id: 'page-1', label: 'Page 1', isHidden: false },
    { id: 'page-2', label: 'Page 2', isHidden: false },
    {
      id: 'page-3',
      label: 'Page 3',
      isHidden: false,
    },
    { id: 'page-4', label: 'Page 4', isHidden: false },
    { id: 'page-5', label: 'Hidden Page', isHidden: true },
  ] as Array<FormPage>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default page when available and not hidden', () => {
      const { result } = renderHook(() =>
        useCurrentActivePage({
          pages: mockPages,
          defaultPage: 'Page 2',
          activePages: [],
          evaluatedPagesVisibility: true,
        }),
      );

      expect(result.current.currentActivePage).toBe('page-2');
      expect(scrollIntoView).toHaveBeenCalledWith('page-2');
    });

    it('should initialize with first visible page when default page is hidden', () => {
      const { result } = renderHook(() =>
        useCurrentActivePage({
          pages: mockPages,
          defaultPage: 'Hidden Page',
          activePages: [],
          evaluatedPagesVisibility: true,
        }),
      );

      expect(result.current.currentActivePage).toBe('page-1');
    });

    it('should not initialize until evaluatedPagesVisibility is true', () => {
      const { result, rerender } = renderHook(
        ({ evaluated }) =>
          useCurrentActivePage({
            pages: mockPages,
            defaultPage: 'Page 1',
            activePages: [],
            evaluatedPagesVisibility: evaluated,
          }),
        { initialProps: { evaluated: false } },
      );

      expect(result.current.currentActivePage).toBeNull();

      rerender({ evaluated: true });
      expect(result.current.currentActivePage).toBe('page-1');
    });

    it('should handle empty pages array', () => {
      const { result } = renderHook(() =>
        useCurrentActivePage({
          pages: [],
          defaultPage: 'Page 1',
          activePages: [],
          evaluatedPagesVisibility: true,
        }),
      );

      expect(result.current.currentActivePage).toBeNull();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('should handle all hidden pages', () => {
      const allHiddenPages = mockPages.map((page) => ({ ...page, isHidden: true }));
      const { result } = renderHook(() =>
        useCurrentActivePage({
          pages: allHiddenPages,
          defaultPage: 'Page 1',
          activePages: [],
          evaluatedPagesVisibility: true,
        }),
      );

      expect(result.current.currentActivePage).toBeNull();
    });
  });

  describe('Waypoint Interaction', () => {
    it('should ignore Waypoint updates during initial phase', () => {
      const { result } = renderHook(() =>
        useCurrentActivePage({
          pages: mockPages,
          defaultPage: 'Page 1',
          activePages: ['page-2'],
          evaluatedPagesVisibility: true,
        }),
      );

      expect(result.current.currentActivePage).toBe('page-1');

      // Fast-forward halfway through the lock timeout
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Should still be on initial page
      expect(result.current.currentActivePage).toBe('page-1');
    });

    it('should respect Waypoint updates after initial phase', () => {
      const { result, rerender } = renderHook(() =>
        useCurrentActivePage({
          pages: mockPages,
          defaultPage: 'Page 1',
          activePages: ['page-2'],
          evaluatedPagesVisibility: true,
        }),
      );

      // Fast-forward past the lock timeout
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Update active pages
      rerender({
        pages: mockPages,
        defaultPage: 'Page 1',
        activePages: ['page-2'],
        evaluatedPagesVisibility: true,
      });

      expect(result.current.currentActivePage).toBe('page-2');
    });

    it('should select topmost visible page when multiple pages are visible', () => {
      const { result } = renderHook(() =>
        useCurrentActivePage({
          pages: mockPages,
          defaultPage: 'Page 1',
          activePages: ['page-2', 'page-1', 'page-3'],
          evaluatedPagesVisibility: true,
        }),
      );

      // Fast-forward past the lock timeout
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.currentActivePage).toBe('page-1');
    });
  });

  describe('User Interaction', () => {
    it('should handle page requests and scroll to requested page', () => {
      const { result } = renderHook(() =>
        useCurrentActivePage({
          pages: mockPages,
          defaultPage: 'Page 1',
          activePages: ['page-1'],
          evaluatedPagesVisibility: true,
        }),
      );

      act(() => {
        result.current.requestPage('page-2');
      });

      expect(result.current.currentActivePage).toBe('page-2');
      expect(scrollIntoView).toHaveBeenCalledWith('page-2');
    });

    it('should maintain requested page if visible, even when other pages become visible', () => {
      const { result, rerender } = renderHook(() =>
        useCurrentActivePage({
          pages: mockPages,
          defaultPage: 'Page 1',
          activePages: ['page-2'],
          evaluatedPagesVisibility: true,
        }),
      );

      // Request a specific page
      act(() => {
        result.current.requestPage('page-2');
      });

      // Update active pages to include multiple pages
      rerender({
        pages: mockPages,
        defaultPage: 'Page 1',
        activePages: ['page-1', 'page-2', 'page-3'],
        evaluatedPagesVisibility: true,
      });

      // Should maintain the requested page
      expect(result.current.currentActivePage).toBe('page-2');
    });
  });
});
