import { type EncounterContext, type FormField, type OpenmrsEncounter, type SubmissionHandler } from '..';
import { getPatientLatestIdentifier } from '../utils/patient-identifier-helper';

export const PatientIdentifierHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    return value;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    const patientIdentifier = getPatientLatestIdentifier(context.patient, field.questionOptions.identifierType);
    return patientIdentifier?.value;
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    return null;
  },
};
