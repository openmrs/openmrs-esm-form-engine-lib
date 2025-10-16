import React, { useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Layer, NumberInput } from '@carbon/react';
import { isEmpty } from '../../../validators/form-validator';
import { isTrue } from '../../../utils/boolean-utils';
import { type FormFieldInputProps } from '../../../types';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import { useFormProviderContext } from '../../../provider/form-provider';
import FieldLabel from '../../field-label/field-label.component';
import FieldValueView from '../../value/view/field-value-view.component';
import styles from './number.scss';

const NumberField: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const { layoutType, sessionMode, workspaceLayout } = useFormProviderContext();

  const numberValue = useMemo(() => {
    if (isNaN(value)) {
      return '';
    }
    return value ?? '';
  }, [value]);

  const getNumericValue = useCallback(
    (value: string | number) => (typeof value === 'undefined' || isNaN(Number(value)) ? undefined : Number(value)),
    [],
  );

  const handleChange = useCallback(
    (event, { value }) => {
      const parsedValue = getNumericValue(value);
      setFieldValue(isNaN(parsedValue) ? undefined : parsedValue);
    },
    [setFieldValue, getNumericValue],
  );

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  const max = getNumericValue(field.questionOptions.max);
  const min = getNumericValue(field.questionOptions.min);

  return sessionMode == 'view' || sessionMode == 'embedded-view' ? (
    <div className={styles.formField}>
      <FieldValueView
        label={t(field.label)}
        value={value}
        conceptName={field.meta?.concept?.display}
        isInline={isInline}
      />
    </div>
  ) : (
    !field.isHidden && (
      <Layer>
        <NumberInput
          id={field.id}
          invalid={errors.length > 0}
          invalidText={errors[0]?.message}
          label={<FieldLabel field={field} />}
          max={max}
          min={min}
          name={field.id}
          value={numberValue}
          onChange={handleChange}
          allowEmpty={true}
          size="lg"
          hideSteppers={field.hideSteppers ?? false}
          disabled={field.isDisabled}
          readOnly={isTrue(field.readonly)}
          className={classNames(styles.controlWidthConstrained, styles.boldedLabel)}
          warn={warnings.length > 0}
          warnText={warnings[0]?.message}
          step={field.questionOptions.step ?? 0.01}
        />
      </Layer>
    )
  );
};

export default NumberField;
