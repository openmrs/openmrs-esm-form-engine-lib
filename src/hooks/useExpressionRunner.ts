import { type FormField, type SessionMode } from '../types';
import { type FormNode, evaluateExpression } from '../utils/expression-runner';
import { useMemo } from 'react';
import { isEmpty } from '../validators/form-validator';

export const useExpressionRunner = (
  formFields: FormField[],
  formValues: Record<string, any>,
  patient: fhir.Patient,
  sessionMode: SessionMode,
) => {
  const context = useMemo(() => {
    return {
      patient,
      mode: sessionMode,
      formFields,
      formValues,
    };
  }, [patient, sessionMode, formFields, formValues]);

  function evalExpression(expression: string, node: FormNode, value?: any) {
    const updatedFormValues = { ...context.formValues };
    if (!isEmpty(value) && node.type === 'field') {
      const field = node.value as FormField;
      updatedFormValues[field.id] = value;
    }
    return evaluateExpression(expression, node, context.formFields, updatedFormValues, context);
  }

  return {
    evalExpression,
  };
};
