import React from 'react';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OHRIValueDisplay } from '../value/ohri-value.component';
import styles from './previous-value-review.scss';

type Props = {
  value: any;
  displayText: string;
  setValue: (value) => void;
  field?: string;
  hideHeader?: boolean;
};

export const PreviousValueReview: React.FC<Props> = ({ value, displayText, setValue, field, hideHeader }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.formField}>
      <div className={styles.row}>
        {!hideHeader && <div>{t('previousValue', 'Previous value:')}</div>}
        <div className={styles.value}>
          <OHRIValueDisplay value={displayText} />
        </div>
      </div>
      {/* <Button
        size="sm"
        className={styles.reuseButton}
        kind="ghost"
        onClick={(e) => {
          e.preventDefault();
          setValue((prevValue) => [...prevValue, { field: field, value: Array.isArray(value) ? value : value.value }]);
          // these variables are poorly renamed, will refactor
        }}>
        {t('reuse', 'Reuse')}
      </Button> */}
      <div
        className={styles.reuseButton}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          setValue((prevValue) => [...prevValue, { field: field, value: Array.isArray(value) ? value : value.value }]);
          // these variables are poorly renamed, will refactor
        }}>
        reuse value
      </div>
    </div>
  );
};
