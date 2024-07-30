import React from 'react';
import { useTranslation } from 'react-i18next';
import { ValueDisplay } from '../value/value.component';
import styles from './previous-value-review.scss';
import { type FormField } from '../../types';
import { useFormProviderContext } from '../../provider/form-provider';

type PreviousValueReviewProps = {
  previousValue: any;
  displayText: string;
  field: FormField;
  hideHeader?: boolean;
  onAfterChange: (value) => void;
};

const PreviousValueReview: React.FC<PreviousValueReviewProps> = ({
  previousValue,
  displayText,
  field,
  hideHeader,
  onAfterChange,
}) => {
  const { t } = useTranslation();
  const {
    methods: { setValue },
  } = useFormProviderContext();

  const onReuseValue = (e) => {
    e.preventDefault();
    setValue(field.id, previousValue);
    onAfterChange(previousValue);
  };

  return (
    <div className={styles.formField}>
      <div className={styles.row}>
        {!hideHeader && <div>{t('previousValue', 'Previous value:')}</div>}
        <div className={styles.value}>
          <ValueDisplay value={displayText} />
        </div>
      </div>
      <div className={styles.reuseButton} role="button" tabIndex={0} onClick={onReuseValue}>
        {t('reuseValue', 'Reuse value')}
      </div>
    </div>
  );
};

export default PreviousValueReview;
