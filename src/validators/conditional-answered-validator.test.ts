import { conditionalAnsweredValidator } from './conditional-answered-validator';
import { isEmpty } from '../validators/form-validator';
import { type FormField, FormFieldValidator } from '../types';

jest.mock('../validators/form-validator', () => ({
  isEmpty: jest.fn(),
}));

describe('conditionalAnsweredValidator', () => {
  let field: FormField;
  let value: unknown;
  let config: any;

  beforeEach(() => {
    field = {
      label: 'Test Field',
      type: 'obs',
      questionOptions: { rendering: 'repeating', concept: 'j8b6705b-b6d8-4eju-8f37-0b14f5347569' },
      id: 'testFieldId',
    } as FormField;

    config = {
      referenceQuestionId: 'referenceQuestionId',
      referenceQuestionAnswers: ['answer1', 'answer2'],
      values: { referenceQuestionId: 'answer1' },
      fields: [{ id: 'referenceQuestionId' }],
      message: 'Invalid value selected',
    };
  });

  it('should return no error if value is empty', () => {
    (isEmpty as jest.Mock).mockReturnValue(true);
    value = '';

    const result = conditionalAnsweredValidator.validate(field, value, config);

    expect(result).toEqual([]);
  });

  it('should return no error if value is not empty and reference question answer is included', () => {
    (isEmpty as jest.Mock).mockReturnValue(false);
    value = 'some value';
    config.values.referenceQuestionId = 'answer1';

    const result = conditionalAnsweredValidator.validate(field, value, config);

    expect(result).toEqual([]);
  });

  it('should return an error if value is not empty and reference question answer is not included', () => {
    (isEmpty as jest.Mock).mockReturnValue(false);
    value = 'some value';
    config.values.referenceQuestionId = 'answer3';

    const result = conditionalAnsweredValidator.validate(field, value, config);

    expect(result).toEqual([
      { resultType: 'error', errCode: 'invalid.valueSelected', message: 'Invalid value selected' },
    ]);
  });
});
