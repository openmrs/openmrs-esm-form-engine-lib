import { useState, useEffect, useCallback, useRef } from 'react';
import { type FormPage } from '../../types';
import { scrollIntoView } from '../../utils/form-helper';

interface UseCurrentActivePageProps {
  pages: FormPage[];
  defaultPage: string;
  activePages: string[];
  evaluatedPagesVisibility: boolean;
}

interface UseCurrentActivePageResult {
  currentActivePage: string | null;
  requestPage: (pageId: string) => void;
}

/**
 * Hook to manage the currently active page in a form sidebar.
 *
 * This implementation includes a locking mechanism to handle a specific limitation with Waypoint:
 * When dealing with short forms where multiple pages are visible in the viewport simultaneously,
 * Waypoint's initial visibility detection can be unpredictable. It might:
 * 1. Report pages in a different order than their DOM position
 * 2. Miss reporting some visible pages in the first few renders
 * 3. Report visibility events before our desired initial scroll position is established
 *
 * The locking mechanism (isInitialPhaseRef) prevents these early Waypoint events from
 * overriding our intended initial page selection. Without this lock:
 * - The form might initially select the first page
 * - But then immediately jump to a different page due to Waypoint's visibility events
 * - This creates a jarring user experience where the form appears to "jump" during initialization
 *
 * The lock is released either:
 * 1. Automatically after a timeout (allowing for initial render and scroll stabilization)
 * 2. Immediately when the user explicitly interacts with the form
 */
export const useCurrentActivePage = ({
  pages,
  defaultPage,
  activePages,
  evaluatedPagesVisibility,
}: UseCurrentActivePageProps): UseCurrentActivePageResult => {
  const [currentActivePage, setCurrentActivePage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [requestedPage, setRequestedPage] = useState<string | null>(null);
  const isInitialPhaseRef = useRef(true);

  // Initialize the active page
  useEffect(() => {
    if (isInitialized || !evaluatedPagesVisibility) return;

    const initializePage = () => {
      // Try to find and set the default page
      const defaultPageObject = pages.find(({ label }) => label === defaultPage);

      if (defaultPageObject && !defaultPageObject.isHidden) {
        setCurrentActivePage(defaultPageObject.id);
        scrollIntoView(defaultPageObject.id);
      } else {
        // Fall back to first visible page
        const firstVisiblePage = pages.find((page) => !page.isHidden);
        if (firstVisiblePage) {
          setCurrentActivePage(firstVisiblePage.id);
        }
      }
    };

    initializePage();
    setIsInitialized(true);
  }, [pages, defaultPage, evaluatedPagesVisibility, isInitialized]);

  useEffect(() => {
    let initialLockTimeout = null;
    // Lock out Waypoint updates for 200ms to allow for:
    // 1. Initial render completion
    // 2. Scroll position establishment
    // 3. Waypoint to complete its initial visibility detection
    if (isInitialized) {
      initialLockTimeout = setTimeout(() => {
        isInitialPhaseRef.current = false;
      }, 200);
    }

    // Cleanup
    return () => {
      if (initialLockTimeout) {
        clearTimeout(initialLockTimeout);
      }
    };
  }, [isInitialized]);

  // Handle active pages updates from viewport visibility
  useEffect(() => {
    if (isInitialPhaseRef.current) return;

    let clearRequestTimeout: NodeJS.Timeout | null = null;

    // If there's a requested page and it's visible, keep it active
    if (requestedPage && activePages.includes(requestedPage)) {
      setCurrentActivePage(requestedPage);
      clearRequestTimeout = setTimeout(() => {
        setRequestedPage(null);
      }, 100);
      return;
    }

    // If there's no requested page, use the topmost visible page
    if (!requestedPage && activePages.length > 0) {
      const topVisiblePage = activePages.reduce((top, current) => {
        const topIndex = pages.findIndex((page) => page.id === top);
        const currentIndex = pages.findIndex((page) => page.id === current);
        return topIndex < currentIndex ? top : current;
      });

      setCurrentActivePage(topVisiblePage);
    }

    return () => {
      if (clearRequestTimeout) {
        clearTimeout(clearRequestTimeout);
      }
    };
  }, [activePages, requestedPage, pages]);

  // Handle page requests
  const requestPage = useCallback((pageId: string) => {
    isInitialPhaseRef.current = false; // Release the lock on explicit user interaction
    setRequestedPage(pageId);
    setCurrentActivePage(pageId);
    scrollIntoView(pageId);
  }, []);

  return {
    currentActivePage,
    requestPage,
  };
};
