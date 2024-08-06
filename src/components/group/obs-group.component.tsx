import React from 'react';
import classNames from 'classnames';
import { type FormFieldInputProps } from '../../types';
import styles from './obs-group.scss';
import { FormFieldRenderer } from '../renderer/field/form-field-renderer.component';
import { useFormProviderContext } from '../../provider/form-provider';

export const ObsGroup: React.FC<FormFieldInputProps> = ({ field }) => {
  const { formFieldAdapters } = useFormProviderContext();

  const groupContent = field.questions
    ?.filter((child) => !child.isHidden)
    .map((child, index) => {
      const keyId = child.id + '_' + index;
      if (formFieldAdapters[child.type]) {
        return (
          <div className={classNames(styles.flexColumn)} key={keyId}>
            <div className={styles.groupContainer}>
              <FormFieldRenderer field={child} valueAdapter={formFieldAdapters[child.type]} />
            </div>
          </div>
        );
      }
    });

  return <div className={styles.flexRow}>{groupContent}</div>;
};

export default ObsGroup;
