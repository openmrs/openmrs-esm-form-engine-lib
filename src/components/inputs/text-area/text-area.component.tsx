import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { Layer, TextArea as TextAreaInput } from '@carbon/react';
import { useField } from 'formik';
import { fieldRequiredErrCode, isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { FieldValueView } from '../../value/view/field-value-view.component';
import { FormContext } from '../../../form-context';
import { FormFieldProps } from '../../../types';
import styles from './text-area.scss';

const TextArea: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue: previousValueProp, }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);
  const [previousValue, setPreviousValue] = useState();
  const [errors, setErrors] = useState([]);
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (question['submission']) {
      question['submission'].errors && setErrors(question['submission'].errors);
      question['submission'].warnings && setWarnings(question['submission'].warnings);
    }
  }, [question['submission']]);

  field.onBlur = () => {
    if (field.value && question.unspecified) {
      setFieldValue(`${question.id}-unspecified`, false);
    }
    if (previousValue !== field.value) {
      onChange(question.id, field.value, setErrors, setWarnings);
      question.value = handler?.handleFieldSubmission(question, field.value, encounterContext);
    }
  };

  useEffect(() => {
    if (!isEmpty(previousValueProp)) {
      const { value } = previousValueProp;
      setFieldValue(question.id, value);
      field['value'] = value;
    }
  }, [previousValueProp]);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  return encounterContext.sessionMode == 'view' || encounterContext.sessionMode == 'embedded-view' ? (
    <FieldValueView
      label={question.label}
      value={field.value}
      conceptName={question.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <div
        className={classNames({
          [styles.errorLabel]: isFieldRequiredError,
          [styles.boldedLabel]: !isFieldRequiredError,
        })}>
        <Layer>
          <TextAreaInput
            {...field}
            id={question.id}
            labelText={question.label}
            name={question.id}
            value={field.value || ''}
            onFocus={() => setPreviousValue(field.value)}
            rows={question.questionOptions.rows || 4}
            disabled={question.disabled}
            readOnly={question.readonly}
            invalid={isFieldRequiredError && errors.length > 0}
            invalidText={errors.length && errors[0].message}
            warn={warnings.length > 0}
            warnText={warnings.length && warnings[0].message}
          />
        </Layer>
      </div>
    )
  );
};

export default TextArea;
