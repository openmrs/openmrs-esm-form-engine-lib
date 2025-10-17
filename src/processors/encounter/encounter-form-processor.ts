import { useEffect, useState } from 'react';
import { type OpenmrsResource, showSnackbar, translateFrom, compile, extractVariableNames } from '@openmrs/esm-framework';
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
import { evaluateAsyncExpression, type FormNode, trackFieldDependenciesFromString } from '../../utils/expression-runner';
import { extractErrorMessagesFromResponse } from '../../utils/error-utils';
import { extractObsValueAndDisplay } from '../../utils/form-helper';
import { extractVariableNamesFromExpression } from '../../utils/variable-extractor';
import { FormProcessor } from '../form-processor';
import { getPreviousEncounter, saveEncounter } from '../../api';
import { hasRendering } from '../../utils/common-utils';
import { isEmpty } from '../../validators/form-validator';
import { formEngineAppName } from '../../globals';
import { type FormContextProps } from '../../provider/form-provider';
import { useEncounter } from '../../hooks/useEncounter';
import { useEncounterRole } from '../../hooks/useEncounterRole';
import { usePatientPrograms } from '../../hooks/usePatientPrograms';
import { type TOptions } from 'i18next';

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
    const t = (key: string, defaultValue: string, options?: Omit<TOptions, 'ns' | 'defaultValue'>) =>
      translateFrom(formEngineAppName, key, defaultValue, options);
    const patientIdentifiers = preparePatientIdentifiers(context.formFields, encounterLocation);
    const encounter = prepareEncounter(context, encounterDate, encounterRole, encounterProvider, encounterLocation);

    // save patient identifiers
    try {
      await Promise.all(savePatientIdentifiers(context.patient, patientIdentifiers));
      if (patientIdentifiers?.length) {
        showSnackbar({
          title: t('patientIdentifiersSaved', 'Patient identifier(s) saved successfully'),
          kind: 'success',
          isLowContrast: true,
        });
      }
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: t('errorSavingPatientIdentifiers', 'Error saving patient identifiers'),
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
          title: t('patientProgramsSaved', 'Patient program(s) saved successfully'),
          kind: 'success',
          isLowContrast: true,
        });
      }
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: t('errorSavingPatientPrograms', 'Error saving patient program(s)'),
        description: errorMessages.join(', '),
        kind: 'error',
        critical: true,
      });
    }

    // save encounter
    try {
      const { data: savedEncounter } = await saveEncounter(abortController, encounter, encounter.uuid);
      const savedOrders = savedEncounter.orders.map((order) => order.orderNumber);
      const savedDiagnoses = savedEncounter.diagnoses.map((diagnosis) => diagnosis.display);
      if (savedOrders.length) {
        showSnackbar({
          title: t('ordersSaved', 'Order(s) saved successfully'),
          subtitle: savedOrders.join(', '),
          kind: 'success',
          isLowContrast: true,
        });
      }
      // handle diagnoses
      if (savedDiagnoses.length) {
        showSnackbar({
          title: t('diagnosisSaved', 'Diagnosis(es) saved successfully'),
          subtitle: savedDiagnoses.join(', '),
          kind: 'success',
          isLowContrast: true,
        });
      }
      // handle attachments
      try {
        const attachmentsResponse = await saveAttachments(context.formFields, savedEncounter, abortController);

        if (attachmentsResponse?.length) {
          showSnackbar({
            title: t('attachmentsSaved', 'Attachment(s) saved successfully'),
            kind: 'success',
            isLowContrast: true,
          });
        }
      } catch (error) {
        console.error('Error saving attachments', error);
        const errorMessages = extractErrorMessagesFromResponse(error);
        return Promise.reject({
          title: t('errorSavingAttachments', 'Error saving attachment(s)'),
          description: errorMessages.join(', '),
          kind: 'error',
          critical: true,
        });
      }
      return savedEncounter;
    } catch (error) {
      console.error('Error saving encounter', error);
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: t('errorSavingEncounter', 'Error saving encounter'),
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

      // Initialize basic values first
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
          if (field.questionOptions.defaultValue) {
            initialValues[field.id] = inferInitialValueFromDefaultFieldValue(field);
          }
        }),
      );

      // Evaluate calculate expressions in dependency order
      const fieldsWithCalculateExpressions = filteredFields.filter(
        (field) => field.questionOptions.calculate?.calculateExpression
      );

      if (fieldsWithCalculateExpressions.length > 0) {
        // Build dependency graph and get evaluation order
        const dependencyGraph = buildDependencyGraph(fieldsWithCalculateExpressions);
        const evaluationOrder = topologicalSort(dependencyGraph);

        // Evaluate fields in dependency order
        for (const fieldId of evaluationOrder) {
          const field = fieldsWithCalculateExpressions.find(f => f.id === fieldId);
          if (field) {
            try {
              await evaluateCalculateExpression(field, initialValues, context);
            } catch (error) {
              console.error(`Error evaluating calculate expression for field ${field.id}:`, error);
            }
          }
        }
      }
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

/**
 * Extracts dependencies from a calculate expression by parsing the JavaScript code
 */
export function extractDependencies(expression: string): string[] {
  try {
    // First try using the framework's extractVariableNames function if available
    if (typeof extractVariableNames === 'function') {
      return extractVariableNames(expression);
    }

    // Fallback to our AST-based extraction for more accurate parsing
    return extractVariableNamesFromExpression(expression);
  } catch (error) {
    console.warn('Failed to extract dependencies from expression:', expression, error);
    return [];
  }
}

/**
 * Builds a dependency graph for calculate expressions
 */
export function buildDependencyGraph(fields: FormField[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const field of fields) {
    if (field.questionOptions?.calculate?.calculateExpression) {
      const dependencies = extractDependencies(field.questionOptions.calculate.calculateExpression);
      // Filter dependencies to only include other field IDs
      const fieldDependencies = dependencies.filter(dep =>
        fields.some(f => f.id === dep)
      );
      graph.set(field.id, fieldDependencies);
    } else {
      graph.set(field.id, []);
    }
  }

  return graph;
}

/**
 * Performs topological sort on the dependency graph
 */
export function topologicalSort(graph: Map<string, string[]>): string[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];
  const cycleDetected = new Set<string>();

  function visit(node: string): void {
    if (visiting.has(node)) {
      // Cycle detected - mark it but continue processing
      console.warn(`Circular dependency detected involving field: ${node}`);
      cycleDetected.add(node);
      return;
    }
    if (visited.has(node)) {
      return;
    }

    visiting.add(node);

    const dependencies = graph.get(node) || [];
    for (const dep of dependencies) {
      visit(dep);
    }

    visiting.delete(node);
    visited.add(node);
    result.push(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      visit(node);
    }
  }

  // If we detected cycles, add the cycle nodes to the result anyway
  // This ensures we don't lose any fields even with circular dependencies
  for (const node of cycleDetected) {
    if (!result.includes(node)) {
      result.push(node);
    }
  }

  return result;
}
