import React, { useEffect, useMemo } from 'react';
import { Toggle as ToggleInput } from '@carbon/react';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import { isEmpty } from '../../../validators/form-validator';
import styles from './toggle.scss';
import { useTranslation } from 'react-i18next';
import { useFormProviderContext } from '../../../provider/form-provider';

const Toggle: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const context = useFormProviderContext();

  const handleChange = (value) => {
    setFieldValue(value);
  };

  useEffect(() => {
    // The toggle input doesn't support blank values
    // by default, the value should be false
    if (!field.meta?.initialValue?.omrsObject && context.sessionMode == 'enter') {
      context.formFieldAdapters[field.type].transformFieldValue(field, value ?? false, context);
    }
  }, []);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(context.sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(
        field.inlineRendering,
        context.layoutType,
        context.workspaceLayout,
        context.sessionMode,
      );
    }
    return false;
  }, [context.sessionMode, field.readonly, field.inlineRendering, context.layoutType, context.workspaceLayout]);

  return context.sessionMode == 'view' || context.sessionMode == 'embedded-view' ? (
    <FieldValueView
      label={t(field.label)}
      value={!isEmpty(value) ? context.formFieldAdapters[field.type].getDisplayValue(field, value) : value}
      conceptName={field.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !field.isHidden && (
      <div className={styles.boldedLabel}>
        <ToggleInput
          labelText={t(field.label)}
          className={styles.boldedLabel}
          id={field.id}
          labelA={field.questionOptions.toggleOptions.labelFalse}
          labelB={field.questionOptions.toggleOptions.labelTrue}
          onToggle={handleChange}
          toggled={!!value}
          disabled={field.isDisabled}
          readOnly={isTrue(field.readonly)}
        />
      </div>
    )
  );
};

export default Toggle;
