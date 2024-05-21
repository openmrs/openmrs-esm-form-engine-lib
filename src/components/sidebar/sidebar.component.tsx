import React, { useCallback, useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button, Toggle } from '@carbon/react';
import { isEmpty } from '../../validators/form-validator';
import { scrollIntoView } from '../../utils/scroll-into-view';
import { type FormPage } from '../../types';
import styles from './sidebar.scss';

interface SidebarProps {
  allowUnspecifiedAll: boolean;
  defaultPage: string;
  handleClose: () => void;
  hideFormCollapseToggle: () => void;
  isFormSubmitting: boolean;
  mode: string;
  onCancel: () => void;
  pagesWithErrors: string[];
  scrollablePages: Set<FormPage>;
  selectedPage: string;
  setValues: (values: unknown) => void;
  values: object;
}

const Sidebar: React.FC<SidebarProps> = ({
  allowUnspecifiedAll,
  defaultPage,
  handleClose,
  hideFormCollapseToggle,
  isFormSubmitting,
  mode,
  onCancel,
  pagesWithErrors,
  scrollablePages,
  selectedPage,
  setValues,
  values,
}) => {
  const { t } = useTranslation();
  const pages: Array<FormPage> = Array.from(scrollablePages);

  useEffect(() => {
    if (defaultPage && pages.some(({ label, isHidden }) => label === defaultPage && !isHidden)) {
      scrollIntoView(joinWord(defaultPage));
    }
  }, [defaultPage, scrollablePages]);

  const unspecifiedFields = useMemo(
    () =>
      Object.keys(values).filter(
        (key) => key.endsWith('-unspecified') && isEmpty(values[key.split('-unspecified')[0]]),
      ),
    [values],
  );

  const handleClick = (selected) => {
    const activeId = joinWord(selected);
    scrollIntoView(activeId);
  };

  const markAllAsUnspecified = useCallback(
    (toggled) => {
      const updatedValues = { ...values };
      unspecifiedFields.forEach((field) => {
        updatedValues[field] = toggled;
      });
      setValues(updatedValues);
    },
    [unspecifiedFields, values, setValues],
  );

  return (
    <div className={styles.sidebar}>
      {pages.map((page, index) => {
        if (page.isHidden) return null;

        const isCurrentlySelected = joinWord(page.label) === selectedPage;
        const hasError = pagesWithErrors.includes(page.label);

        return (
          <div
            aria-hidden="true"
            className={classNames({
              [styles.erroredSection]: isCurrentlySelected && hasError,
              [styles.activeSection]: isCurrentlySelected && !hasError,
              [styles.activeErroredSection]: !isCurrentlySelected && hasError,
              [styles.section]: !isCurrentlySelected && !hasError,
            })}
            key={index}
            onClick={() => handleClick(page.label)}>
            <div className={styles.sectionLink}>{page.label}</div>
          </div>
        );
      })}
      {mode !== 'view' && <hr className={styles.divider} />}
      <div className={styles.sidenavActions}>
        {allowUnspecifiedAll && mode !== 'view' && (
          <div className={styles.toggleContainer}>
            <Toggle
              id="auto-unspecifier"
              labelA={t('unspecifyAll', 'Unspecify All')}
              labelB={t('revert', 'Revert')}
              labelText=""
              onToggle={markAllAsUnspecified}
            />
          </div>
        )}
        {mode !== 'view' && (
          <Button className={styles.saveButton} disabled={isFormSubmitting} type="submit">
            {t('save', 'Save')}
          </Button>
        )}
        <Button
          className={classNames(styles.saveButton, {
            [styles.topMargin]: mode === 'view',
          })}
          kind="tertiary"
          onClick={() => {
            onCancel?.();
            handleClose?.();
            hideFormCollapseToggle();
          }}>
          {mode === 'view' ? t('close', 'Close') : t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );
};

function joinWord(value) {
  return value.replace(/\s/g, '');
}

export default Sidebar;
