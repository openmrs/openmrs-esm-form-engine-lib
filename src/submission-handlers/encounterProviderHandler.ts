import { SubmissionHandler } from '..';
import { getEncounterProviders } from '../api/api';
import { OpenmrsEncounter, OHRIFormField } from '../api/types';
import { EncounterContext } from '../ohri-form-context';

export const EncounterProviderHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    context.setEncounterProvider(value);
    return value;
  },
  getInitialValue: (encounter: OpenmrsEncounter, field: OHRIFormField, allFormFields?: OHRIFormField[]) => {
    return new Date(); // TO DO: pick it from the visit if present
  },

  getDisplayValue: (field: OHRIFormField, value: any) => {
    if (!field.value) {
      return null;
    }
    return value;
  },
  getPreviousValue: (field: OHRIFormField, encounter: OpenmrsEncounter, allFormFields: Array<OHRIFormField>) => {
    return null;
  },
};
