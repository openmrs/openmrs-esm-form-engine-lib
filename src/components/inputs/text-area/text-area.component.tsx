import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, TextArea as TextAreaInput } from '@carbon/react';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { type FormFieldInputProps } from '../../../types';
import FieldValueView from '../../value/view/field-value-view.component';
import styles from './text-area.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import FieldLabel from '../../field-label/field-label.component';

const TextArea: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const [lastBlurredValue, setLastBlurredValue] = useState(value);
  const { layoutType, sessionMode, workspaceLayout } = useFormProviderContext();

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
          <TextAreaInput
            id={field.id}
            labelText={<FieldLabel field={field} />}
            name={field.id}
            onChange={setFieldValue}
            onBlur={onBlur}
            value={value || ''}
            rows={field.questionOptions.rows || 4}
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

export default TextArea;
