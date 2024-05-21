import { type EncounterContext, type FormField, type OpenmrsEncounter, type SubmissionHandler } from '..';

export const EncounterRoleHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    context.setEncounterRole(value);
    return value;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    if (encounter) {
      return encounter.encounterProviders[0]?.encounterRole?.uuid;
    } else {
      return context.encounterRole;
    }
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    const encounterRole = encounter.encounterProviders[0]?.encounterRole?.uuid;
    return encounterRole || null;
  },
};
