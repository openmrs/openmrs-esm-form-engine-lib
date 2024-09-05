import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown as DropdownInput, Layer } from '@carbon/react';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { type FormFieldInputProps } from '../../../types';
import FieldValueView from '../../value/view/field-value-view.component';
import FieldLabel from '../../field-label/field-label.component';

import styles from './dropdown.scss';
import { useFormProviderContext } from '../../../provider/form-provider';

const Dropdown: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const { layoutType, sessionMode, workspaceLayout, formFieldAdapters } = useFormProviderContext();

  const handleChange = useCallback(
    (selectedItem) => {
      setFieldValue(selectedItem ? selectedItem.value || selectedItem.concept : null);
    },
    [setFieldValue],
  );

  const itemToString = useCallback(
    (item) => {
      return item ? item.label : '';
    },
    [t],
  );

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  return sessionMode == 'view' || sessionMode == 'embedded-view' ? (
    <FieldValueView
      label={t(field.label)}
      value={value ? formFieldAdapters[field.type].getDisplayValue(field, value) : value}
      conceptName={field.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !field.isHidden && (
      <div className={styles.boldedLabel}>
        <Layer>
          <DropdownInput
            id={field.id}
            titleText={<FieldLabel field={field} />}
            label={t('chooseAnOption', 'Choose an option')}
            items={field.questionOptions.answers
              .filter((answer) => !answer.isHidden)
              .map((item) => ({ value: item.value || item.concept, label: item.label }))}
            itemToString={itemToString}
            selectedItem={
              value
                ? field.questionOptions.answers.find((item) => (item.value || item.concept) === value)
                : null
            }
            onChange={({ selectedItem }) => handleChange(selectedItem)}
            disabled={field.isDisabled}
            readOnly={field.readonly}
            invalid={errors.length > 0}
            invalidText={errors[0]?.message}
            warn={warnings.length > 0}
            warnText={warnings[0]?.message}
          />
        </Layer>
      </div>
    )
  );
};

export default Dropdown;
