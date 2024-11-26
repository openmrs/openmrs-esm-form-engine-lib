import React, { useMemo } from 'react';
import classNames from 'classnames';
import { type FormFieldInputProps } from '../../types';
import styles from './obs-group.scss';
import { FormFieldRenderer, isGroupField } from '../renderer/field/form-field-renderer.component';
import { useFormProviderContext } from '../../provider/form-provider';
import { FormGroup } from '@carbon/react';
import { useTranslation } from 'react-i18next';

export const ObsGroup: React.FC<FormFieldInputProps> = ({ field, ...restProps }) => {
  const { t } = useTranslation();
  const { formFieldAdapters } = useFormProviderContext();
  const showLabel = useMemo(() => field.questions?.length > 1, [field]);

  const content = useMemo(
    () =>
      field.questions
        ?.filter((child) => !child.isHidden)
        .map((child, index) => {
          const keyId = `${child.id}_${index}`;

          if (child.type === 'obsGroup' && isGroupField(child.questionOptions.rendering)) {
            return (
              <div key={keyId} className={styles.nestedGroupContainer}>
                <ObsGroup field={child} {...restProps} />
              </div>
            );
          } else if (formFieldAdapters[child.type]) {
            return (
              <div className={classNames(styles.flexColumn)} key={keyId}>
                <div className={styles.groupContainer}>
                  <FormFieldRenderer fieldId={child.id} valueAdapter={formFieldAdapters[child.type]} />
                </div>
              </div>
            );
          }
        }),
    [field],
  );

  return (
    <div className={styles.groupContainer}>
      {showLabel ? (
        <FormGroup legendText={t(field.label)} className={styles.boldLegend}>
          {content}
        </FormGroup>
      ) : (
        content
      )}
    </div>
  );
};

export default ObsGroup;
