import { EncounterContext, FormField, OpenmrsEncounter, SubmissionHandler } from '..';

export const EncounterProviderHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    context.setEncounterProvider(value);
    return value;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    if (encounter) {
      return encounter.encounterProviders[0]?.provider?.uuid;
    } else {
      return context.encounterProvider;
    }
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    const encounterProvider = encounter.encounterProviders[0]?.provider;
    return encounterProvider ? { value: encounterProvider.uuid, display: encounterProvider.name } : null;
  },
};
