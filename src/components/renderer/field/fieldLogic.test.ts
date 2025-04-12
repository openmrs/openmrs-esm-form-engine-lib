import { handleFieldLogic, validateFieldValue } from './fieldLogic';
import { evaluateExpression } from '../../../utils/expression-runner';
import { type FormField } from '../../../types';
import { type FormContextProps } from '../../../provider/form-provider';

jest.mock('../../../utils/expression-runner', () => ({
  evaluateExpression: jest.fn(),
  evaluateAsyncExpression: jest.fn().mockResolvedValue({ result: 'mockedResult' }),
}));

describe('handleFieldLogic', () => {
  let mockContext: FormContextProps;
  let mockFieldCoded: FormField;

  beforeEach(() => {
    mockContext = {
      methods: {
        getValues: jest.fn().mockReturnValue({}),
        setValue: jest.fn(),
      },
      formFields: [],
      sessionMode: 'edit',
      patient: {},
      formFieldValidators: {},
      formFieldAdapters: {
        obs: {
          transformFieldValue: jest.fn(),
        },
      },
      formJson: { pages: [] },
      updateFormField: jest.fn(),
      setForm: jest.fn(),
    } as unknown as FormContextProps;

    mockFieldCoded = {
      id: 'testField',
      label: 'Test Field',
      type: 'obs',
      questionOptions: {
        rendering: 'radio',
        answers: [
          {
            label: 'Test Answer',
            concept: 'testConcept',
            disable: {
              disableWhenExpression: 'myValue > 10',
            },
          },
        ],
      },
      fieldDependents: [],
      sectionDependents: [],
      pageDependents: [],
      validators: [],
    } as unknown as FormField;
  });

  it('should evaluate field answer disabled logic', () => {
    (evaluateExpression as jest.Mock).mockReturnValue(true);

    handleFieldLogic(mockFieldCoded, mockContext);

    expect(evaluateExpression).toHaveBeenCalledWith(
      'myValue > 10',
      { value: mockFieldCoded, type: 'field' },
      mockContext.formFields,
      mockContext.methods.getValues(),
      {
        mode: mockContext.sessionMode,
        patient: mockContext.patient,
      },
    );
    expect(mockFieldCoded.questionOptions.answers[0].disable.isDisabled).toBe(true);
  });

  it('should handle field dependents logic', () => {
    mockFieldCoded.fieldDependents = new Set(['dependentField']);
    mockContext.formFields = [
      {
        id: 'dependentField',
        type: 'obs',
        questionOptions: {
          calculate: {
            calculateExpression: '2 + 2',
          },
        },
        validators: [],
        meta: {},
      } as unknown as FormField,
    ];
    handleFieldLogic(mockFieldCoded, mockContext);

    expect(mockContext.updateFormField).toHaveBeenCalled();
  });
});

describe('validateFieldValue', () => {
  let mockField: FormField;
  let mockValidators: Record<string, any>;
  let mockContext: any;

  beforeEach(() => {
    mockField = {
      id: 'testField',
      validators: [
        {
          type: 'required',
        },
      ],
      meta: {},
    } as unknown as FormField;

    mockValidators = {
      required: {
        validate: jest.fn().mockReturnValue([{ resultType: 'error', message: 'Field is required' }]),
      },
    };

    mockContext = {
      formFields: [],
      values: {},
      expressionContext: {
        patient: {},
        mode: 'edit',
      },
    };
  });

  it('should validate field value and return errors and warnings', () => {
    const result = validateFieldValue(mockField, '', mockValidators, mockContext);

    expect(mockValidators.required.validate).toHaveBeenCalledWith(mockField, '', expect.objectContaining(mockContext));
    expect(result.errors).toEqual([{ resultType: 'error', message: 'Field is required' }]);
    expect(result.warnings).toEqual([]);
  });

  it('should return empty errors and warnings if field submission is unspecified', () => {
    mockField.meta.submission = { unspecified: true };

    const result = validateFieldValue(mockField, '', mockValidators, mockContext);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
