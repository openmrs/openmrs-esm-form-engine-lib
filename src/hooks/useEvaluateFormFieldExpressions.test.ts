import { renderHook, act } from '@testing-library/react';
import { useEvaluateFormFieldExpressions } from './useEvaluateFormFieldExpressions';
import { type FormProcessorContextProps, type FormField } from '../types';
import { evaluateExpression } from '../utils/expression-runner';
import { evalConditionalRequired, evaluateConditionalAnswered, evaluateHide } from '../utils/form-helper';
import { isEmpty } from '../validators/form-validator';

// ---- MOCK DEPENDENCIES ----

// Mock utility functions so we can control their behavior in tests
jest.mock('../utils/expression-runner', () => ({
  evaluateExpression: jest.fn(),
}));
jest.mock('../utils/form-helper', () => ({
  evalConditionalRequired: jest.fn(),
  evaluateConditionalAnswered: jest.fn(),
  evaluateHide: jest.fn(),
  isPageContentVisible: jest.fn(), // assume handled inside hook
}));
jest.mock('../validators/form-validator', () => ({
  isEmpty: jest.fn(),
}));
jest.mock('../utils/common-utils', () => ({
  updateFormSectionReferences: jest.fn((formJson) => formJson), // identity for simplicity
}));

// ---- TEST SUITE ----
describe('useEvaluateFormFieldExpressions', () => {
  // Mock form values that simulate user input
  const mockFormValues = { field1: 'value1' };

  // Minimal viable field with conditional expressions on required/readonly/etc.
  const mockField: FormField = {
    type: 'text',
    id: 'field1',
    required: true,
    readonly: 'someExpression', // dynamic readonly field
    questionOptions: {
      answers: [
        {
          label: 'Yes',
          value: 'yes',
          hide: { hideWhenExpression: 'answerHideExpr' },
          disable: { disableWhenExpression: 'answerDisableExpr', isDisabled: false },
        },
      ],
      rendering: 'repeating',
      repeatOptions: { limitExpression: 'limitExpr' },
    },
    validators: [{ type: 'conditionalAnswered' }],
    meta: {},
  };

  // Mock context simulating a full form setup
  const mockProcessorContext: FormProcessorContextProps = {
    formJson: {
      name: 'testForm',
      pages: [
        {
          label: 'Page 1',
          hide: { hideWhenExpression: 'pageHideExpr' },
          sections: [
            {
              label: 'Section 1',
              hide: { hideWhenExpression: 'sectionHideExpr' },
              isExpanded: 'false',
              questions: [mockField],
            },
          ],
        },
      ],
      processor: undefined,
      uuid: 'test uuid 0',
      referencedForms: [],
      encounterType: 'test encounter type',
    },
    formFields: [mockField],
    patient: {},
    sessionMode: 'enter',
    visit: undefined,
    sessionDate: undefined,
    location: undefined,
    currentProvider: undefined,
    layoutType: 'phone',
    processor: undefined,
  };

  // ---- SETUP/TEARDOWN ----

  beforeEach(() => {
    // Control mock return values before each test
    (evaluateExpression as jest.Mock).mockReturnValue(true);
    (evalConditionalRequired as jest.Mock).mockReturnValue(true);
    (evaluateConditionalAnswered as jest.Mock).mockImplementation(() => {});
    (evaluateHide as jest.Mock).mockImplementation((node) => {
      node.value.isHidden = true;
    });
    (isEmpty as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---- MAIN TEST CASE ----
  it('evaluates all expressions correctly and updates form state', async () => {
    const { result } = renderHook(() =>
      useEvaluateFormFieldExpressions(mockFormValues, mockProcessorContext),
    );

    // Wait for useEffect to run
    await act(async () => {
      await Promise.resolve();
    });

    const [evaluatedField] = result.current.evaluatedFields;

    // Field-level assertions
    expect(evaluatedField.isHidden).toBe(false);
    expect(evaluatedField.isRequired).toBe(true);
    expect(evaluatedField.isDisabled).toBe(false);
    expect(evaluatedField.readonly).toBe(true);

    // Answer-level assertions
    expect(evaluatedField.questionOptions.answers?.[0].isHidden).toBe(true);
    expect(evaluatedField.questionOptions.answers?.[0].disable.isDisabled).toBe(true);
    expect(evaluatedField.questionOptions.repeatOptions?.limit).toBe(true);

    // Overall form assertions
    expect(result.current.evaluatedFormJson).toEqual(mockProcessorContext.formJson);
    expect(result.current.evaluatedPagesVisibility).toBe(true);
  });

  // ---- EDGE CASES ----
  describe('useEvaluateFormFieldExpressions edge cases', () => {
    beforeEach(() => {
      (evaluateExpression as jest.Mock).mockReturnValue(true);
      (evalConditionalRequired as jest.Mock).mockReturnValue(true);
      (evaluateConditionalAnswered as jest.Mock).mockImplementation(() => {});
      (evaluateHide as jest.Mock).mockImplementation((node) => {
        node.value.isHidden = true;
      });
      (isEmpty as jest.Mock).mockReturnValue(false);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('handles empty formFields gracefully', () => {
      const processorContextEmptyFields: FormProcessorContextProps = {
        ...mockProcessorContext,
        formFields: [],
      };

      const { result } = renderHook(() =>
        useEvaluateFormFieldExpressions(mockFormValues, processorContextEmptyFields),
      );

      expect(result.current.evaluatedFields).toEqual([]);
      expect(result.current.evaluatedFormJson).toEqual(mockProcessorContext.formJson);
    });

    it('correctly evaluates when no hide expression is provided', () => {
      const fieldNoHide: FormField = {
        id: 'field3',
        type: 'obs',
        questionOptions: { rendering: null },
      };
      const contextNoHide = {
        ...mockProcessorContext,
        formFields: [fieldNoHide],
      };

      const { result } = renderHook(() =>
        useEvaluateFormFieldExpressions(mockFormValues, contextNoHide),
      );

      expect(result.current.evaluatedFields[0].isHidden).toBe(false);
    });

    it('handles readonly expressions that are boolean strings as boolean strings', () => {
      const fieldWithReadonlyTrue: FormField = {
        id: 'field5',
        type: 'obs',
        questionOptions: { rendering: null },
        readonly: 'true', // should remain a string
      };

      const contextReadonlyTrue = {
        ...mockProcessorContext,
        formFields: [fieldWithReadonlyTrue],
      };

      const { result } = renderHook(() =>
        useEvaluateFormFieldExpressions(mockFormValues, contextReadonlyTrue),
      );

      expect(result.current.evaluatedFields[0].readonly).toBe('true');
    });

    it('handles readonly expressions that are non-boolean strings', () => {
      const fieldWithReadonlyExpr: FormField = {
        id: 'field6',
        type: 'obs',
        questionOptions: { rendering: null },
        readonly: 'someExpression',
        meta: {},
      };

      const contextReadonlyExpr = {
        ...mockProcessorContext,
        formFields: [fieldWithReadonlyExpr],
      };

      (evaluateExpression as jest.Mock).mockReturnValueOnce(false);

      const { result } = renderHook(() =>
        useEvaluateFormFieldExpressions(mockFormValues, contextReadonlyExpr),
      );

      expect(result.current.evaluatedFields[0].meta.readonlyExpression).toBe('someExpression');
      expect(result.current.evaluatedFields[0].readonly).toBe(false);
    });

    it('handles answers without hide or disable expressions', () => {
      const fieldWithSimpleAnswers: FormField = {
        id: 'field7',
        type: 'testType',
        questionOptions: {
          answers: [
            { label: 'Option 1', value: 'opt1' },
            { label: 'Option 2', value: 'opt2' },
          ],
          rendering: 'radio',
        },
      };

      const contextSimpleAnswers = {
        ...mockProcessorContext,
        formFields: [fieldWithSimpleAnswers],
      };

      (isEmpty as jest.Mock).mockReturnValue(true); // simulate no hide/disable logic

      const { result } = renderHook(() =>
        useEvaluateFormFieldExpressions(mockFormValues, contextSimpleAnswers),
      );

      expect(result.current.evaluatedFields[0].questionOptions.answers[0].isHidden).toBeUndefined();
      expect(result.current.evaluatedFields[0].questionOptions.answers[0].disable).toBeUndefined();
    });
  });
});
