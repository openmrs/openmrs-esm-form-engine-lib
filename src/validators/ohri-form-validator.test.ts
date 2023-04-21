import { OHRIFormField } from '../api/types';
import { OHRIFieldValidator } from './ohri-form-validator';

describe('OHRIFieldValidator - validate', () => {
  const numberInputField: OHRIFormField = {
    label: 'A Question of type obs that renders a Number input',
    type: 'obs',
    questionOptions: {
      rendering: 'number',
      concept: 'a-system-defined-concept-uuid',
      min: '5',
      max: '10',
    },
    id: 'sampleNumberQuestion',
  };

  const textInputField: OHRIFormField = {
    label: 'A Question of type obs that renders a Text input',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: 'a-system-defined-concept-uuid',
      min: '5',
      max: '10',
    },
    id: 'sampleTextQuestion',
  };

  const textInputFieldWithoutValidation: OHRIFormField = {
    label: 'A Question of type obs that renders a Text input',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: 'a-system-defined-concept-uuid',
    },
    id: 'sampleTextQuestion',
  };

  const textInputFieldWithMinValidation: OHRIFormField = {
    label: 'A Question of type obs that renders a Text input',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: 'a-system-defined-concept-uuid',
      min: '5',
    },
    id: 'sampleTextQuestion',
  };

  const textInputFieldWithMaxValidation: OHRIFormField = {
    label: 'A Question of type obs that renders a Text input',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: 'a-system-defined-concept-uuid',
      max: '10',
    },
    id: 'sampleTextQuestion',
  };

  it('should fail on wrong max length only for inputText', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputFieldWithMaxValidation, 'super long text to test');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Field length error, field length can't be greater than ${textInputField.questionOptions.max}`,
        resultType: 'error',
      },
    ]);
  });

  it('should fail on wrong min length only for inputText', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputFieldWithMinValidation, 'sup');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Field length error, field length can't be less than ${textInputField.questionOptions.min}`,
        resultType: 'error',
      },
    ]);
  });

  it('should not fail if min and max is not defined for inputText', () => {
    const validationErrors = OHRIFieldValidator.validate(
      textInputFieldWithoutValidation,
      'super text super text super text',
    );

    expect(validationErrors).toEqual(undefined);
  });

  it('should fail for text length greater than the max defined length', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputField, 'super text super text super text');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Field length error, field length should be between ${textInputField.questionOptions.min} and ${textInputField.questionOptions.max}.`,
        resultType: 'error',
      },
    ]);
  });

  it('should fail for text length lesser than the min defined length', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputField, 'text');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Field length error, field length should be between ${textInputField.questionOptions.min} and ${textInputField.questionOptions.max}.`,
        resultType: 'error',
      },
    ]);
  });

  it('should accept value with length within the defined range', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputField, 'qwertyu');
    expect(validationErrors).toEqual([]);
  });

  it('should accept value with length equal to minLength', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputField, 'qwert');
    expect(validationErrors).toEqual([]);
  });

  it('should accept value with length equal to maxLength', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputField, 'qwertyuiop');
    expect(validationErrors).toEqual([]);
  });

  it('should fail for number lesser than the defined min allowed', () => {
    const validationErrors = OHRIFieldValidator.validate(numberInputField, 3);

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Field value can't be less than ${numberInputField.questionOptions.min}`,
        resultType: 'error',
      },
    ]);
  });

  it('should fail for number greater than the defined max allowed', () => {
    const validationErrors = OHRIFieldValidator.validate(numberInputField, 100);

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Field value can't be greater than ${numberInputField.questionOptions.max}`,
        resultType: 'error',
      },
    ]);
  });

  it('should accept value equal to min allowed', () => {
    const validationErrors = OHRIFieldValidator.validate(numberInputField, numberInputField.questionOptions.min);
    expect(validationErrors).toEqual(undefined);
  });

  it('should accept value equal to max allowed', () => {
    const validationErrors = OHRIFieldValidator.validate(numberInputField, numberInputField.questionOptions.max);
    expect(validationErrors).toEqual(undefined);
  });
});