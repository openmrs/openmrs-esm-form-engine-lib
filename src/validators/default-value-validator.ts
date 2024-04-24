import dayjs from 'dayjs';
import { FormFieldValidator, FormField } from '../types';
import { codedTypes } from '../constants';

export const DefaultFieldValueValidator: FormFieldValidator = {
  validate: (field: FormField, value: any) => {
    if (codedTypes.includes(field.questionOptions.rendering)) {
      // check whether value exists in answers
      if (!field.questionOptions.answers?.find((answer) => answer.concept == value)) {
        return [
          { resultType: 'error', errCode: 'invalid.defaultValue', message: 'Value not found in coded answers list' },
        ];
      }
    }
    if (field.questionOptions.rendering == 'date') {
      // Check if value is a valid date value
      if (!dayjs(value).isValid()) {
        return [{ resultType: 'error', errCode: 'invalid.defaultValue', message: `Invalid date value: '${value}'` }];
      }
    }
    if (field.questionOptions.rendering == 'number') {
      if (isNaN(value)) {
        return [
          { resultType: 'error', errCode: 'invalid.defaultValue', message: `Invalid numerical  value: '${value}'` },
        ];
      }
    }
    return [];
  },
};
