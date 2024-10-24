import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { type SessionMode, type FormPage } from '../../types';
import styles from './sidebar.scss';
import { scrollIntoView } from '../../utils/form-helper';
import { pageObserver } from './page-observer';

interface SidebarProps {
  defaultPage: string;
  isFormSubmitting: boolean;
  sessionMode: SessionMode;
  onCancel: () => void;
  handleClose: () => void;
  hideFormCollapseToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  defaultPage,
  isFormSubmitting,
  sessionMode,
  onCancel,
  handleClose,
  hideFormCollapseToggle,
}) => {
  const { t } = useTranslation();
  const [pages, setPages] = useState<Array<FormPage>>([]);
  const [currentActivePage, setCurrentActivePage] = useState<string | null>(null);
  const [pagesWithErrors, setPagesWithErrors] = useState<Array<string>>([]);
  const [requestedPage, setRequestedPage] = useState('');
  const [visitedInitialPage, setVisitedInitialPage] = useState(false);
  const [evaluatedPagesVisibility, setEvaluatedPagesVisibility] = useState(false);

  useEffect(() => {
    const scrollablePagesSubscription = pageObserver.getScrollablePagesObservable().subscribe((pages) => {
      setPages(pages);
    });

    const pagesWithErrorsSubscription = pageObserver.getPagesWithErrorsObservable().subscribe((errors) => {
      setPagesWithErrors(Array.from(errors));
    });

    const activePagesSubscription = pageObserver.getActivePagesObservable().subscribe((activePages) => {
      const activePage = determineHighlightedPage(requestedPage, Array.from(activePages));
      if (requestedPage && activePage === requestedPage) {
        // found requested page, clear request
        console.log('Arrived, clearing page request!');
        setRequestedPage('');
      } else if (!requestedPage) {
        console.log('Setting active page: ', activePage);
        setCurrentActivePage(activePage);
      }
    });

    const evaluatedPagesVisibilitySubscription = pageObserver
      .getEvaluatedPagesVisibilityObservable()
      .subscribe((evaluated) => {
        setEvaluatedPagesVisibility(evaluated);
      });

    return () => {
      scrollablePagesSubscription.unsubscribe();
      pagesWithErrorsSubscription.unsubscribe();
      evaluatedPagesVisibilitySubscription.unsubscribe();
      activePagesSubscription.unsubscribe();
    };
  }, [requestedPage]);

  useEffect(() => {
    const defaultPageObject = pages.find(({ label }) => label === defaultPage);
    if (defaultPageObject && !defaultPageObject.isHidden && !visitedInitialPage) {
      scrollIntoView(defaultPageObject.id);
      setVisitedInitialPage(true);
    } else if (evaluatedPagesVisibility && !visitedInitialPage) {
      setCurrentActivePage(pages.find((page) => !page.isHidden)?.id);
      setVisitedInitialPage(true);
    }
  }, [defaultPage, pages, visitedInitialPage, evaluatedPagesVisibility]);

  const handlePageRequest = useCallback((requestedPage: string) => {
    setRequestedPage(requestedPage);
    scrollIntoView(requestedPage);
    setCurrentActivePage(requestedPage);
  }, []);

  return (
    <div className={styles.sidebar}>
      {pages.map((page) => {
        if (page.isHidden) return null;

        const isActive = page.id === currentActivePage;
        const hasError = pagesWithErrors.includes(page.id);
        console.log({ isActive, theActivePage: page.id });
        return (
          <div
            className={classNames(styles.tab, {
              [styles.activeTab]: isActive && !hasError,
              [styles.errorTab]: hasError && !isActive,
              [styles.activeErrorTab]: hasError && isActive,
            })}>
            <button
              onClick={(e) => {
                e.preventDefault();
                handlePageRequest(page.id);
              }}>
              <span>{page.label}</span>
            </button>
          </div>
        );
      })}
      {sessionMode !== 'view' && <hr className={styles.divider} />}

      <div className={styles.sidenavActions}>
        {sessionMode !== 'view' && (
          <Button className={styles.saveButton} disabled={isFormSubmitting} type="submit">
            {t('save', 'Save')}
          </Button>
        )}
        <Button
          className={classNames(styles.saveButton, {
            [styles.topMargin]: sessionMode === 'view',
          })}
          kind="tertiary"
          onClick={() => {
            onCancel?.();
            handleClose?.();
            hideFormCollapseToggle();
          }}>
          {sessionMode === 'view' ? t('close', 'Close') : t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );
};

/**
 * Determines the current active page based on user request and viewport visibility.
 *
 * @param requestedPage - The page ID requested by the user, if any.
 * @param activePages - An array of page IDs currently visible in the viewport.
 * @returns The ID of the page to be highlighted as current.
 *
 * Priority:
 * 1. If the requested page is among the active pages, it is returned.
 * 2. Otherwise, returns the topmost visible page.
 */
function determineHighlightedPage(requestedPage: string, activePages: Array<string>): string {
  if (activePages.includes(requestedPage)) {
    return requestedPage;
  }
  const sorted = activePages.sort((a, b) => extractPageIndexFromId(a) - extractPageIndexFromId(b));
  return sorted[0];
}

function extractPageIndexFromId(pageId: string) {
  // Split the pageId by '-' and get the last element
  const parts = pageId.split('-');
  const lastPart = parts[parts.length - 1];
  const index = parseInt(lastPart, 10);

  return isNaN(index) ? -1 : index;
}

export default Sidebar;
