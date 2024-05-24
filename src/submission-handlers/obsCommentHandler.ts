import { type EncounterContext, type FormField, type OpenmrsEncounter, type SubmissionHandler } from '..';
import { hasSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const ObsCommentHandler: SubmissionHandler = {
  handleFieldSubmission(field: FormField, value: any, context: EncounterContext) {
    const targetField = context.getFormField(field.meta.targetField);
    if (hasSubmission(targetField) && !isEmpty(value)) {
      targetField.meta.submission.newValue.comment = value;
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
      const commentField = field.id.split('_');
      const correspondingQuestion = allFormFields.find((field) => field.id === commentField[0]);
      return correspondingQuestion?.meta?.previousValue?.comment;
    }
    return null;
  },
  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    if (encounter) {
      const commentField = field.id.split('_');
      const correspondingQuestion = allFormFields.find((field) => field.id === commentField[0]);
      const t = correspondingQuestion?.meta?.previousValue?.comment;
      return t;
    }
    return null;
  },
};
