import { SubmissionHandler } from '..';
import { OpenmrsEncounter, OHRIFormField } from '../api/types';
import { EncounterContext } from '../ohri-form-context';

export const EncounterProviderHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    context.setEncounterProvider(value);
    return value;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: OHRIFormField,
    allFormFields: Array<OHRIFormField>,
    context: EncounterContext,
  ) => {
    if (encounter) {
      return encounter.encounterProviders[0]?.provider?.uuid;
    } else {
      return context.encounterProvider;
    }
  },

  getDisplayValue: (field: OHRIFormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: OHRIFormField, encounter: OpenmrsEncounter, allFormFields: Array<OHRIFormField>) => {
    const encounterProvider = encounter.encounterProviders[0]?.provider;
    return encounterProvider ? { value: encounterProvider.uuid, display: encounterProvider.name } : null;
  },
};
