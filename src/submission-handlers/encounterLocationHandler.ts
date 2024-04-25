import { EncounterContext, FormField, SubmissionHandler } from '..';
import { getAllLocations } from '../api/api';

export const EncounterLocationSubmissionHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    getAllLocations().then((data) => {
      context.setEncounterLocation(data.find((location) => location.uuid === value));
    });
    return value;
  },

  getInitialValue: (encounter: any, field: FormField, allFormFields: Array<FormField>, context: EncounterContext) => {
    if (encounter) {
      return encounter.location.uuid;
    } else {
      return context?.location?.uuid;
    }
  },

  getDisplayValue: (field: FormField, value) => {
    return value?.display;
  },

  getPreviousValue: (field: FormField, encounter: any, allFormFields: Array<FormField>) => {
    return {
      display: encounter.location.name,
      value: encounter.location.uuid,
    };
  },
};
