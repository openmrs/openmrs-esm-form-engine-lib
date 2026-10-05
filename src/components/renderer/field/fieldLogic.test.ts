import { handleFieldLogic, validateFieldValue } from './fieldLogic';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { evaluateExpression } from '../../../utils/expression-runner';
import { type FormField } from '../../../types';
import { type FormContextProps } from '../../../provider/form-provider';
import { cloneRepeatField } from '../../repeat/helpers';

vi.mock('../../../utils/expression-runner', () => ({
  evaluateExpression: vi.fn(),
  evaluateAsyncExpression: vi.fn().mockResolvedValue({ result: 'mockedResult' }),
}));

describe('handleFieldLogic', () => {
  let mockContext: FormContextProps;
  let mockFieldCoded: FormField;

  beforeEach(() => {
    mockContext = {
      methods: {
        getValues: vi.fn().mockReturnValue({}),
        setValue: vi.fn(),
      },
      formFields: [],
      sessionMode: 'edit',
      patient: {},
      formFieldValidators: {},
      formFieldAdapters: {
        obs: {
          transformFieldValue: vi.fn(),
        },
      },
      formJson: { pages: [] },
      updateFormField: vi.fn(),
      setForm: vi.fn(),
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
    (evaluateExpression as Mock).mockReturnValue(true);

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

  it('should evaluate hide logic for repeated instances of a field', () => {
    (evaluateExpression as Mock).mockReturnValue(true);
    const repeatedOrder = {
      id: 'malariaOrder',
      type: 'testOrder',
      questionOptions: { rendering: 'repeating', answers: [] },
      hide: { hideWhenExpression: "testField !== 'yes'" },
      validators: [],
      meta: { pageId: 'page-1' },
    } as unknown as FormField;
    // repeated instances are not part of the form schema and carry no page id
    const repeatedOrderInstance = cloneRepeatField(repeatedOrder, null, 1);
    mockFieldCoded.fieldDependents = new Set([repeatedOrderInstance.id, repeatedOrder.id]);
    mockContext.formFields = [repeatedOrder, repeatedOrderInstance];
    mockContext.formJson = {
      pages: [{ id: 'page-1', label: 'Page 1', sections: [{ label: 'Section 1', questions: [repeatedOrder] }] }],
    } as unknown as FormContextProps['formJson'];

    handleFieldLogic(mockFieldCoded, mockContext);

    expect(repeatedOrderInstance.isHidden).toBe(true);
    expect(repeatedOrder.isHidden).toBe(true);
  });

  it('should skip dependents that are no longer in the form fields', () => {
    (evaluateExpression as Mock).mockReturnValue(true);
    const repeatedOrder = {
      id: 'malariaOrder',
      type: 'testOrder',
      questionOptions: { rendering: 'repeating', answers: [] },
      hide: { hideWhenExpression: "testField !== 'yes'" },
      validators: [],
      meta: { pageId: 'page-1' },
    } as unknown as FormField;
    const deletedInstance = cloneRepeatField(repeatedOrder, null, 1);
    const remainingInstance = cloneRepeatField(repeatedOrder, null, 2);
    // deleting a repeated row removes it from the form fields but leaves its id in `fieldDependents`
    mockFieldCoded.fieldDependents = new Set([repeatedOrder.id, deletedInstance.id, remainingInstance.id]);
    mockContext.formFields = [repeatedOrder, remainingInstance];
    mockContext.formJson = {
      pages: [{ id: 'page-1', label: 'Page 1', sections: [{ label: 'Section 1', questions: [repeatedOrder] }] }],
    } as unknown as FormContextProps['formJson'];

    expect(() => handleFieldLogic(mockFieldCoded, mockContext)).not.toThrow();
    expect(remainingInstance.isHidden).toBe(true);
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
        validate: vi.fn().mockReturnValue([{ resultType: 'error', message: 'Field is required' }]),
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
