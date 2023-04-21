import { SubmissionHandler } from '..';
import { OpenmrsEncounter, OHRIFormField } from '../api/types';
import { EncounterContext } from '../ohri-form-context';

export const EncounterDatetimeHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    context.setEncounterDate(value);
    return value;
  },
  getInitialValue: (encounter: OpenmrsEncounter, field: OHRIFormField, allFormFields?: OHRIFormField[]) => {
    return new Date(); // TO DO: pick it from the visit if present
  },

  getDisplayValue: (field: OHRIFormField, value: any) => {
    return field.value ? field.value : null;
  },
  getPreviousValue: (field: OHRIFormField, value: any) => {
    return null;
  },
};
