import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown as DropdownInput, Layer } from '@carbon/react';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { type FormFieldInputProps } from '../../../types';
import FieldValueView from '../../value/view/field-value-view.component';
import FieldLabel from '../../field-label/field-label.component';
import { useFormProviderContext } from '../../../provider/form-provider';
import { NullSelectOption } from '../../../constants';
import { isEmpty } from '../../../validators/form-validator';
import styles from './dropdown.scss';

const Dropdown: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const { layoutType, sessionMode, workspaceLayout, formFieldAdapters } = useFormProviderContext();

  const handleChange = useCallback(
    ({ selectedItem }) => {
      setFieldValue(selectedItem === NullSelectOption ? null : selectedItem);
    },
    [setFieldValue],
  );

  const itemToString = useCallback(
    (item) => {
      let answer = field.questionOptions.answers.find((opt) => {
        return opt.value ? opt.value == item : opt.concept == item;
      });
      return answer ? t(answer.label) : '';
    },
    [field.questionOptions.answers, t],
  );

  const items = useMemo(() => {
    const options = field.questionOptions.answers;
    if (!options.some((option) => option.value === NullSelectOption)) {
      options.unshift({
        value: NullSelectOption,
        label: t('chooseAnOption', 'Choose an option'),
      });
    }
    return options.filter((option) => !option.isHidden).map((item) => item.value || item.concept);
  }, [field.questionOptions.answers]);

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
            items={items}
            itemToString={itemToString}
            selectedItem={isEmpty(value) ? NullSelectOption : value}
            onChange={handleChange}
            disabled={field.isDisabled}
            readOnly={isTrue(field.readonly)}
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
