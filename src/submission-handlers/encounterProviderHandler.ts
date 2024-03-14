import { SubmissionHandler } from '..';
import { OpenmrsEncounter, OHRIFormField } from '../api/types';
import { EncounterContext } from '../ohri-form-context';

export const EncounterProviderHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    context.setEncounterProvider(value);
    return value;
  },
  getInitialValue: (encounter: OpenmrsEncounter, field: OHRIFormField, allFormFields?: OHRIFormField[]) => {
    const encounterProvider = encounter.encounterProviders[0]?.provider;
    return encounterProvider ? encounterProvider.uuid : null;
  },

  getDisplayValue: (field: OHRIFormField, value: any) => {
    if (!field.value) {
      return null;
    }
    return value;
  },
  getPreviousValue: (field: OHRIFormField, encounter: OpenmrsEncounter, allFormFields: Array<OHRIFormField>) => {
    const encounterProvider = encounter.encounterProviders[0]?.provider;
    return encounterProvider ? { value: encounterProvider.uuid, display: encounterProvider.name } : null;
  },
};
