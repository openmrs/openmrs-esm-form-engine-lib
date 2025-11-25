import { renderHook } from '@testing-library/react';
import { useEvaluateFormFieldExpressions } from './useEvaluateFormFieldExpressions';
import { type FormProcessorContextProps, type FormField, type RenderType } from '../types';

// Mock form JSON
const mockFormJson = {
  name: 'test-form',
  uuid: 'test-uuid',
  pages: [],
  referencedForms: [],
  processor: 'EncounterFormProcessor',
  encounterType: 'test-encounter-type-uuid',
};

// Mock the form processor context
const createMockContext = (formFields: FormField[] = []): FormProcessorContextProps => ({
  formJson: mockFormJson,
  formFields,
  patient: {
    id: 'test-patient-id',
    resourceType: 'Patient',
  } as any,
  sessionMode: 'enter',
  visit: {} as any,
  sessionDate: new Date(),
  location: {} as any,
  currentProvider: {} as any,
  layoutType: 'desktop' as any,
  processor: {
    getHistoricalValue: jest.fn(),
  } as any,
  formFieldAdapters: {},
  formFieldValidators: {},
});

describe('useEvaluateFormFieldExpressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should evaluate field expressions and track dependencies', () => {
    const formValues = { field1: 'value1', field2: 'value2' };

    // Mock form fields with expressions that reference other fields
    const mockFields: FormField[] = [
      {
        id: 'field1',
        type: 'obs',
        questionOptions: {
          rendering: 'text' as any,
          answers: [],
        },
        hide: {
          hideWhenExpression: 'field2 === "hide"',
        },
        disabled: {
          disableWhenExpression: 'field1 === "disabled"',
        },
        readonly: 'field2 === "readonly"',
        isHidden: false,
        isDisabled: false,
        meta: {},
      },
      {
        id: 'field2',
        type: 'obs',
        questionOptions: {
          rendering: 'text' as any,
          answers: [
            {
              label: 'Answer 1',
              concept: 'answer1',
              hide: {
                hideWhenExpression: 'field1 === "hide_answer"',
              },
            },
            {
              label: 'Answer 2',
              concept: 'answer2',
              disable: {
                disableWhenExpression: 'field1 === "disable_answer"',
              },
            },
          ],
        },
        isHidden: false,
        isDisabled: false,
        meta: {},
      },
    ];

    const contextWithFields = createMockContext(mockFields);

    const { result } = renderHook(() =>
      useEvaluateFormFieldExpressions(formValues, contextWithFields)
    );

    // Check that fields are evaluated
    expect(result.current.evaluatedFields).toBeDefined();
    expect(result.current.evaluatedFields.length).toBe(2);

    // Check that expressions are evaluated
    const field1 = result.current.evaluatedFields.find(f => f.id === 'field1');
    const field2 = result.current.evaluatedFields.find(f => f.id === 'field2');

    expect(field1).toBeDefined();
    expect(field2).toBeDefined();

    // Field1 should not be hidden (field2 !== "hide")
    expect(field1.isHidden).toBe(false);

    // Field2 answers should be evaluated
    expect(field2.questionOptions.answers[0].isHidden).toBe(false); // field1 !== "hide_answer"
    expect(field2.questionOptions.answers[1].disable.isDisabled).toBe(false); // field1 !== "disable_answer"
  });

  it('should handle empty expressions gracefully', () => {
    const formValues = {};

    const mockFields: FormField[] = [
      {
        id: 'field1',
        type: 'obs',
        questionOptions: {
          rendering: 'text' as any,
          answers: [],
        },
        isHidden: false,
        isDisabled: false,
        meta: {},
      },
    ];

    const contextWithFields = createMockContext(mockFields);

    const { result } = renderHook(() =>
      useEvaluateFormFieldExpressions(formValues, contextWithFields)
    );

    expect(result.current.evaluatedFields).toBeDefined();
    expect(result.current.evaluatedFields.length).toBe(1);
  });

  it('should evaluate page and section visibility', () => {
    const formValues = { field1: 'value1' };

    const mockFields: FormField[] = [
      {
        id: 'field1',
        type: 'obs',
        questionOptions: {
          rendering: 'text' as any,
          answers: [],
        },
        isHidden: false,
        isDisabled: false,
        meta: {},
      },
    ];

    const formJsonWithPages = {
      ...mockFormJson,
      pages: [
        {
          label: 'page1',
          sections: [
            {
              label: 'section1',
              questions: [mockFields[0]],
              isHidden: false,
              isExpanded: 'true',
            },
          ],
          isHidden: false,
        },
      ],
    };

    const contextWithFields = createMockContext(mockFields);
    contextWithFields.formJson = formJsonWithPages;

    const { result } = renderHook(() =>
      useEvaluateFormFieldExpressions(formValues, contextWithFields)
    );

    expect(result.current.evaluatedFormJson).toBeDefined();
    expect(result.current.evaluatedPagesVisibility).toBe(true);
  });

  it('should handle fields with calculate expressions', () => {
    const formValues = { field1: 5, field2: 10 };

    const mockFields: FormField[] = [
      {
        id: 'field1',
        type: 'obs',
        questionOptions: {
          rendering: 'number' as any,
          answers: [],
          calculate: {
            calculateExpression: 'field2 * 2',
          },
        },
        isHidden: false,
        isDisabled: false,
        meta: {},
      },
      {
        id: 'field2',
        type: 'obs',
        questionOptions: {
          rendering: 'number' as any,
          answers: [],
        },
        isHidden: false,
        isDisabled: false,
        meta: {},
      },
    ];

    const contextWithFields = createMockContext(mockFields);

    const { result } = renderHook(() =>
      useEvaluateFormFieldExpressions(formValues, contextWithFields)
    );

    expect(result.current.evaluatedFields).toBeDefined();
    expect(result.current.evaluatedFields.length).toBe(2);
  });
});
