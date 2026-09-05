import React from 'react';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { type FormFieldInputProps } from '../../../types';
import FieldLabel from '../../field-label/field-label.component';
import { Add } from '@carbon/react/icons';
import { useLayoutType } from '@openmrs/esm-framework';
import styles from './annotation.scss';
import classNames from 'classnames';

const Annotation: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  return (
    <div>
      <div className={classNames(styles.label, 'cds--label')}>
        <FieldLabel field={field} />
      </div>
      <div>
        <Button
          kind={isTablet ? 'ghost' : 'tertiary'}
          renderIcon={(props) => <Add size={16} {...props} />}>
          {t('addAnnotation', 'Add Annotation')}
        </Button>
      </div>
    </div>
  );
};

export default Annotation;
