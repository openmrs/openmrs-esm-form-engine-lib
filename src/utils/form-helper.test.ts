import {
  findConceptByReference,
  inferInitialValueFromDefaultFieldValue,
  isInlineView,
  evaluateConditionalAnswered,
  evaluateFieldReadonlyProp,
  parseToLocalDateTime,
  evaluateDisabled,
} from './form-helper';
import { DefaultValueValidator } from '../validators/default-value-validator';
import { type LayoutType } from '@openmrs/esm-framework';
import { ConceptTrue } from '../constants';
import { type FormField, type OpenmrsEncounter, type SessionMode, type SubmissionHandler } from '../types';
import { type EncounterContext } from '../form-context';

jest.mock('../validators/default-value-validator');

describe('Form Engine Helper', () => {
  describe('findConceptByReference', () => {
    const concepts = [
      {
        uuid: '3cd6f600-26fe-102b-80cb-0017a47871b2',
        display: 'Yes',
        conceptMappings: [
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'SNOMED CT',
              },
              code: '373066001',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'PIH',
              },
              code: 'YES',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'CIEL',
              },
              code: '1065',
            },
          },
        ],
      },
      {
        uuid: '3cd6f86c-26fe-102b-80cb-0017a47871b2',
        display: 'No',
        conceptMappings: [
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'PIH',
              },
              code: 'NO',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'CIEL',
              },
              code: '1066',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'SNOMED CT',
              },
              code: '373067005',
            },
          },
        ],
      },
    ];

    it('should find concept by mapping', () => {
      expect(findConceptByReference('CIEL:1066', concepts).uuid).toBe('3cd6f86c-26fe-102b-80cb-0017a47871b2');
    });
    it('should find concept by uuid', () => {
      expect(findConceptByReference('3cd6f86c-26fe-102b-80cb-0017a47871b2', concepts).uuid).toBe(
        '3cd6f86c-26fe-102b-80cb-0017a47871b2',
      );
    });
    it('should return undefined if no match', () => {
      expect(findConceptByReference('CIEL:9999', concepts)).toBeUndefined();
    });
    it('should return undefined if null input', () => {
      expect(findConceptByReference(null, concepts)).toBeUndefined();
    });
  });

  describe('inferInitialValueFromDefaultFieldValue', () => {
    const mockHandleFieldSubmission = jest.fn();
    const mockHandler: SubmissionHandler = {
      handleFieldSubmission: mockHandleFieldSubmission,
      getInitialValue: function (
        encounter: OpenmrsEncounter,
        field: FormField,
        allFormFields?: FormField[],
        context?: EncounterContext,
      ): {} {
        throw new Error('Function not implemented.');
      },
      getDisplayValue: function (field: FormField, value: any) {
        throw new Error('Function not implemented.');
      },
    };

    const sampleContext: EncounterContext = {
      patient: {
        id: '833db896-c1f0-11eb-8529-0242ac130003',
      },
      encounter: {
        uuid: '773455da-3ec4-453c-b565-7c1fe35426be',
        encounterProviders: [],
        obs: [],
      },
      location: {},
      sessionMode: 'edit',
      encounterDate: new Date(),
      setEncounterDate: jest.fn(),
      encounterProvider: '',
      setEncounterProvider: jest.fn(),
      setEncounterLocation: jest.fn(),
      encounterRole: '',
      setEncounterRole: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true if rendering is toggle and default value is ConceptTrue', () => {
      const sampleField: FormField = {
        label: 'Sample Toggle Field',
        type: 'obs',
        questionOptions: { rendering: 'toggle', defaultValue: ConceptTrue },
        id: 'toggle-field',
      };

      const result = inferInitialValueFromDefaultFieldValue(sampleField, sampleContext, mockHandler);

      expect(result).toBe(true);
    });

    it('should validate default value and handle field submission if valid', () => {
      const sampleField: FormField = {
        label: 'Sample Field',
        type: 'obs',
        questionOptions: { rendering: 'text', defaultValue: 'valid-value' },
        id: 'text-field',
      };

      (DefaultValueValidator.validate as jest.Mock).mockReturnValue([]);

      const result = inferInitialValueFromDefaultFieldValue(sampleField, sampleContext, mockHandler);

      expect(DefaultValueValidator.validate).toHaveBeenCalledWith(sampleField, 'valid-value');
      expect(mockHandleFieldSubmission).toHaveBeenCalledWith(sampleField, 'valid-value', sampleContext);
      expect(result).toBe('valid-value');
    });

    it('should not handle field submission if default value is invalid', () => {
      const sampleField: FormField = {
        label: 'Sample Field',
        type: 'obs',
        questionOptions: { rendering: 'text', defaultValue: 'invalid-value' },
        id: 'text-field',
      };

      (DefaultValueValidator.validate as jest.Mock).mockReturnValue(['Error: Invalid value']);

      const result = inferInitialValueFromDefaultFieldValue(sampleField, sampleContext, mockHandler);

      expect(DefaultValueValidator.validate).toHaveBeenCalledWith(sampleField, 'invalid-value');
      expect(mockHandleFieldSubmission).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('isInlineView', () => {
    it('should return true if sessionMode is embedded-view', () => {
      const result = isInlineView('single-line', 'desktop' as LayoutType, 'maximized', 'embedded-view' as SessionMode);
      expect(result).toBe(true);
    });

    it('should return true if renderingType is automatic, workspaceLayout is maximized, and layoutType ends with desktop', () => {
      const result = isInlineView('automatic', 'large-desktop' as LayoutType, 'maximized', 'edit' as SessionMode);
      expect(result).toBe(true);
    });

    it('should return false if renderingType is automatic, workspaceLayout is maximized, but layoutType does not end with desktop', () => {
      const result = isInlineView('automatic', 'tablet' as LayoutType, 'maximized', 'edit' as SessionMode);
      expect(result).toBe(false);
    });

    it('should return true if renderingType is single-line', () => {
      const result = isInlineView('single-line', 'desktop' as LayoutType, 'minimized', 'edit' as SessionMode);
      expect(result).toBe(true);
    });

    it('should return false if renderingType is multiline', () => {
      const result = isInlineView('multiline', 'desktop' as LayoutType, 'maximized', 'edit' as SessionMode);
      expect(result).toBe(false);
    });

    it('should return false if renderingType is automatic and workspaceLayout is minimized', () => {
      const result = isInlineView('automatic', 'large-desktop' as LayoutType, 'minimized', 'edit' as SessionMode);
      expect(result).toBe(false);
    });

    it('should return false if renderingType is automatic and layoutType does not end with desktop', () => {
      const result = isInlineView('automatic', 'mobile' as LayoutType, 'maximized', 'edit' as SessionMode);
      expect(result).toBe(false);
    });

    it('should return false if renderingType is multiline and sessionMode is not embedded-view', () => {
      const result = isInlineView('multiline', 'desktop' as LayoutType, 'maximized', 'edit' as SessionMode);
      expect(result).toBe(false);
    });
  });

  describe('evaluateConditionalAnswered', () => {
    it('should add field id to referencedField.fieldDependants when referenced field is found', () => {
      const field: FormField = {
        label: 'Field with Validator',
        type: 'obs',
        questionOptions: {
          rendering: 'number',
        },
        id: 'field-1',
        validators: [
          {
            type: 'conditionalAnswered',
            referenceQuestionId: 'field-2',
          },
        ],
      };

      const referencedField: FormField = {
        label: 'Referenced Field',
        type: 'obs',
        questionOptions: {
          rendering: 'number',
        },
        id: 'field-2',
      };

      const allFields: FormField[] = [field, referencedField];

      evaluateConditionalAnswered(field, allFields);

      expect(referencedField.fieldDependants).toEqual(new Set(['field-1']));
    });

    it('should not add field id to referencedField.fieldDependants when referenced field is not found', () => {
      const field: FormField = {
        label: 'Field with Validator',
        type: 'obs',
        questionOptions: {
          rendering: 'number',
        },
        id: 'field-1',
        validators: [
          {
            type: 'conditionalAnswered',
            referenceQuestionId: 'field-2',
          },
        ],
      };

      const allFields: FormField[] = [field];

      evaluateConditionalAnswered(field, allFields);

      // Since referenced field is not in allFields, nothing should be added
      allFields.forEach((field) => {
        expect(field.fieldDependants).toBeUndefined();
      });
    });

    it('should not overwrite existing fieldDependants', () => {
      const field: FormField = {
        label: 'Field with Validator',
        type: 'obs',
        questionOptions: {
          rendering: 'number',
        },
        id: 'field-1',
        validators: [
          {
            type: 'conditionalAnswered',
            referenceQuestionId: 'field-2',
          },
        ],
      };

      const referencedField: FormField = {
        label: 'Referenced Field',
        type: 'obs',
        questionOptions: {
          rendering: 'number',
        },
        id: 'field-2',
        fieldDependants: new Set(['field-3']),
      };

      const allFields: FormField[] = [field, referencedField];

      evaluateConditionalAnswered(field, allFields);

      expect(referencedField.fieldDependants).toEqual(new Set(['field-3', 'field-1']));
    });
  });

  describe('evaluateFieldReadonlyProp', () => {
    it('should not change field.readonly if it is not empty', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: {
          rendering: 'number',
        },
        id: 'field-1',
        readonly: true,
      };

      evaluateFieldReadonlyProp(field, false, false, false);

      expect(field.readonly).toBe(true);
    });

    it('should set field.readonly to true if sectionReadonly is not empty', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: {
          rendering: 'number',
        },
        id: 'field-1',
        readonly: '',
      };

      evaluateFieldReadonlyProp(field, 'some value', false, false);

      expect(field.readonly).toBe(true);
    });

    it('should set field.readonly to true if pageReadonly is not empty', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: {
          rendering: 'number',
        },
        id: 'field-1',
        readonly: '',
      };

      evaluateFieldReadonlyProp(field, false, 'some value', false);

      expect(field.readonly).toBe(true);
    });

    it('should set field.readonly to true if formReadonly is true', () => {
      const field: FormField = {
        label: 'Test Field',
        type: 'obs',
        questionOptions: {
          rendering: 'number',
        },
        id: 'field-1',
        readonly: '',
      };

      evaluateFieldReadonlyProp(field, false, false, true);

      expect(field.readonly).toBe(true);
    });
  });

  describe('parseToLocalDateTime', () => {
    it('should parse valid date string with time correctly', () => {
      const dateString = '2023-06-27T14:30:00';
      const expectedDate = new Date(2023, 5, 27, 14, 30, 0);
      const parsedDate = parseToLocalDateTime(dateString);

      expect(parsedDate).toEqual(expectedDate);
    });

    it('should parse valid date string without time correctly', () => {
      const dateString = '2023-06-27';
      const expectedDate = new Date(2023, 5, 27);
      const parsedDate = parseToLocalDateTime(dateString);

      // Set hours, minutes, and seconds to 0 since the input doesn't contain time
      expectedDate.setHours(0, 0, 0, 0);

      expect(parsedDate).toEqual(expectedDate);
    });

    it('should handle invalid date string format gracefully', () => {
      const dateString = 'invalid-date-string';
      const parsedDate = parseToLocalDateTime(dateString);

      // Check if the parsedDate is an Invalid Date
      expect(isNaN(parsedDate.getTime())).toBe(true);
    });
  });

  describe('evaluateDisabled', () => {
    let mockExpressionRunnerFn;
    let node;
    let allFields;
    let allValues;
    let sessionMode;
    let patient;

    beforeEach(() => {
      mockExpressionRunnerFn = jest.fn();
      node = { value: { disabled: { disableWhenExpression: '' } } };
      allFields = [{ id: 'field1', value: 'value1' }];
      allValues = { field1: 'value1' };
      sessionMode = 'edit';
      patient = { id: 'patient1', name: 'John Doe' };
    });

    test('returns true when disableWhenExpression evaluates to true', () => {
      mockExpressionRunnerFn.mockReturnValue(true);
      const result = evaluateDisabled(node, allFields, allValues, sessionMode, patient, mockExpressionRunnerFn);
      expect(result).toBe(true);
      expect(mockExpressionRunnerFn).toHaveBeenCalledWith(
        node.value.disabled.disableWhenExpression,
        node,
        allFields,
        allValues,
        { mode: sessionMode, patient },
      );
    });

    test('returns false when disableWhenExpression evaluates to false', () => {
      mockExpressionRunnerFn.mockReturnValue(false);
      const result = evaluateDisabled(node, allFields, allValues, sessionMode, patient, mockExpressionRunnerFn);
      expect(result).toBe(false);
      expect(mockExpressionRunnerFn).toHaveBeenCalledWith(
        node.value.disabled.disableWhenExpression,
        node,
        allFields,
        allValues,
        { mode: sessionMode, patient },
      );
    });

    test('works with different sessionMode values', () => {
      sessionMode = 'view';
      mockExpressionRunnerFn.mockReturnValue(true);
      const result = evaluateDisabled(node, allFields, allValues, sessionMode, patient, mockExpressionRunnerFn);
      expect(result).toBe(true);
      expect(mockExpressionRunnerFn).toHaveBeenCalledWith(
        node.value.disabled.disableWhenExpression,
        node,
        allFields,
        allValues,
        { mode: sessionMode, patient },
      );
    });

    test('throws if the expression causes an error', () => {
      mockExpressionRunnerFn.mockImplementation(() => {
        throw new Error('Invalid expression');
      });
      expect(() => evaluateDisabled(node, allFields, allValues, sessionMode, patient, mockExpressionRunnerFn)).toThrow(
        'Invalid expression',
      );
    });
  });
});
