import { useEffect, useState } from 'react';
import { type OpenmrsResource, showSnackbar, translateFrom } from '@openmrs/esm-framework';
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
import {
  type FormField,
  type FormPage,
  type FormProcessorContextProps,
  type FormSchema,
  type FormSection,
  type ValueAndDisplay,
} from '../../types';
import { evaluateAsyncExpression, type FormNode } from '../../utils/expression-runner';
import { extractErrorMessagesFromResponse } from '../../utils/error-utils';
import { extractObsValueAndDisplay } from '../../utils/form-helper';
import { FormProcessor } from '../form-processor';
import { getPreviousEncounter, saveEncounter } from '../../api';
import { hasRendering } from '../../utils/common-utils';
import { isEmpty } from '../../validators/form-validator';
import { moduleName } from '../../globals';
import { type FormContextProps } from '../../provider/form-provider';
import { useEncounter } from '../../hooks/useEncounter';
import { useEncounterRole } from '../../hooks/useEncounterRole';
import { usePatientPrograms } from '../../hooks/usePatientPrograms';

function useCustomHooks(context: Partial<FormProcessorContextProps>) {
  const [isLoading, setIsLoading] = useState(true);
  const { encounter, isLoading: isLoadingEncounter } = useEncounter(context.formJson);
  const { encounterRole, isLoading: isLoadingEncounterRole } = useEncounterRole();
  const { isLoadingPatientPrograms, patientPrograms } = usePatientPrograms(context.patient?.id, context.formJson);

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
            defaultEncounterRole: encounterRole,
          },
        };
      });
    },
  };
}

const emptyValues = {
  checkbox: [],
  toggle: false,
  text: '',
};

const contextInitializableTypes = [
  'encounterProvider',
  'encounterDatetime',
  'encounterLocation',
  'patientIdentifier',
  'encounterRole',
  'programState',
];

export class EncounterFormProcessor extends FormProcessor {
  prepareFormSchema(schema: FormSchema) {
    schema.pages.forEach((page) => {
      page.sections.forEach((section) => {
        section.questions.forEach((question) => {
          prepareFormField(question, section, page, schema);
        });
      });
    });

    function prepareFormField(field: FormField, section: FormSection, page: FormPage, schema: FormSchema) {
      // inherit inlineRendering and readonly from parent section and page if not set
      field.inlineRendering =
        field.inlineRendering ?? section.inlineRendering ?? page.inlineRendering ?? schema.inlineRendering;
      field.readonly = field.readonly ?? section.readonly ?? page.readonly ?? schema.readonly;
      if (field.questionOptions?.rendering == 'fixed-value' && !field.meta.fixedValue) {
        field.meta.fixedValue = field.value;
        delete field.value;
      }
      if (field.questionOptions?.rendering == 'group' || field.type === 'obsGroup') {
        field.questions?.forEach((child) => {
          child.readonly = child.readonly ?? field.readonly;
          return prepareFormField(child, section, page, schema);
        });
      }
    }

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
        description: errorMessages.join(', '),
        kind: 'error',
        critical: true,
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
        description: errorMessages.join(', '),
        kind: 'error',
        critical: true,
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
          description: errorMessages.join(', '),
          kind: 'error',
          critical: true,
        });
      }
      return savedEncounter;
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: translateFn('errorSavingEncounter', 'Error saving encounter'),
        description: errorMessages.join(', '),
        kind: 'error',
        critical: true,
      });
    }
  }

  getCustomHooks() {
    return { useCustomHooks };
  }

  async getInitialValues(context: FormProcessorContextProps) {
    const { domainObjectValue: encounter, formFields, formFieldAdapters } = context;
    const initialValues = {};
    const repeatableFields = [];
    if (encounter) {
      await Promise.all(
        formFields.map(async (field) => {
          const adapter = formFieldAdapters[field.type];
          if (field.meta.initialValue?.omrsObject && !isEmpty(field.meta.initialValue.refinedValue)) {
            initialValues[field.id] = field.meta.initialValue.refinedValue;
            return;
          }
          if (adapter) {
            if (hasRendering(field, 'repeating') && !field.meta?.repeat?.isClone) {
              repeatableFields.push(field);
            }
            let value = null;
            try {
              value = await adapter.getInitialValue(field, encounter, context);
              field.meta.initialValue.refinedValue = value;
            } catch (error) {
              console.error(error);
            }
            if (field.type === 'obsGroup') {
              return;
            }
            if (!isEmpty(value)) {
              initialValues[field.id] = value;
            } else if (!isEmpty(field.questionOptions.defaultValue)) {
              initialValues[field.id] = inferInitialValueFromDefaultFieldValue(field);
            } else {
              initialValues[field.id] = emptyValues[field.questionOptions.rendering] ?? '';
            }
            if (field.questionOptions.calculate?.calculateExpression) {
              try {
                await evaluateCalculateExpression(field, initialValues, context);
              } catch (error) {
                console.error(error);
              }
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
      const filteredFields = formFields.filter(
        (field) => field.questionOptions.rendering !== 'group' && field.type !== 'obsGroup',
      );
      const fieldsWithCalculateExpressions = [];
      await Promise.all(
        filteredFields.map(async (field) => {
          const adapter = formFieldAdapters[field.type];
          initialValues[field.id] = emptyValues[field.questionOptions.rendering] ?? null;
          if (isEmpty(initialValues[field.id]) && contextInitializableTypes.includes(field.type)) {
            try {
              initialValues[field.id] = await adapter.getInitialValue(field, null, context);
            } catch (error) {
              console.error(error);
            }
          }
          if (field.questionOptions.calculate?.calculateExpression) {
            fieldsWithCalculateExpressions.push(field);
          }
        }),
      );
      await Promise.all(
        fieldsWithCalculateExpressions.map(async (field) => {
          try {
            await evaluateCalculateExpression(field, initialValues, context);
          } catch (error) {
            console.error(error);
          }
        }),
      );
    }
    return initialValues;
  }

  async loadDependencies(
    context: FormContextProps,
    setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>,
  ) {
    const { patient, formJson } = context;
    const encounter = await getPreviousEncounter(patient?.id, formJson.encounterType);
    setContext((context) => {
      return {
        ...context,
        previousDomainObjectValue: encounter,
      };
    });
    return context;
  }

  async getHistoricalValue(field: FormField, context: FormContextProps): Promise<ValueAndDisplay> {
    const {
      formFields,
      sessionMode,
      patient,
      methods: { getValues },
      formFieldAdapters,
      previousDomainObjectValue,
    } = context;
    const node: FormNode = { value: field, type: 'field' };
    const adapter = formFieldAdapters[field.type];
    if (field.historicalExpression) {
      const value = await evaluateAsyncExpression(field.historicalExpression, node, formFields, getValues(), {
        mode: sessionMode,
        patient: patient,
        previousEncounter: previousDomainObjectValue,
      });
      return value ? extractObsValueAndDisplay(field, value) : null;
    }
    if (previousDomainObjectValue && field.questionOptions.enablePreviousValue) {
      return await adapter.getPreviousValue(field, previousDomainObjectValue, context);
    }
    return null;
  }
}

async function evaluateCalculateExpression(
  field: FormField,
  values: Record<string, any>,
  formContext: FormProcessorContextProps,
) {
  const { formFields, sessionMode, patient } = formContext;
  const expression = field.questionOptions.calculate.calculateExpression;
  const node: FormNode = { value: field, type: 'field' };
  const context = {
    mode: sessionMode,
    patient: patient,
  };
  const value = await evaluateAsyncExpression(expression, node, formFields, values, context);
  if (!isEmpty(value)) {
    values[field.id] = value;
  }
}
