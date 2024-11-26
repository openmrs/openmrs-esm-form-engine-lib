import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, TextInput } from '@carbon/react';
import styles from './text.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import FieldLabel from '../../field-label/field-label.component';

const TextField: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const [lastBlurredValue, setLastBlurredValue] = useState(null);
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
          <TextInput
            id={field.id}
            labelText={<FieldLabel field={field} />}
            onChange={(event) => {
              setFieldValue(event.target.value);
            }}
            onBlur={onBlur}
            name={field.id}
            value={value}
            disabled={field.isDisabled}
            readOnly={isTrue(field.readonly)}
            invalid={errors.length > 0}
            invalidText={errors[0]?.message}
            warn={warnings.length > 0}
            warnText={warnings.length > 0 ? warnings[0].message : undefined}
            maxLength={field.questionOptions.max || TextInput.maxLength}
          />
        </Layer>
      </div>
    )
  );
};

export default TextField;
