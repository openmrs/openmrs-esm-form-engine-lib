import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormGroup, RadioButtonGroup, RadioButton } from '@carbon/react';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import styles from './radio.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import FieldLabel from '../../field-label/field-label.component';

const Radio: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const { layoutType, sessionMode, workspaceLayout, formFieldAdapters } = useFormProviderContext();

  const handleChange = (value) => {
    setFieldValue(value);
  };

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  return sessionMode == 'view' || sessionMode == 'embedded-view' || isTrue(field.readonly) ? (
    <FieldValueView
      label={t(field.label)}
      value={value ? formFieldAdapters[field.type].getDisplayValue(field, value) : value}
      conceptName={field.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !field.isHidden && (
      <FormGroup
        legendText={<FieldLabel field={field} />}
        className={styles.boldedLegend}
        disabled={field.isDisabled}
        invalid={errors?.length > 0}>
        <RadioButtonGroup
          name={field.id}
          valueSelected={value}
          onChange={handleChange}
          readOnly={isTrue(field.readonly)}
          orientation={field.questionOptions?.orientation || 'vertical'}>
          {field.questionOptions.answers
            .filter((answer) => !answer.isHidden)
            .map((answer, index) => {
              return (
                <RadioButton
                  id={`${field.id}-${answer.label}`}
                  labelText={t(answer.label) ?? ''}
                  value={answer.concept}
                  key={index}
                  onClick={(e) => {
                    if (value && e.target.checked) {
                      e.target.checked = false;
                      handleChange(null);
                    } else {
                      handleChange(answer.concept);
                    }
                  }}
                />
              );
            })}
        </RadioButtonGroup>
        {(errors?.length > 0 || warnings?.length > 0) && (
          <div>
            <div className={styles.errorMessage}>
              {errors.length > 0 ? errors[0].message : warnings.length > 0 ? warnings[0].message : null}
            </div>
          </div>
        )}
      </FormGroup>
    )
  );
};

export default Radio;
