import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, TextInput } from '@carbon/react';
import styles from './text.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import FieldValueView from '../../value/view/field-value-view.component';

const TextField: React.FC<FormFieldInputProps> = ({
  field,
  value,
  previousValue,
  errors,
  warnings,
  setFieldValue,
  onAfterChange,
}) => {
  const { t } = useTranslation();
  const [lastBlurredValue, setLastBlurredValue] = useState(null);
  const { layoutType, sessionMode, workspaceLayout } = useFormProviderContext();

  // TODO: handle previousValue
  // useEffect(() => {
  //   if (!isEmpty(previousValue)) {
  //     setFieldValue(question.id, previousValue);
  //     field['value'] = previousValue;
  //     field.onBlur(null);
  //   }
  // }, [previousValue]);

  const onBlur = (event) => {
    if (value && field.unspecified) {
      // TODO: handle unspecified
      // setFieldValue(`${question.id}-unspecified`, false);
    }
    // Do we still need the lastBlurredValue state? Probably not!!
    if (previousValue !== value && lastBlurredValue !== value) {
      setLastBlurredValue(value);
      onAfterChange(value);
    }
  };

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  return sessionMode == 'view' || sessionMode == 'embedded-view' ? (
    <FieldValueView
      label={t(field.label)}
      value={value}
      conceptName={field.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !field.isHidden && (
      <>
        <div className={styles.boldedLabel}>
          <Layer>
            <TextInput
              id={field.id}
              labelText={
                field.isRequired ? <RequiredFieldLabel label={t(field.label)} /> : <span>{t(field.label)}</span>
              }
              onChange={setFieldValue}
              onBlur={onBlur}
              name={field.id}
              value={value}
              disabled={field.isDisabled}
              readOnly={Boolean(field.readonly)}
              invalid={errors.length > 0}
              invalidText={errors[0]?.message}
              warn={warnings.length > 0}
              warnText={warnings.length && warnings[0].message}
              maxLength={field.questionOptions.max || TextInput.maxLength}
            />
          </Layer>
        </div>
      </>
    )
  );
};

export default TextField;
