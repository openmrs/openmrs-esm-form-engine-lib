import { type FormField, type FormProcessorContextProps } from '../../types';
import { usePatientPrograms } from '../../hooks/usePatientPrograms';
import { useEffect, useState } from 'react';
import { useEncounter } from '../../hooks/useEncounter';
import { isEmpty } from '../../validators/form-validator';
import { type FormSchema } from '../../types';
import { type FormContextProps } from '../../provider/form-provider';
import { FormProcessor } from '../form-processor';
import {
  getMutableSessionProps,
  hydrateRepeatField,
  inferInitialValueFromDefaultFieldValue,
  prepareEncounter,
  preparePatientIdentifiers,
  preparePatientPrograms,
  saveAttachments,
  savePatientIdentifiers,
  savePatientPrograms,
} from './encounter-processor-helper';
import { type OpenmrsResource, showSnackbar, translateFrom } from '@openmrs/esm-framework';
import { moduleName } from '../../globals';
import { extractErrorMessagesFromResponse } from '../../utils/error-utils';
import { saveEncounter } from '../../api/api';
import { useEncounterRole } from '../../hooks/useEncounterRole';
import { type FormNode, evaluateAsyncExpression, evaluateExpression } from '../../utils/expression-runner';
import { hasRendering } from '../../utils/common-utils';

function useCustomHooks(context: Partial<FormProcessorContextProps>) {
  const [isLoading, setIsLoading] = useState(true);
  const { encounter, isLoading: isLoadingEncounter } = useEncounter(context.formJson);
  const { encounterRole, isLoading: isLoadingEncounterRole } = useEncounterRole();
  const { isLoading: isLoadingPatientPrograms, patientPrograms } = usePatientPrograms(
    context.patient?.id,
    context.formJson,
  );

  useEffect(() => {
    setIsLoading(isLoadingPatientPrograms || isLoadingEncounter || isLoadingEncounterRole);
  }, [isLoadingPatientPrograms, isLoadingEncounter, isLoadingEncounterRole]);

  return {
    data: { encounter, patientPrograms, encounterRole },
    isLoading,
    error: null,
    updateContext: (setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>) => {
      setContext((context) => {
        context.processor.domainObjectValue = encounter as OpenmrsResource;
        return {
          ...context,
          domainObjectValue: encounter as OpenmrsResource,
          customDependencies: {
            ...context.customDependencies,
            patientPrograms: patientPrograms,
            encounterRole: encounterRole,
          },
        };
      });
    },
  };
}

const emptyValues = {
  checkbox: [],
  toggle: false,
};

export class EncounterFormProcessor extends FormProcessor {
  prepareFormSchema(schema: FormSchema) {
    return schema;
  }

  async processSubmission(context: FormContextProps, abortController: AbortController) {
    const { encounterRole, encounterProvider, encounterDate, encounterLocation } = getMutableSessionProps(context);
    const translateFn = (key, defaultValue?) => translateFrom(moduleName, key, defaultValue);
    const patientIdentifiers = preparePatientIdentifiers(context.formFields, encounterLocation);
    const encounter = prepareEncounter(context, encounterDate, encounterRole, encounterProvider, encounterLocation);

    // save patient identifiers
    try {
      await Promise.all(savePatientIdentifiers(context.patient, patientIdentifiers));
      if (patientIdentifiers?.length) {
        showSnackbar({
          title: translateFn('patientIdentifiersSaved', 'Patient identifier(s) saved successfully'),
          kind: 'success',
          isLowContrast: true,
        });
      }
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: translateFn('errorSavingPatientIdentifiers', 'Error saving patient identifiers'),
        subtitle: errorMessages.join(', '),
        kind: 'error',
        isLowContrast: false,
      });
    }

    // save patient programs
    try {
      const programs = preparePatientPrograms(
        context.formFields,
        context.patient,
        context.customDependencies.patientPrograms,
      );
      const savedPrograms = await await savePatientPrograms(programs);
      if (savedPrograms?.length) {
        showSnackbar({
          title: translateFn('patientProgramsSaved', 'Patient program(s) saved successfully'),
          kind: 'success',
          isLowContrast: true,
        });
      }
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: translateFn('errorSavingPatientPrograms', 'Error saving patient program(s)'),
        subtitle: errorMessages.join(', '),
        kind: 'error',
        isLowContrast: false,
      });
    }

    // save encounter
    try {
      const { data: savedEncounter } = await saveEncounter(abortController, encounter, encounter.uuid);
      const saveOrders = savedEncounter.orders.map((order) => order.orderNumber);
      if (saveOrders.length) {
        showSnackbar({
          title: translateFn('ordersSaved', 'Order(s) saved successfully'),
          subtitle: saveOrders.join(', '),
          kind: 'success',
          isLowContrast: true,
        });
      }
      // handle attachments
      try {
        const attachmentsResponse = await Promise.all(
          saveAttachments(context.formFields, savedEncounter, abortController),
        );
        if (attachmentsResponse?.length) {
          showSnackbar({
            title: translateFn('attachmentsSaved', 'Attachment(s) saved successfully'),
            kind: 'success',
            isLowContrast: true,
          });
        }
      } catch (error) {
        const errorMessages = extractErrorMessagesFromResponse(error);
        return Promise.reject({
          title: translateFn('errorSavingAttachments', 'Error saving attachment(s)'),
          subtitle: errorMessages.join(', '),
          kind: 'error',
          isLowContrast: false,
        });
      }
      return savedEncounter;
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: translateFn('errorSavingEncounter', 'Error saving encounter'),
        subtitle: errorMessages.join(', '),
        kind: 'error',
        isLowContrast: false,
      });
    }
  }

  getCustomHooks() {
    return { useCustomHooks };
  }

  async getInitialValues(context: FormProcessorContextProps) {
    // TODO: Handle context initializable fields eg. encounterProvider, encounterRole etc.
    const { domainObjectValue: encounter, formFields, formFieldAdapters, sessionMode, patient } = context;
    const initialValues = {};
    const repeatableFields = [];
    if (encounter) {
      const filteredFields = formFields.filter((field) => isEmpty(field.meta?.previousValue));
      await Promise.all(
        filteredFields.map(async (field) => {
          const adapter = formFieldAdapters[field.type];
          if (adapter) {
            if (hasRendering(field, 'repeating') && !field.meta?.repeat?.isClone) {
              repeatableFields.push(field);
            }
            if (field.type === 'obsGroup') {
              return;
            }
            const value = await adapter.getInitialValue(field, encounter, context);
            if (!isEmpty(value)) {
              initialValues[field.id] = value;
            } else if (!isEmpty(field.questionOptions.defaultValue)) {
              initialValues[field.id] = inferInitialValueFromDefaultFieldValue(field);
            } else {
              initialValues[field.id] = emptyValues[field.questionOptions.rendering] ?? '';
            }
            if (field.questionOptions.calculate?.calculateExpression) {
              await evaluateCalculateExpression(field, initialValues, context);
            }
            // TODO: figure out a better way to handle unspecified fields
            if (field.unspecified) {
              initialValues[`${field.id}-unspecified`] = !value;
            }
          } else {
            console.warn(`No adapter found for field type ${field.type}`);
          }
        }),
      );
      const flattenedRepeatableFields = await Promise.all(
        repeatableFields.flatMap((field) => hydrateRepeatField(field, encounter, initialValues, context)),
      ).then((results) => results.flat());
      formFields.push(...flattenedRepeatableFields);
    } else {
      formFields
        .filter((field) => field.questionOptions.rendering !== 'group' && field.type !== 'obsGroup')
        .forEach(async (field) => {
          initialValues[field.id] = emptyValues[field.questionOptions.rendering] ?? null;
          if (field.questionOptions.calculate?.calculateExpression) {
            await evaluateCalculateExpression(field, initialValues, context);
          }
        });
    }
    return initialValues;
  }
}

async function evaluateCalculateExpression(
  field: FormField,
  values: Record<string, any>,
  formContext: FormProcessorContextProps,
) {
  const { formFields, sessionMode, patient, formFieldAdapters } = formContext;
  const expression = field.questionOptions.calculate.calculateExpression;
  const node: FormNode = { value: field, type: 'field' };
  const context = {
    mode: sessionMode,
    patient: patient,
  };
  let value = null;
  if (field.questionOptions.calculate.calculateExpression.includes('resolve(')) {
    value = await evaluateAsyncExpression(expression, node, formFields, values, context);
  } else {
    value = evaluateExpression(expression, node, formFields, values, context);
  }
  if (!isEmpty(value)) {
    values[field.id] = value;
  }
}
