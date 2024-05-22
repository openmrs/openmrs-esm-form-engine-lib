import { type EncounterContext, type FormField, type OpenmrsEncounter, type SubmissionHandler } from '..';
import { hasSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const InlineDateHandler: SubmissionHandler = {
  handleFieldSubmission(field: FormField, value: any, context: EncounterContext) {
    const targetField = context.getFormField(field.meta.targetField);
    if (hasSubmission(targetField) && !isEmpty(value)) {
      const refinedDate = value instanceof Date ? new Date(value.getTime() - value.getTimezoneOffset() * 60000) : value;
      targetField.meta.submission.newValue.obsDatetime = refinedDate;
    }
    return targetField;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    if (encounter) {
      const dateField = field.id.split('-');
      const correspondingQuestion = allFormFields.find(field => field.id === dateField[0]);
      const dateValue = correspondingQuestion?.meta?.previousValue?.obsDatetime;

      return new Date(dateValue);
    }
    return null;
  },
  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    if (encounter) {
      const dateField = field.id.split('-');
      const correspondingQuestion = allFormFields.find(field => field.id === dateField[0]);
      const dateValue = correspondingQuestion?.meta?.previousValue?.obsDatetime;
      return new Date(dateValue);
    }
    return null;
  },
}
