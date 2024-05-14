import { useEffect, useState } from 'react';
import { type EncounterContext, inferInitialValueFromDefaultFieldValue, isEmpty } from '..';
import { type FormField, type OpenmrsEncounter, type SubmissionHandler } from '../types';
import { evaluateAsyncExpression } from '../utils/expression-runner';
import { hydateRepeatField } from '../components/repeat/helpers';
import { hasRendering } from '../utils/common-utils';

export function useInitialValues(
  formFields: FormField[],
  encounter: OpenmrsEncounter,
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
  ];

  useEffect(() => {
    const asyncItemsKeys = Object.keys(asyncInitValues ?? {});
    if (asyncItemsKeys.length) {
      Promise.all(asyncItemsKeys.map((key) => asyncInitValues[key])).then((results) => {
        asyncItemsKeys.forEach((key, index) => {
          const result = isEmpty(results[index]) ? '' : results[index];
          initialValues[key] = result;
          const field = formFields.find((field) => field.id === key);
          try {
            if (!isEmpty(result)) {
              formFieldHandlers[field.type].handleFieldSubmission(field, result, encounterContext);
            }
          } catch (error) {
            console.error(error);
          }
        });
        setInitialValues({ ...initialValues });
        setHasResolvedCalculatedValues(true);
      });
    } else if (asyncInitValues) {
      setHasResolvedCalculatedValues(true);
    }
  }, [asyncInitValues, formFieldHandlers]);

  useEffect(() => {
    const repeatableFields = [];
    const emptyValues = {
      checkbox: [],
      toggle: false,
      default: '',
    };
    if (!Object.keys(formFieldHandlers).length) {
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
          if (field.type === 'obsGroup') {
            return;
          }
          if (isEmpty(existingVal) && !isEmpty(field.questionOptions.defaultValue)) {
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
      const flatenedFields = repeatableFields.flatMap((field) =>
        hydateRepeatField(field, formFields, encounter, initialValues, formFieldHandlers),
      );
      formFields.push(...flatenedFields);
      setIsEncounterBindingComplete(true);
      // TODO: Address behaviour in edit mode; see: https://issues.openmrs.org/browse/O3-2252
      setAsyncInitValues({});
    } else {
      const tempAsyncValues = {};
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
  }, [encounter, formFieldHandlers]);

  useEffect(() => {
    const emptyValues = {
      checkbox: [],
      toggle: false,
      default: '',
    };
    const attachmentFields = formFields.filter((field) => field.questionOptions.rendering === 'file');

    if (attachmentFields.length) {
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
  }, [encounter]);
  return {
    initialValues,
    isBindingComplete: isEncounterBindingComplete && hasResolvedCalculatedValues,
  };
}
