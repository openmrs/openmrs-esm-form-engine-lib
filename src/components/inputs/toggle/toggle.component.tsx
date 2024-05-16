import React, { useEffect, useMemo, useState } from 'react';
import { Toggle as ToggleInput } from '@carbon/react';
import { type FormFieldProps } from '../../../types';
import { useField } from 'formik';
import { FormContext } from '../../../form-context';
import { isTrue } from '../../../utils/boolean-utils';
import { isInlineView } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import { isEmpty } from '../../../validators/form-validator';
import { booleanConceptToBoolean } from '../../../utils/common-expression-helpers';
import styles from './toggle.scss';
import { useTranslation } from 'react-i18next';

const Toggle: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);

  const handleChange = (value) => {
    setFieldValue(question.id, value);
    onChange(question.id, value, null, null);
    handler?.handleFieldSubmission(question, value, encounterContext);
  };

  useEffect(() => {
    // The toogle input doesn't support blank values
    // by default, the value should be false
    if (!question.meta?.previousValue && encounterContext.sessionMode == 'enter') {
      handler?.handleFieldSubmission(question, field.value ?? false, encounterContext);
    }
  }, []);

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const value = booleanConceptToBoolean(previousValue);
      setFieldValue(question.id, value);
      onChange(question.id, value, null, null);
      handler?.handleFieldSubmission(question, value, encounterContext);
    }
  }, [previousValue]);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' || encounterContext.sessionMode == 'embedded-view' ? (
    <FieldValueView
      label={t(question.label)}
      value={!isEmpty(field.value) ? handler?.getDisplayValue(question, field.value) : field.value}
      conceptName={question.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <div className={styles.boldedLabel}>
        <ToggleInput
          labelText={t(question.label)}
          className={styles.boldedLabel}
          id={question.id}
          labelA={question.questionOptions.toggleOptions.labelFalse}
          labelB={question.questionOptions.toggleOptions.labelTrue}
          onToggle={handleChange}
          toggled={!!field.value}
          disabled={question.disabled}
          readOnly={question.readonly}
        />
      </div>
    )
  );
};

export default Toggle;
