import { isEmpty } from '../validators/form-validator';
import { type FormFieldValidator, type FormField } from '../types';

export const conditionalAnsweredValidator: FormFieldValidator = {
  validate: function (field: FormField, value: unknown, config: Record<string, any>) {
    const { referenceQuestionId, referenceQuestionAnswers, values, formFields, message } = config;

    const referencedField = formFields.find((field) => field.id === referenceQuestionId);
    const referencedFieldValue = values[referencedField.id];

    if (!isEmpty(value) && !referenceQuestionAnswers.includes(referencedFieldValue)) {
      return [{ resultType: 'error', errCode: 'invalid.valueSelected', message: message }];
    }

    return [];
  },
};
