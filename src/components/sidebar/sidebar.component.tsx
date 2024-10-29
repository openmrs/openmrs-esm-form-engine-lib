import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { type SessionMode } from '../../types';
import styles from './sidebar.scss';
import { usePageObserver } from './usePageObserver';
import { useCurrentActivePage } from './useCurrentActivePage';
import { isPageContentVisible } from '../../utils/form-helper';
import { InlineLoading } from '@carbon/react';

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
  const { pages, pagesWithErrors, activePages, evaluatedPagesVisibility } = usePageObserver();
  const { currentActivePage, requestPage } = useCurrentActivePage({
    pages,
    defaultPage,
    activePages,
    evaluatedPagesVisibility,
  });

  return (
    <div className={styles.sidebar}>
      {pages
        .filter((page) => isPageContentVisible(page))
        .map((page) => {
          const isActive = page.id === currentActivePage;
          const hasError = pagesWithErrors.includes(page.id);
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
                  requestPage(page.id);
                }}>
                <span>{page.label}</span>
              </button>
            </div>
          );
        })}
      {sessionMode !== 'view' && <hr className={styles.divider} />}

      <div className={styles.sideNavActions}>
        {sessionMode !== 'view' && (
          <Button className={styles.saveButton} disabled={isFormSubmitting} type="submit">
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
          }}>
          {sessionMode === 'view' ? t('close', 'Close') : t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
