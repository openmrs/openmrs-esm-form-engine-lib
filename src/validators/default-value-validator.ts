import dayjs from 'dayjs';
import { type FormFieldValidator, type FormField } from '../types';
import { codedTypes } from '../constants';
import { isEmpty } from './form-validator';

export const DefaultValueValidator: FormFieldValidator = {
  validate: (field: FormField, value: any) => {
    if (!isEmpty(value) && codedTypes.includes(field.questionOptions.rendering)) {
      const valuesArray = Array.isArray(value) ? value : [value];
      // check whether value exists in answers
      if (
        !valuesArray.every((val: string) =>
          field.questionOptions.answers?.find((answer) => answer.concept === val || answer.value === val),
        )
      ) {
        return [
          { resultType: 'error', errCode: 'invalid.defaultValue', message: 'Value not found in coded answers list' },
        ];
      }
    }
    if (!isEmpty(value) && field.questionOptions.rendering == 'date') {
      // Check if value is a valid date value
      if (!dayjs(value).isValid()) {
        return [{ resultType: 'error', errCode: 'invalid.defaultValue', message: `Invalid date value: '${value}'` }];
      }
    }
    if (!isEmpty(value) && field.questionOptions.rendering == 'number') {
      if (isNaN(value)) {
        return [
          { resultType: 'error', errCode: 'invalid.defaultValue', message: `Invalid numerical  value: '${value}'` },
        ];
      }
    }
    return [];
  },
};
