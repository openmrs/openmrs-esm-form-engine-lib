import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, TextInput } from '@carbon/react';
import { useFormProviderContext } from '../../../provider/form-provider';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import FieldLabel from '../../field-label/field-label.component';
import styles from './text.scss';

const TextField: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const { layoutType, sessionMode, workspaceLayout } = useFormProviderContext();
  const [lastBlurredValue, setLastBlurredValue] = useState(null);

  const onBlur = (event) => {
    event.preventDefault();
    if (lastBlurredValue !== value) {
      setLastBlurredValue(value);
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
      <div className={styles.boldedLabel}>
        <Layer>
          <TextInput
            disabled={field.isDisabled}
            id={field.id}
            invalid={errors.length > 0}
            invalidText={errors[0]?.message}
            labelText={<FieldLabel field={field} />}
            maxCount={
              field.questionOptions.max ? Number(field.questionOptions.max) : Number(field.questionOptions.maxLength)
            }
            name={field.id}
            onBlur={onBlur}
            onChange={(event) => {
              setFieldValue(event.target.value);
            }}
            readOnly={isTrue(field.readonly)}
            value={value ?? ''}
            warn={warnings.length > 0}
            warnText={warnings.length > 0 ? warnings[0].message : undefined}
          />
        </Layer>
      </div>
    )
  );
};

export default TextField;
