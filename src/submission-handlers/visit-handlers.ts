import moment from 'moment';
import { OHRIFormField, OpenmrsEncounter, SubmissionHandler } from '../api/types';
import { EncounterContext } from '../ohri-form-context';

/**
 * Submission handler for provider and location
 */
export const ProviderLocationSubmissionHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    return null;
  },
  getInitialValue: function(encounter: OpenmrsEncounter, field: OHRIFormField, allFormFields?: OHRIFormField[]): {} {
    throw new Error('Function not implemented.');
  },
  getDisplayValue: function(field: OHRIFormField, value: any) {
    throw new Error('Function not implemented.');
  },
};
