import { SubmissionHandler } from '..';
import { OpenmrsEncounter, OHRIFormField } from '../api/types';
import { EncounterContext } from '../ohri-form-context';

export const EncounterDatetimeHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    context.setEncounterDate(value);
    return value;
  },
  getInitialValue: (encounter: OpenmrsEncounter, field: OHRIFormField, allFormFields?: OHRIFormField[]) => {
    return encounter?.encounterDatetime ? new Date(encounter.encounterDatetime) : new Date();
  },

  getDisplayValue: (field: OHRIFormField, value: any) => {
    return field.value;
  },
  getPreviousValue: (field: OHRIFormField, encounter: OpenmrsEncounter, allFormFields?: OHRIFormField[]) => {
    return new Date(encounter.encounterDatetime);
  },
};
