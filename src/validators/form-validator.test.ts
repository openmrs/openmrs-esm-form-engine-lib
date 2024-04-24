import { FormField } from '../types';
import { FieldValidator } from './form-validator';

describe('FieldValidator - validate', () => {
  const numberInputField: FormField = {
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

  const textInputField: FormField = {
    label: 'A Question of type obs that renders a Text input',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: 'a-system-defined-concept-uuid',
      minLength: '5',
      maxLength: '10',
    },
    id: 'sampleTextQuestion',
  };

  const textInputFieldWithoutValidation: FormField = {
    label: 'A Question of type obs that renders a Text input',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: 'a-system-defined-concept-uuid',
    },
    id: 'sampleTextQuestion',
  };

  const textInputFieldWithMinValidation: FormField = {
    label: 'A Question of type obs that renders a Text input',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: 'a-system-defined-concept-uuid',
      minLength: '5',
    },
    id: 'sampleTextQuestion',
  };

  const textInputFieldWithMaxValidation: FormField = {
    label: 'A Question of type obs that renders a Text input',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: 'a-system-defined-concept-uuid',
      maxLength: '10',
    },
    id: 'sampleTextQuestion',
  };

  it('should fail on wrong max length only for inputText', () => {
    const validationErrors = FieldValidator.validate(textInputFieldWithMaxValidation, 'super long text to test');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Length should not exceed ${textInputField.questionOptions.maxLength} characters`,
        resultType: 'error',
      },
    ]);
  });

  it('should fail on wrong min length only for inputText', () => {
    const validationErrors = FieldValidator.validate(textInputFieldWithMinValidation, 'sup');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Length should be at least ${textInputField.questionOptions.minLength} characters`,
        resultType: 'error',
      },
    ]);
  });

  it('should not fail if min and max is not defined for inputText', () => {
    const validationErrors = FieldValidator.validate(
      textInputFieldWithoutValidation,
      'super text super text super text',
    );

    expect(validationErrors).toEqual([]);
  });

  it('should fail for text length greater than the max defined length', () => {
    const validationErrors = FieldValidator.validate(textInputField, 'super text super text super text');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Length should not exceed ${textInputField.questionOptions.maxLength} characters`,
        resultType: 'error',
      },
    ]);
  });

  it('should fail for text length lesser than the min defined length', () => {
    const validationErrors = FieldValidator.validate(textInputField, 'text');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Length should be at least ${textInputField.questionOptions.minLength} characters`,
        resultType: 'error',
      },
    ]);
  });

  it('should accept value with length within the defined range', () => {
    const validationErrors = FieldValidator.validate(textInputField, 'qwertyu');
    expect(validationErrors).toEqual([]);
  });

  it('should accept value with length equal to minLength', () => {
    const validationErrors = FieldValidator.validate(textInputField, 'qwert');
    expect(validationErrors).toEqual([]);
  });

  it('should accept value with length equal to maxLength', () => {
    const validationErrors = FieldValidator.validate(textInputField, 'qwertyuiop');
    expect(validationErrors).toEqual([]);
  });

  // Number Input Validator Tests
  it('should fail for number lesser than the defined min allowed', () => {
    const validationErrors = FieldValidator.validate(numberInputField, 3);

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Value must be greater than ${numberInputField.questionOptions.min}`,
        resultType: 'error',
      },
    ]);
  });

  it('should fail for numbers greater than the defined max allowed', () => {
    const validationErrors = FieldValidator.validate(numberInputField, 100);

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Value must be lower than ${numberInputField.questionOptions.max}`,
        resultType: 'error',
      },
    ]);
  });
});
