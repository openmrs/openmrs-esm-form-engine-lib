import moment from 'moment';
import { FieldValidator, OHRIFormField } from '../api/types';

export const OHRIDefaultFieldValueValidator: FieldValidator = {
  validate: (field: OHRIFormField, value: any) => {
    const codedTypes = ['radio', 'checkbox', 'select', 'content-switcher'];
    if (codedTypes.includes(field.questionOptions.rendering)) {
      // check whether value exists in answers
      if (!field.questionOptions.answers?.find(answer => answer.concept == value)) {
        return [
          { resultType: 'error', errCode: 'invalid.defaultValue', message: 'Value not found in coded answers list' },
        ];
      }
    }
    if (field.questionOptions.rendering == 'date') {
      // Check if value is a valid date value
      if (!moment(value, moment.ISO_8601, true).isValid()) {
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
