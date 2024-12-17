import React, { useCallback, useMemo, useState } from 'react';
import { Layer, NumberInput } from '@carbon/react';
import classNames from 'classnames';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import { type FormFieldInputProps } from '../../../types';
import styles from './number.scss';
import { useTranslation } from 'react-i18next';
import { useFormProviderContext } from '../../../provider/form-provider';
import FieldLabel from '../../field-label/field-label.component';
import { isEmpty } from '../../../validators/form-validator';

const NumberField: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const [lastBlurredValue, setLastBlurredValue] = useState(value);
  const { layoutType, sessionMode, workspaceLayout } = useFormProviderContext();

  const numberValue = useMemo(() => {
    if (isNaN(value)) {
      return '';
    }
    return value ?? '';
  }, [value]);

  const onBlur = (event) => {
    event.preventDefault();
    if (lastBlurredValue != value) {
      setLastBlurredValue(value);
    }
  };

  const handleChange = useCallback(
    (event) => {
      const parsedValue = isEmpty(event.target.value) ? undefined : Number(event.target.value);
      setFieldValue(isNaN(parsedValue) ? undefined : parsedValue);
    },
    [setFieldValue],
  );

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

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
          max={Number(field.questionOptions.max) || undefined}
          min={Number(field.questionOptions.min) || undefined}
          name={field.id}
          value={numberValue}
          onChange={handleChange}
          onBlur={onBlur}
          allowEmpty={true}
          size="lg"
          hideSteppers={field.hideSteppers ?? false}
          onWheel={(e) => e.target.blur()}
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
