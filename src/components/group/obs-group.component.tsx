import React from 'react';
import classNames from 'classnames';
import { type FormFieldInputProps } from '../../types';
import styles from './obs-group.scss';
import { FormFieldRenderer } from '../renderer/form-field-renderer.component';
import { useFormProviderContext } from '../../provider/form-provider';

export const ObsGroup: React.FC<FormFieldInputProps> = ({ field }) => {
  const { formFieldAdapters } = useFormProviderContext();

  const groupContent = field.questions
    ?.filter((child) => !child.isHidden)
    .map((child, index) => {
      const keyId = child.id + '_' + index;
      const rendering = child.questionOptions.rendering;
      if (formFieldAdapters[child.type]) {
        return (
          <div className={classNames(styles.flexColumn)} key={keyId}>
            <div className={styles.groupContainer}>
              <div
                className={classNames({
                  [styles.questionInfoDefault]: child.questionInfo && rendering === 'radio',
                  [styles.questionInfoCentralized]: child.questionInfo && rendering !== 'radio',
                })}>
                <div
                  className={classNames({
                    [styles.flexFullWidth]: [
                      'ui-select-extended',
                      'content-switcher',
                      'select',
                      'textarea',
                      'text',
                      'checkbox',
                    ].includes(rendering),
                  })}>
                  <FormFieldRenderer field={child} valueAdapter={formFieldAdapters[child.type]} />
                </div>
              </div>
            </div>
          </div>
        );
      }
    });

  return <div className={styles.flexRow}>{groupContent}</div>;
};

export default ObsGroup;
