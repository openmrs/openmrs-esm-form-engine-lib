import { type FormProcessorContextProps } from '../../types';
import { usePatientPrograms } from '../../hooks/usePatientPrograms';
import { useEffect, useState } from 'react';
import { useEncounter } from '../../hooks/useEncounter';
import { isEmpty } from '../../validators/form-validator';
import { type FormSchema } from '../../types';
import { type FormContextProps } from '../../provider/form-provider';
import { FormProcessor } from '../form-processor';
import {
  getMutableSessionProps,
  prepareEncounter,
  preparePatientIdentifiers,
  preparePatientPrograms,
  saveAttachments,
  savePatientIdentifiers,
  savePatientPrograms,
} from './encounter-processor-helper';
import { showSnackbar, translateFrom } from '@openmrs/esm-framework';
import { moduleName } from '../../globals';
import { extractErrorMessagesFromResponse } from '../../utils/error-utils';
import { saveEncounter } from '../../api/api';
import { useEncounterRole } from '../../hooks/useEncounterRole';

function useCustomHooks(context: Partial<FormProcessorContextProps>) {
  const [isLoading, setIsLoading] = useState(false);
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
    updateContext: (data: any, setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>) => {
      setContext((context) => {
        context.processor.domainObjectValue = data.encounter;
        return {
          ...context,
          domainObjectValue: data.encounter,
          customDependencies: {
            ...context.customDependencies,
            patientPrograms: data.patientPrograms,
            encounterRole: data.encounterRole,
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

  getDomainObject() {
    return super.getDomainObject();
  }

  getCustomHooks() {
    return { useCustomHooks };
  }

  loadDependencies(context: FormProcessorContextProps) {
    return Promise.resolve();
  }

  resolveContextDependencies(
    context: FormProcessorContextProps,
    setContext: (context: FormProcessorContextProps) => void,
  ) {
    // TODO: Implement logic to resolve the context dependencies for the encounter form
  }

  async getInitialValues(context: FormProcessorContextProps) {
    // TODO: Handle calculate expressions and default values
    // TODO: Support async initial values. This includes "attachments"
    // TODO: Handle repeatable fields
    // TODO: Handle context initializable fields eg. encounterProvider, encounterRole etc.
    // TODO: Handle "unspecified" fields
    const { domainObjectValue: encounter, formFields, formFieldAdapters } = context;

    if (encounter) {
      return formFields
        .filter((field) => isEmpty(field.meta?.previousValue))
        .reduce(async (values, field) => {
          const adapter = formFieldAdapters[field.type];
          if (adapter) {
            values[field.id] = await adapter.getInitialValue(field, encounter, context);
          } else {
            console.warn(`No adapter found for field type ${field.type}`);
          }
          return values;
        }, {});
    } else {
      const initialValues = formFields
        .filter((field) => field.questionOptions.rendering !== 'group' && field.type !== 'obsGroup')
        .reduce((values, field) => {
          values[field.id] = emptyValues[field.questionOptions.rendering] ?? null;
          return values;
        }, {});
      return initialValues;
    }
  }
}
