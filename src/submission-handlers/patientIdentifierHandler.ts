import { type EncounterContext } from '../form-context';
import { type SubmissionHandler, type FormField, type OpenmrsEncounter } from '../types';
import { clearSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const PatientIdentifierHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    clearSubmission(field);
    if (field.meta?.previousValue?.value === value || isEmpty(value)) {
      return null;
    }
    field.meta.submission.newValue = {
      identifier: value,
      identifierType: field.questionOptions.identifierType,
      uuid: field.meta.previousValue?.id,
      location: context.location,
    };
    return value;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    const latestIdentifier = context.patient?.identifier?.find(
      (identifier) => identifier.type?.coding[0]?.code === field.questionOptions.identifierType,
    );
    field.meta = { ...(field.meta || {}), previousValue: latestIdentifier };
    return latestIdentifier?.value;
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    return null;
  },
};
