import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button, Toggle } from '@carbon/react';
import { isEmpty } from '../../validators/form-validator';
import { scrollIntoView } from '../../utils/scroll-into-view';
import styles from './sidebar.scss';

function Sidebar({
  isFormSubmitting,
  pagesWithErrors,
  scrollablePages,
  selectedPage,
  mode,
  onCancel,
  handleClose,
  values,
  setValues,
  allowUnspecifiedAll,
  defaultPage,
}) {
  const { t } = useTranslation();
  const [activeLink, setActiveLink] = useState(selectedPage);

  useEffect(() => {
    if (defaultPage && [...scrollablePages].find(({ label, isHidden }) => label === defaultPage && !isHidden)) {
      scrollIntoView(joinWord(defaultPage));
    }
  }, [defaultPage, scrollablePages]);

  const joinWord = (value) => {
    return value.replace(/\s/g, '');
  };

  const unspecifiedFields = useMemo(() => {
    return (
      Object.keys(values)
        .filter((key) => key.endsWith('-unspecified'))
        // find parent control
        .map((key) => key.split('-unspecified')[0])
        // factor-out those with values
        .filter((key) => isEmpty(values[key]))
        // return the unspecified control keys
        .map((key) => `${key}-unspecified`)
    );
  }, [values]);

  const handleClick = (selected) => {
    const activeID = selected.replace(/\s/g, '');
    setActiveLink(selected);
    scrollIntoView(activeID);
  };

  const markAllAsUnspecified = useCallback(
    (toggled) => {
      if (toggled) {
        unspecifiedFields.forEach((field) => {
          values[field] = true;
        });
      } else {
        unspecifiedFields.forEach((field) => {
          values[field] = false;
        });
      }
      setValues(values);
    },
    [unspecifiedFields],
  );

  return (
    <div className={styles.sidebar}>
      {[...scrollablePages].map((page, index) => {
        const isCurrentSelected = joinWord(page.label) === selectedPage;
        const hasError = pagesWithErrors.includes(page.label);

        return (
          !page.isHidden && (
            <div
              aria-hidden="true"
              className={classNames({
                [styles.sidebarSectionErrorActive]: isCurrentSelected && hasError,
                [styles.sidebarSectionActive]: isCurrentSelected && !hasError,
                [styles.sidebarSectionError]: !isCurrentSelected && hasError,
                [styles.sidebarSection]: !isCurrentSelected && !hasError,
              })}
              key={index}
              onClick={() => handleClick(page.label)}>
              <div className={styles.sidebarSectionLink}>{page.label}</div>
            </div>
          )
        );
      })}
      {mode !== 'view' && <hr className={styles.sideBarHorizontalLine} />}
      <div className={styles.sidenavActions}>
        {allowUnspecifiedAll && mode !== 'view' && (
          <div style={{ marginBottom: '.6rem' }}>
            <Toggle
              labelText=""
              id="auto-unspecifier"
              labelA={t('unspecifyAll', 'Unspecify All')}
              labelB={t('revert', 'Revert')}
              onToggle={markAllAsUnspecified}
            />
          </div>
        )}
        {mode != 'view' && (
          <Button style={{ marginBottom: '0.625rem', width: '11rem' }} type="submit" disabled={isFormSubmitting}>
            Save
          </Button>
        )}
        <Button
          style={{ width: '11rem', marginTop: mode == 'view' ? '1.5rem' : '0' }}
          kind="tertiary"
          onClick={() => {
            onCancel && onCancel();
            handleClose && handleClose();
          }}>
          {mode === 'view' ? t('close', 'Close') : t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );
}

export default Sidebar;
