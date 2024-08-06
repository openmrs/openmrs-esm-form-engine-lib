import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormGroup } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import type { FormField, FormFieldInputProps, RenderType } from '../../types';
import { evaluateAsyncExpression, evaluateExpression } from '../../utils/expression-runner';
import { isEmpty } from '../../validators/form-validator';
import styles from './repeat.scss';
import { cloneRepeatField } from './helpers';
import { clearSubmission, isViewMode } from '../../utils/common-utils';
import RepeatControls from './repeat-controls.component';
import { createErrorHandler } from '@openmrs/esm-framework';
import { useFormProviderContext } from '../../provider/form-provider';
import { FormFieldRenderer } from '../renderer/field/form-field-renderer.component';
import { useFormFactory } from '../../provider/form-factory-provider';

const renderingByTypeMap: Record<string, RenderType> = {
  obsGroup: 'group',
  testOrder: 'select',
};

const Repeat: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();
  const isGrouped = useMemo(() => field.questions?.length > 1, [field]);
  const [counter, setCounter] = useState(0);
  const [rows, setRows] = useState([]);
  const context = useFormProviderContext();
  const { handleConfirmQuestionDeletion } = useFormFactory();
  const {
    patient,
    sessionMode,
    formFieldAdapters,
    formFields,
    methods: { getValues, setValue },
    addFormField,
  } = context;

  useEffect(() => {
    const repeatedFields = formFields.filter(
      (_field) =>
        _field.questionOptions.concept === field.questionOptions.concept &&
        _field.id.startsWith(field.id) &&
        !_field.meta?.repeat?.wasDeleted,
    );
    setCounter(repeatedFields.length - 1);
    setRows(repeatedFields);
  }, [formFields, field]);

  const handleAdd = useCallback(
    (counter: number) => {
      function evaluateExpressions(field: FormField) {
        if (field.hide?.hideWhenExpression) {
          field.isHidden = evaluateExpression(
            field.hide.hideWhenExpression,
            { value: field, type: 'field' },
            formFields,
            getValues(),
            {
              mode: sessionMode,
              patient: patient,
            },
          );
        }
        if (field.questionOptions.calculate?.calculateExpression) {
          evaluateAsyncExpression(
            field.questionOptions.calculate?.calculateExpression,
            { value: field, type: 'field' },
            formFields,
            getValues(),
            {
              mode: sessionMode,
              patient: patient,
            },
          ).then((result) => {
            if (!isEmpty(result)) {
              setValue(field.id, result);
              formFieldAdapters[field.type]?.transformFieldValue(field, result, context);
            }
          });
        }
      }
      const clonedField = cloneRepeatField(field, null, counter);
      // run necessary expressions
      if (clonedField.type === 'obsGroup') {
        clonedField.questions?.forEach((childField) => {
          evaluateExpressions(childField);
          addFormField(childField);
        });
      } else {
        evaluateExpressions(clonedField);
      }
      addFormField(clonedField);
      setRows([...rows, clonedField]);
    },
    [formFields, field, rows, context],
  );

  const removeNthRow = (field: FormField) => {
    if (field.meta.previousValue) {
      formFieldAdapters[field.type]?.transformFieldValue(field, null, context);
      field.meta.repeat = { ...(field.meta.repeat || {}), wasDeleted: true };
      if (field.type === 'obsGroup') {
        field.questions.forEach((child) => {
          child.meta.repeat = { ...(field.meta.repeat || {}), wasDeleted: true };
          formFieldAdapters[child.type]?.transformFieldValue(child, null, context);
        });
      }
    } else {
      clearSubmission(field);
    }
    setRows(rows.filter((q) => q.id !== field.id));
  };

  const onClickDeleteQuestion = (field: Readonly<FormField>) => {
    if (handleConfirmQuestionDeletion && typeof handleConfirmQuestionDeletion === 'function') {
      const result = handleConfirmQuestionDeletion(field);
      if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
        result.then(() => removeNthRow(field)).catch(() => createErrorHandler());
      } else if (typeof result === 'boolean') {
        result && removeNthRow(field);
      } else {
        removeNthRow(field);
      }
    } else {
      removeNthRow(field);
    }
  };

  const nodes = useMemo(() => {
    return rows.map((field, index) => {
      const component = (
        <FormFieldRenderer
          field={field}
          valueAdapter={formFieldAdapters[field.type]}
          repeatOptions={{ targetRendering: getQuestionWithSupportedRendering(field).questionOptions.rendering }}
        />
      );
      return (
        <div key={field.id + '_wrapper'}>
          {index !== 0 && (
            <div>
              <hr className={styles.divider} />
            </div>
          )}
          <div className={styles.nodeContainer}>{component}</div>
          {!isViewMode(sessionMode) && (
            <RepeatControls
              question={field}
              rows={rows}
              questionIndex={index}
              handleDelete={() => {
                onClickDeleteQuestion(field);
              }}
              handleAdd={() => {
                const nextCount = counter + 1;
                handleAdd(nextCount);
                setCounter(nextCount);
              }}
            />
          )}
        </div>
      );
    });
  }, [rows]);

  if (field.isHidden || !nodes || !hasVisibleField(field)) {
    return null;
  }

  return (
    <React.Fragment>
      {isGrouped ? (
        <div className={styles.container}>
          <FormGroup legendText={t(field.label)} className={styles.boldLegend}>
            {nodes}
          </FormGroup>
        </div>
      ) : (
        <div>{nodes}</div>
      )}
    </React.Fragment>
  );
};

function hasVisibleField(field: FormField) {
  if (field.questions?.length) {
    return field.questions?.some((child) => !child.isHidden);
  }
  return !field.isHidden;
}

function getQuestionWithSupportedRendering(field: FormField) {
  return {
    ...field,
    questionOptions: {
      ...field.questionOptions,
      rendering: renderingByTypeMap[field.type] || null,
    },
  };
}

export default Repeat;
