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
      minLength: '5',
      maxLength: '10',
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
      minLength: '5',
    },
    id: 'sampleTextQuestion',
  };

  const textInputFieldWithMaxValidation: OHRIFormField = {
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
    const validationErrors = OHRIFieldValidator.validate(textInputFieldWithMaxValidation, 'super long text to test');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Length should not exceed ${textInputField.questionOptions.maxLength} characters`,
        resultType: 'error',
      },
    ]);
  });

  it('should fail on wrong min length only for inputText', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputFieldWithMinValidation, 'sup');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Length should be at least ${textInputField.questionOptions.minLength} characters`,
        resultType: 'error',
      },
    ]);
  });

  it('should not fail if min and max is not defined for inputText', () => {
    const validationErrors = OHRIFieldValidator.validate(
      textInputFieldWithoutValidation,
      'super text super text super text',
    );

    expect(validationErrors).toEqual([]);
  });

  it('should fail for text length greater than the max defined length', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputField, 'super text super text super text');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Length should not exceed ${textInputField.questionOptions.maxLength} characters`,
        resultType: 'error',
      },
    ]);
  });

  it('should fail for text length lesser than the min defined length', () => {
    const validationErrors = OHRIFieldValidator.validate(textInputField, 'text');

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Length should be at least ${textInputField.questionOptions.minLength} characters`,
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

  // Number Input Validator Tests
  it('should fail for number lesser than the defined min allowed', () => {
    const validationErrors = OHRIFieldValidator.validate(numberInputField, 3);

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Value must be greater than ${numberInputField.questionOptions.min}`,
        resultType: 'error',
      },
    ]);
  });

  it('should fail for numbers greater than the defined max allowed', () => {
    const validationErrors = OHRIFieldValidator.validate(numberInputField, 100);

    expect(validationErrors).toEqual([
      {
        errCode: 'field.outOfBound',
        message: `Value must be lower than ${numberInputField.questionOptions.max}`,
        resultType: 'error',
      },
    ]);
  });
});
