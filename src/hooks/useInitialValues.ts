import { useEffect, useState } from 'react';
import { type EncounterContext, inferInitialValueFromDefaultFieldValue, isEmpty } from '..';
import { type FormField, type OpenmrsEncounter, type SubmissionHandler } from '../types';
import { evaluateAsyncExpression, evaluateExpression, FormNode } from '../utils/expression-runner';
import { hydrateRepeatField } from '../components/repeat/helpers';
import { hasRendering } from '../utils/common-utils';

export function useInitialValues(
  formFields: FormField[],
  encounter: OpenmrsEncounter,
  isLoadingContextDependencies: boolean,
  encounterContext: EncounterContext,
  formFieldHandlers: Record<string, SubmissionHandler>,
) {
  const [asyncInitValues, setAsyncInitValues] = useState<Record<string, Promise<any>>>(null);
  const [initialValues, setInitialValues] = useState({});
  const [hasResolvedCalculatedValues, setHasResolvedCalculatedValues] = useState(false);
  const [isEncounterBindingComplete, setIsEncounterBindingComplete] = useState(
    encounterContext.sessionMode === 'enter',
  );
  const encounterContextInitializableTypes = [
    'encounterProvider',
    'encounterDatetime',
    'encounterLocation',
    'patientIdentifier',
    'encounterRole',
  ];

  useEffect(() => {
    if (isLoadingContextDependencies) {
      return;
    }
    const asyncItemsKeys = Object.keys(asyncInitValues ?? {});
    if (asyncItemsKeys.length) {
      Promise.all(asyncItemsKeys.map((key) => asyncInitValues[key])).then((results) => {
        asyncItemsKeys.forEach((key, index) => {
          const result = isEmpty(results[index]) ? '' : results[index];
          const field = formFields.find((field) => field.id === key);
          initialValues[key] = result;
          try {
            if (!isEmpty(result)) {
              formFieldHandlers[field.type].handleFieldSubmission(field, result, encounterContext);
            }
          } catch (error) {
            const encounterValue = formFieldHandlers[field.type]?.getInitialValue(
              encounter,
              field,
              formFields,
              encounterContext,
            );
            formFieldHandlers[field.type].handleFieldSubmission(field, encounterValue, encounterContext);
            console.error(error);
          }
        });
        setInitialValues({ ...initialValues });
        setHasResolvedCalculatedValues(true);
      });
    } else if (asyncInitValues) {
      setHasResolvedCalculatedValues(true);
    }
  }, [asyncInitValues, formFieldHandlers, isLoadingContextDependencies]);

  useEffect(() => {
    const repeatableFields = [];
    const emptyValues = {
      checkbox: [],
      toggle: false,
      default: '',
    };
    const tempAsyncValues = {};

    if (!Object.keys(formFieldHandlers).length || isLoadingContextDependencies) {
      return;
    }
    if (encounter) {
      formFields
        .filter((field) => isEmpty(field.meta?.previousValue))
        .filter((field) => field.questionOptions.rendering !== 'file')
        .forEach((field) => {
          if (hasRendering(field, 'repeating') && !field.meta?.repeat?.isClone) {
            repeatableFields.push(field);
          }
          let existingVal = formFieldHandlers[field.type]?.getInitialValue(
            encounter,
            field,
            formFields,
            encounterContext,
          );

          if (field.questionOptions.calculate?.calculateExpression) {
            const expression = field.questionOptions.calculate.calculateExpression;
            const node: FormNode = { value: field, type: 'field' };
            const context = {
              mode: encounterContext.sessionMode,
              patient: encounterContext.patient,
            };
            if (field.questionOptions.calculate.calculateExpression.includes('resolve(')) {
              tempAsyncValues[field.id] = evaluateAsyncExpression(expression, node, formFields, initialValues, context);
            } else {
              const evaluatedValue = evaluateExpression(expression, node, formFields, initialValues, context);
              existingVal = evaluatedValue ?? existingVal;
            }
          }
          if (field.type === 'obsGroup') {
            return;
          }
          if (
            isEmpty(existingVal) &&
            !isEmpty(field.questionOptions.defaultValue) &&
            !field.questionOptions.calculate?.calculateExpression
          ) {
            existingVal = inferInitialValueFromDefaultFieldValue(
              field,
              encounterContext,
              formFieldHandlers[field.type],
            );
          }
          initialValues[field.id] = isEmpty(existingVal)
            ? emptyValues[field.questionOptions.rendering] ?? emptyValues.default
            : existingVal;

          if (field.unspecified) {
            initialValues[`${field.id}-unspecified`] = !existingVal;
          }
        });
      const flattenedFields = repeatableFields.flatMap((field) =>
        hydrateRepeatField(field, formFields, encounter, initialValues, formFieldHandlers),
      );
      formFields.push(...flattenedFields);
      setIsEncounterBindingComplete(true);
      setAsyncInitValues({ ...(asyncInitValues ?? {}), ...tempAsyncValues });
    } else {
      formFields
        .filter((field) => field.questionOptions.rendering !== 'group' && field.type !== 'obsGroup')
        .forEach((field) => {
          let value = null;
          if (field.questionOptions.calculate && !asyncInitValues?.[field.id] && !tempAsyncValues[field.id]) {
            // evaluate initial value from calculate expression
            tempAsyncValues[field.id] = evaluateAsyncExpression(
              field.questionOptions.calculate.calculateExpression,
              { value: field, type: 'field' },
              formFields,
              initialValues,
              {
                mode: encounterContext.sessionMode,
                patient: encounterContext.patient,
              },
            );
          }
          if (encounterContextInitializableTypes.includes(field.type)) {
            value = formFieldHandlers[field.type]?.getInitialValue(encounter, field, formFields, encounterContext);
          }
          if (!isEmpty(field.questionOptions.defaultValue)) {
            value = inferInitialValueFromDefaultFieldValue(field, encounterContext, formFieldHandlers[field.type]);
          }
          if (!isEmpty(value)) {
            initialValues[field.id] = value;
          } else {
            initialValues[field.id] = emptyValues[field.questionOptions.rendering] ?? emptyValues.default;
          }
          if (field.unspecified) {
            initialValues[`${field.id}-unspecified`] = false;
          }
        });
      setAsyncInitValues({ ...(asyncInitValues ?? {}), ...tempAsyncValues });
    }
    setInitialValues({ ...initialValues });
  }, [encounter, formFieldHandlers, isLoadingContextDependencies]);

  useEffect(() => {
    const emptyValues = {
      checkbox: [],
      toggle: false,
      default: '',
    };
    const attachmentFields = formFields.filter((field) => field.questionOptions.rendering === 'file');

    if (attachmentFields.length && !isLoadingContextDependencies) {
      if (encounter) {
        Promise.all(
          attachmentFields.map((field) => {
            return formFieldHandlers[field.type]?.getInitialValue(encounter, field, formFields);
          }),
        ).then((responses) => {
          responses.forEach((responseValue, index) => {
            const eachField = attachmentFields[index];

            const filteredResponseValue = responseValue['results'].filter(
              (eachResponse) => eachResponse.comment === eachField.id,
            );

            initialValues[eachField.id] = isEmpty(responseValue)
              ? emptyValues[eachField.questionOptions.rendering] ?? emptyValues.default
              : filteredResponseValue;
            setInitialValues({ ...initialValues });
          });
        });
      }
    }
  }, [encounter, isLoadingContextDependencies]);
  return {
    initialValues,
    isBindingComplete: isEncounterBindingComplete && hasResolvedCalculatedValues,
  };
}
