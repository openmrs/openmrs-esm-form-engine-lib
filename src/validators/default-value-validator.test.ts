import { FormField } from '../types';
import { DefaultFieldValueValidator } from './default-value-validator';

describe('DefaultFieldValueValidator - validate', () => {
  // setup
  const codedField: FormField = {
    label: 'Past enrolled patient programs',
    type: 'obs',
    questionOptions: {
      rendering: 'checkbox',
      concept: '3hbkj9-b6d8-4eju-8f37-0b14f5347jv9',
      answers: [
        { label: 'Oncology Screening and Diagnosis Program', concept: '105e7ad6-c1fd-11eb-8529-0242ac130ju9' },
        { label: 'Fight Malaria Initiative', concept: '305e7ad6-c1fd-11eb-8529-0242ac130003' },
      ],
    },
    id: 'past-patient-programs',
  };
  const dateField: FormField = {
    label: 'HTS Date',
    type: 'obs',
    questionOptions: {
      rendering: 'date',
      concept: 'j8b6705b-b6d8-4eju-8f37-0b14f5347569',
    },
    id: 'hts-date',
  };
  const numericField: FormField = {
    label: 'Temperature',
    type: 'obs',
    questionOptions: {
      rendering: 'number',
      concept: '2c43u05b-b6d8-4eju-8f37-0b14f5347560',
    },
    id: 'temperature',
  };
  it('should accept valid values for coded types', () => {
    // setup and replay
    const errors = DefaultFieldValueValidator.validate(codedField, '105e7ad6-c1fd-11eb-8529-0242ac130ju9');

    // verify
    expect(errors).toEqual([]);
  });

  it('should reject invalid values for coded types', () => {
    // setup and replay
    const errors = DefaultFieldValueValidator.validate(codedField, 'some none existing value');

    // verify
    expect(errors).toEqual([
      { errCode: 'invalid.defaultValue', message: 'Value not found in coded answers list', resultType: 'error' },
    ]);
  });

  it.only('should accept valid date values', () => {
    // setup and replay
    const errors = DefaultFieldValueValidator.validate(dateField, '2020-01-20');

    // verify
    expect(errors).toEqual([]);
  });

  it('should reject invalid date values', () => {
    // setup and replay
    const errors = DefaultFieldValueValidator.validate(dateField, 'test date');

    // verify
    expect(errors).toEqual([
      { errCode: 'invalid.defaultValue', message: `Invalid date value: 'test date'`, resultType: 'error' },
    ]);
  });

  it('should accept valid numeric values', () => {
    // setup and replay
    const errors = DefaultFieldValueValidator.validate(numericField, '500.5');

    // verify
    expect(errors).toEqual([]);
  });

  it('should reject invalid numeric values', () => {
    // setup and replay
    const errors = DefaultFieldValueValidator.validate(numericField, '500.5hds');

    // verify
    expect(errors).toEqual([
      { errCode: 'invalid.defaultValue', message: `Invalid numerical  value: '500.5hds'`, resultType: 'error' },
    ]);
  });
});
