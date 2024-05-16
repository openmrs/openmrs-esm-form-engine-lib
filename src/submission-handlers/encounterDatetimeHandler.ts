import { type SubmissionHandler } from '..';
import { type OpenmrsEncounter, type FormField } from '../types';
import { type EncounterContext } from '../form-context';

export const EncounterDatetimeHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    context.setEncounterDate(value);
    return value;
  },
  getInitialValue: (encounter: OpenmrsEncounter, field: FormField, allFormFields?: FormField[]) => {
    return encounter?.encounterDatetime ? new Date(encounter.encounterDatetime) : new Date();
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields?: FormField[]) => {
    return new Date(encounter.encounterDatetime);
  },
};
