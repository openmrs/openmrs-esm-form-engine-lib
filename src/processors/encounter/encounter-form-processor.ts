import { type FormProcessorContextProps } from '../../types';
import { usePatientPrograms } from '../../hooks/usePatientPrograms';
import { useEffect, useState } from 'react';
import { useEncounter } from '../../hooks/useEncounter';
import { isEmpty } from '../../validators/form-validator';
import { type FormSchema, type OpenmrsEncounter } from '../../types';
import { type FormContextProps } from '../../provider/form-provider';
import { FormProcessor } from '../form-processor';

function useCustomHooks(context: FormProcessorContextProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { encounter, isLoading: isLoadingEncounter } = useEncounter(context.formJson);
  const { isLoading: isLoadingPatientPrograms, patientPrograms } = usePatientPrograms(
    context.patient?.id,
    context.formJson,
  );

  useEffect(() => {
    setIsLoading(isLoadingPatientPrograms || isLoadingEncounter);
  }, [isLoadingPatientPrograms, isLoadingEncounter]);

  return {
    data: { encounter, patientPrograms },
    isLoading,
    error: null,
    updateContext: (data: any, processor: FormProcessor, setContext: (context: FormProcessorContextProps) => void) => {
      if (processor instanceof EncounterFormProcessor) {
        processor.encounter = data.encounter;
      } else {
        processor.domainObjectValue = data.encounter;
      }
      setContext({
        ...context,
        domainObjectValue: data.encounter,
        customDependencies: { ...context.customDependencies, ...data.patientPrograms },
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
  encounter: OpenmrsEncounter;

  prepareFormSchema(schema: FormSchema) {
    return schema;
  }

  processSubmission(context: FormContextProps) {
    return Promise.resolve({});
  }

  getDomainObject() {
    if (this.encounter) {
      return this.encounter;
    }
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
