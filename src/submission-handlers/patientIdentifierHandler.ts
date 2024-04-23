import { SubmissionHandler } from '..';
import { OpenmrsEncounter, OHRIFormField } from '../api/types';
import { EncounterContext } from '../ohri-form-context';
import { getPatientLatestIdentifier } from '../utils/patientIdentifierProcessor';

export const PatientIdentifierHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    const patientIdentifier = {
        identifier: value,
        identifierType: field.questionOptions.identifierType,
        location:context.location
    };
    context.patientIdentifier = patientIdentifier
    return value;
  },
   getInitialValue: (
    encounter: OpenmrsEncounter,
    field: OHRIFormField,    
    allFormFields: Array<OHRIFormField>,
    context: EncounterContext,
  ) => {
    const patientIdentifier = getPatientLatestIdentifier(context.patient, field.questionOptions.identifierType);
    return patientIdentifier?.value;
  },

  getDisplayValue: (field: OHRIFormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: OHRIFormField, encounter: OpenmrsEncounter, allFormFields: Array<OHRIFormField>) => {
    return null;
  },

};
