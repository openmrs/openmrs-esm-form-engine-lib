import { useState, useEffect } from 'react';
import { type FormPage } from '../../types';
import { pageObserver } from './page-observer';

interface PageObserverState {
  pages: FormPage[];
  pagesWithErrors: string[];
  activePages: string[];
  evaluatedPagesVisibility: boolean;
  hasMultiplePages: boolean | null;
}

export const usePageObserver = () => {
  const [state, setState] = useState<PageObserverState>({
    pages: [],
    pagesWithErrors: [],
    activePages: [],
    evaluatedPagesVisibility: false,
    hasMultiplePages: null,
  });

  useEffect(() => {
    const subscriptions = [
      pageObserver.getScrollablePagesObservable().subscribe((pages) => {
        setState((prev) => ({ ...prev, pages, hasMultiplePages: pages.length > 1 }));
      }),

      pageObserver.getPagesWithErrorsObservable().subscribe((errors) => {
        setState((prev) => ({ ...prev, pagesWithErrors: Array.from(errors) }));
      }),

      pageObserver.getActivePagesObservable().subscribe((activePages) => {
        setState((prev) => ({ ...prev, activePages: Array.from(activePages) }));
      }),

      pageObserver.getEvaluatedPagesVisibilityObservable().subscribe((evaluated) => {
        setState((prev) => ({ ...prev, evaluatedPagesVisibility: evaluated }));
      }),
    ];

    return () => subscriptions.forEach((sub) => sub.unsubscribe());
  }, []);

  return state;
};
