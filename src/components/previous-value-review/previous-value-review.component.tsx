import React from 'react';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OHRIValueDisplay } from '../value/ohri-value.component';
import styles from './previous-value-review.scss';

export const PreviousValueReview: React.FC<{
  value: any;
  displayText: string;
  setValue: (value: any) => void;
  hideHeader?: boolean;
}> = ({ value, displayText, setValue, hideHeader }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.formField}>
      {!hideHeader && <span className="cds--label">{t('previousValue', 'Previous value')}</span>}
      <div className={styles.row}>
        <OHRIValueDisplay value={displayText} />
        <Button
          className={styles.reuseButton}
          kind="ghost"
          onClick={e => {
            e.preventDefault();
            setValue(value);
          }}>
          {t('reuse', 'Reuse')}
        </Button>
      </div>
    </div>
  );
};
