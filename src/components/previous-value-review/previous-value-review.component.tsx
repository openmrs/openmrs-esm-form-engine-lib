import React from 'react';
import { useTranslation } from 'react-i18next';
import { ValueDisplay } from '../value/value.component';
import styles from './previous-value-review.scss';

type Props = {
  previousValue: any;
  displayText: string;
  setValue: (value) => void;
  field?: string;
  hideHeader?: boolean;
};

const PreviousValueReview: React.FC<Props> = ({ previousValue, displayText, setValue, field, hideHeader }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.formField}>
      <div className={styles.row}>
        {!hideHeader && <div>{t('previousValue', 'Previous value:')}</div>}
        <div className={styles.value}>
          <ValueDisplay value={displayText} />
        </div>
      </div>
      <div
        className={styles.reuseButton}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          setValue((prevValue) => {
            return {
              ...prevValue,
              [field]: previousValue,
            };
          });
        }}>
        reuse value
      </div>
    </div>
  );
};

export default PreviousValueReview;
