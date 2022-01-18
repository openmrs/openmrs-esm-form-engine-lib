import moment from 'moment';
import { FieldValidator, OHRIFormField } from '../types';

export const OHRIDefaultFieldValueValidator: FieldValidator = {
  validate: (field: OHRIFormField, value: any) => {
    const codedTypes = ['radio', 'checkbox', 'select', 'content-switcher'];
    if (codedTypes.includes(field.questionOptions.rendering)) {
      // check whether value exists in answers
      if (!field.questionOptions.answers?.find(answer => answer.concept == value)) {
        return [{ errCode: 'invalid.defaultValue', errMessage: 'Value not found in coded answers list' }];
      }
    }
    if (field.questionOptions.rendering == 'date') {
      // Check if value is a valid date value
      if (!moment(value, moment.ISO_8601, true).isValid()) {
        return [{ errCode: 'invalid.defaultValue', errMessage: `Invalid date value: '${value}'` }];
      }
    }
    if (field.questionOptions.rendering == 'number') {
      if (isNaN(value)) {
        return [{ errCode: 'invalid.defaultValue', errMessage: `Invalid numerical  value: '${value}'` }];
      }
    }
    return [];
  },
};
