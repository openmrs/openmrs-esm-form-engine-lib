import { type FormFieldValidator, type FormField } from '../types';

export const conditionalAnsweredValidator: FormFieldValidator = {
  validate: function (field: FormField, value: unknown, config: Record<string, any>) {
    const { referenceQuestionId, referenceQuestionAnswers, values, fields, message } = config;

    const referencedField = fields.find((field) => field.id === referenceQuestionId);
    const referencedFieldValue = values[referencedField.id] || referencedField.meta?.submission?.newValue?.value;

    if (!referencedFieldValue || !referenceQuestionAnswers.includes(referencedFieldValue)) {
      console.log(referencedFieldValue);
      console.log(referenceQuestionAnswers);
      if (!referencedFieldValue) {
        console.log('this failed because the referenced field has no value');
      }
      if (!referenceQuestionAnswers.includes(referencedFieldValue)) {
        console.log('this failed because the selected answer in the referenced field is not in the referenced answers');
      }
      return [{ resultType: 'error', errCode: 'invalid.valueSelected', message: message }];
    }
    console.log('validation should pass and return nothing');
    return [];
  },
};
