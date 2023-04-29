import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Toggle } from '@carbon/react';
import { isEmpty } from '../../validators/ohri-form-validator';
import { scrollIntoView } from '../../utils/ohri-sidebar';
import styles from './ohri-form-sidebar.scss';

function OHRIFormSidebar({
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
  const [activeLink, setActiveLink] = useState(selectedPage);

  useEffect(() => {
    if (defaultPage && [...scrollablePages].find(({ label, isHidden }) => label === defaultPage && !isHidden)) {
      scrollIntoView(joinWord(defaultPage));
    }
  }, [defaultPage]);

  const joinWord = value => {
    return value.replace(/\s/g, '');
  };

  const unspecifiedFields = useMemo(() => {
    return (
      Object.keys(values)
        .filter(key => key.endsWith('-unspecified'))
        // find parent control
        .map(key => key.split('-unspecified')[0])
        // factor-out those with values
        .filter(key => isEmpty(values[key]))
        // return the unspecified control keys
        .map(key => `${key}-unspecified`)
    );
  }, [values]);

  const handleClick = selected => {
    const activeID = selected.replace(/\s/g, '');
    setActiveLink(selected);
    scrollIntoView(activeID);
  };

  const markAllAsUnspecified = useCallback(
    toggled => {
      if (toggled) {
        unspecifiedFields.forEach(field => {
          values[field] = true;
        });
      } else {
        unspecifiedFields.forEach(field => {
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
        return (
          !page.isHidden && (
            <div
              aria-hidden="true"
              className={
                joinWord(page.label) === selectedPage && pagesWithErrors.includes(page.label)
                  ? styles.sidebarSectionErrorActive
                  : joinWord(page.label) === selectedPage
                  ? styles.sidebarSectionActive
                  : pagesWithErrors.includes(page.label)
                  ? styles.sidebarSectionError
                  : styles.sidebarSection
              }
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
              labelA="Unspecify All"
              labelB="Revert"
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
          {mode == 'view' ? 'Close' : 'Cancel'}
        </Button>
      </div>
    </div>
  );
}

export default OHRIFormSidebar;
