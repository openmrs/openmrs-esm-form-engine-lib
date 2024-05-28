import { type FormFieldValidator, type FormField } from '../types';

export const conditionalAnsweredValidator: FormFieldValidator = {
  validate: function (field: FormField, value: unknown, config: Record<string, any>) {
    const { referenceQuestionId, referenceQuestionAnswers, values, fields, message } = config;

    const referencedField = fields.find((field) => field.id === referenceQuestionId);
    const referencedFieldValue = referencedField.meta?.submission?.newValue?.value || values[referencedField.id];

    if (!referencedFieldValue || !referenceQuestionAnswers.includes(referencedFieldValue)) {
      return [{ resultType: 'error', errCode: 'invalid.valueSelected', message: message }];
    }

    return [];
  },
};
