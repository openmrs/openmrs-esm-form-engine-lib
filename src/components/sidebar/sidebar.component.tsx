import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading } from '@carbon/react';
import { useLayoutType } from '@openmrs/esm-framework';
import { isPageContentVisible } from '../../utils/form-helper';
import { useCurrentActivePage } from './useCurrentActivePage';
import { usePageObserver } from './usePageObserver';
import type { FormPage, SessionMode } from '../../types';
import styles from './sidebar.scss';

interface SidebarProps {
  defaultPage: string;
  isFormSubmitting: boolean;
  sessionMode: SessionMode;
  onCancel: () => void;
  handleClose: () => void;
  hideFormCollapseToggle: () => void;
  hideControls?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  defaultPage,
  isFormSubmitting,
  sessionMode,
  onCancel,
  handleClose,
  hideFormCollapseToggle,
  hideControls,
}) => {
  const { t } = useTranslation();
  const { pages, pagesWithErrors, activePages, evaluatedPagesVisibility } = usePageObserver();
  const { currentActivePage, requestPage } = useCurrentActivePage({
    pages,
    defaultPage,
    activePages,
    evaluatedPagesVisibility,
  });
  const layout = useLayoutType();
  const responsiveSize = useMemo(() => {
    const isTablet = layout === 'tablet';
    return isTablet ? 'lg' : 'sm';
  }, [layout]);

  return (
    <div className={styles.sidebar}>
      {pages
        .filter((page) => isPageContentVisible(page))
        .map((page) => (
          <PageLink
            key={page.id}
            page={page}
            currentActivePage={currentActivePage}
            pagesWithErrors={pagesWithErrors}
            requestPage={requestPage}
          />
        ))}
      {sessionMode !== 'view' && !hideControls && <hr className={styles.divider} />}

      {!hideControls && (
        <div className={styles.sideNavActions}>
          {sessionMode !== 'view' && (
            <Button className={styles.saveButton} disabled={isFormSubmitting} type="submit" size={responsiveSize}>
              {isFormSubmitting ? (
                <InlineLoading description={t('submitting', 'Submitting') + '...'} />
              ) : (
                <span>{`${t('save', 'Save')}`}</span>
              )}
            </Button>
          )}
          <Button
            className={classNames(styles.closeButton, {
              [styles.topMargin]: sessionMode === 'view',
            })}
            kind="tertiary"
            onClick={() => {
              onCancel?.();
              handleClose?.();
              hideFormCollapseToggle();
            }}
            size={responsiveSize}>
            {sessionMode === 'view' ? t('close', 'Close') : t('cancel', 'Cancel')}
          </Button>
        </div>
      )}
    </div>
  );
};

interface PageLinkProps {
  page: FormPage;
  currentActivePage: string;
  pagesWithErrors: string[];
  requestPage: (page: string) => void;
}

function PageLink({ page, currentActivePage, pagesWithErrors, requestPage }: PageLinkProps) {
  const { t } = useTranslation();
  const isActive = page.id === currentActivePage;
  const hasError = pagesWithErrors.includes(page.id);
  const isTablet = useLayoutType() === 'tablet';
  return (
    <div
      className={classNames(styles.pageLink, {
        [styles.activePage]: isActive && !hasError,
        [styles.errorPage]: hasError && !isActive,
        [styles.activeErrorPage]: hasError && isActive,
        [styles.pageLinkTablet]: isTablet,
      })}>
      <button
        onClick={(e) => {
          e.preventDefault();
          requestPage(page.id);
        }}>
        <span>{t(page.label)}</span>
      </button>
    </div>
  );
}

export default Sidebar;
