import { map } from 'rxjs/operators';
import { SubmissionHandler } from '..';
import { getAllLocations } from '../api/api';
import { OpenmrsEncounter, OHRIFormField } from '../api/types';
import { EncounterContext } from '../ohri-form-context';

export const EncounterLocationSubmissionHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    getAllLocations().subscribe((data) => {
      context.setEncounterLocation(data.find((location) => location.uuid === value));
    });
    return value;
  },

  getInitialValue: (
    encounter: any,
    field: OHRIFormField,
    allFormFields: Array<OHRIFormField>,
    context: EncounterContext,
  ) => {
    if (encounter) {
      return encounter.location.uuid;
    } else {
      return context?.location?.uuid;
    }
  },

  getDisplayValue: (field: OHRIFormField, value) => {
    return value.display;
  },

  getPreviousValue: (field: OHRIFormField, encounter: any, allFormFields: Array<OHRIFormField>) => {
    return {
      display: encounter.location.name,
      value: encounter.location.uuid,
    };
  },
};
