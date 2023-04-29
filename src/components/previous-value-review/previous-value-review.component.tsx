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
    <div className={styles.formField} style={{ marginLeft: '2rem', maxWidth: '19rem' }}>
      {!hideHeader && (
        <div>
          <span className="cds--label">{t('previously', 'Previously')}</span>
        </div>
      )}
      <div className={styles.row}>
        <div style={{ width: '100%' }}>
          <OHRIValueDisplay value={displayText} />
        </div>
        <div style={{ width: '100%', marginLeft: '1rem' }}>
          <Button
            kind="ghost"
            style={{ verticalAlign: 'baseline' }}
            onClick={e => {
              e.preventDefault();
              setValue(value);
            }}>
            {t('useValue', 'Use value')}
          </Button>
        </div>
      </div>
    </div>
  );
};
