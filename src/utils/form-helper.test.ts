import {
  findConceptByReference,
  evaluateFieldReadonlyProp,
  evaluateDisabled,
  isPageContentVisible,
  extractObsValueAndDisplay,
} from './form-helper';
import { ConceptTrue } from '../constants';
import type { FormPage, FormField } from '../types';

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

  // describe('inferInitialValueFromDefaultFieldValue', () => {
  //   const mockHandleFieldSubmission = jest.fn();
  //   const mockHandler = {
  //     handleFieldSubmission: mockHandleFieldSubmission,
  //     getInitialValue: function (
  //       encounter: OpenmrsEncounter,
  //       field: FormField,
  //       allFormFields?: FormField[],
  //       context?: EncounterContext,
  //     ): {} {
  //       throw new Error('Function not implemented.');
  //     },
  //     getDisplayValue: function (field: FormField, value: any) {
  //       throw new Error('Function not implemented.');
  //     },
  //   };

  //   const sampleContext: EncounterContext = {
  //     patient: {
  //       id: '833db896-c1f0-11eb-8529-0242ac130003',
  //     },
  //     encounter: {
  //       uuid: '773455da-3ec4-453c-b565-7c1fe35426be',
  //       encounterProviders: [],
  //       obs: [],
  //     },
  //     location: {},
  //     sessionMode: 'edit',
  //     encounterDate: new Date(),
  //     setEncounterDate: jest.fn(),
  //     encounterProvider: '',
  //     setEncounterProvider: jest.fn(),
  //     setEncounterLocation: jest.fn(),
  //     encounterRole: '',
  //     setEncounterRole: jest.fn(),
  //   };

  //   it('should return true if rendering is toggle and default value is ConceptTrue', () => {
  //     const sampleField: FormField = {
  //       label: 'Sample Toggle Field',
  //       type: 'obs',
  //       questionOptions: { rendering: 'toggle', defaultValue: ConceptTrue },
  //       id: 'toggle-field',
  //     };

  //     const result = inferInitialValueFromDefaultFieldValue(sampleField, sampleContext, mockHandler);

  //     expect(result).toBe(true);
  //   });

  //   it('should validate default value and handle field submission if valid', () => {
  //     const sampleField: FormField = {
  //       label: 'Sample Field',
  //       type: 'obs',
  //       questionOptions: { rendering: 'text', defaultValue: 'valid-value' },
  //       id: 'text-field',
  //     };

  //     (DefaultValueValidator.validate as jest.Mock).mockReturnValue([]);

  //     const result = inferInitialValueFromDefaultFieldValue(sampleField, sampleContext, mockHandler);

  //     expect(DefaultValueValidator.validate).toHaveBeenCalledWith(sampleField, 'valid-value');
  //     expect(mockHandleFieldSubmission).toHaveBeenCalledWith(sampleField, 'valid-value', sampleContext);
  //     expect(result).toBe('valid-value');
  //   });

  //   it('should not handle field submission if default value is invalid', () => {
  //     const sampleField: FormField = {
  //       label: 'Sample Field',
  //       type: 'obs',
  //       questionOptions: { rendering: 'text', defaultValue: 'invalid-value' },
  //       id: 'text-field',
  //     };

  //     (DefaultValueValidator.validate as jest.Mock).mockReturnValue(['Error: Invalid value']);

  //     const result = inferInitialValueFromDefaultFieldValue(sampleField, sampleContext, mockHandler);

  //     expect(DefaultValueValidator.validate).toHaveBeenCalledWith(sampleField, 'invalid-value');
  //     expect(mockHandleFieldSubmission).not.toHaveBeenCalled();
  //     expect(result).toBeUndefined();
  //   });
  // });

  // describe('isInlineView', () => {
  //   it('should return true if sessionMode is embedded-view', () => {
  //     const result = isInlineView('single-line', 'desktop' as LayoutType, 'maximized', 'embedded-view' as SessionMode);
  //     expect(result).toBe(true);
  //   });

  //   it('should return true if renderingType is automatic, workspaceLayout is maximized, and layoutType ends with desktop', () => {
  //     const result = isInlineView('automatic', 'large-desktop' as LayoutType, 'maximized', 'edit' as SessionMode);
  //     expect(result).toBe(true);
  //   });

  //   it('should return false if renderingType is automatic, workspaceLayout is maximized, but layoutType does not end with desktop', () => {
  //     const result = isInlineView('automatic', 'tablet' as LayoutType, 'maximized', 'edit' as SessionMode);
  //     expect(result).toBe(false);
  //   });

  //   it('should return true if renderingType is single-line', () => {
  //     const result = isInlineView('single-line', 'desktop' as LayoutType, 'minimized', 'edit' as SessionMode);
  //     expect(result).toBe(true);
  //   });

  //   it('should return false if renderingType is multiline', () => {
  //     const result = isInlineView('multiline', 'desktop' as LayoutType, 'maximized', 'edit' as SessionMode);
  //     expect(result).toBe(false);
  //   });

  //   it('should return false if renderingType is automatic and workspaceLayout is minimized', () => {
  //     const result = isInlineView('automatic', 'large-desktop' as LayoutType, 'minimized', 'edit' as SessionMode);
  //     expect(result).toBe(false);
  //   });

  //   it('should return false if renderingType is automatic and layoutType does not end with desktop', () => {
  //     const result = isInlineView('automatic', 'mobile' as LayoutType, 'maximized', 'edit' as SessionMode);
  //     expect(result).toBe(false);
  //   });

  //   it('should return false if renderingType is multiline and sessionMode is not embedded-view', () => {
  //     const result = isInlineView('multiline', 'desktop' as LayoutType, 'maximized', 'edit' as SessionMode);
  //     expect(result).toBe(false);
  //   });
  // });

  // describe('evaluateConditionalAnswered', () => {
  //   it('should add field id to referencedField.fieldDependants when referenced field is found', () => {
  //     const field: FormField = {
  //       label: 'Field with Validator',
  //       type: 'obs',
  //       questionOptions: {
  //         rendering: 'number',
  //       },
  //       id: 'field-1',
  //       validators: [
  //         {
  //           type: 'conditionalAnswered',
  //           referenceQuestionId: 'field-2',
  //         },
  //       ],
  //     };

  //     const referencedField: FormField = {
  //       label: 'Referenced Field',
  //       type: 'obs',
  //       questionOptions: {
  //         rendering: 'number',
  //       },
  //       id: 'field-2',
  //     };

  //     const allFields: FormField[] = [field, referencedField];

  //     evaluateConditionalAnswered(field, allFields);

  //     expect(referencedField.fieldDependants).toEqual(new Set(['field-1']));
  //   });

  //   it('should not add field id to referencedField.fieldDependants when referenced field is not found', () => {
  //     const field: FormField = {
  //       label: 'Field with Validator',
  //       type: 'obs',
  //       questionOptions: {
  //         rendering: 'number',
  //       },
  //       id: 'field-1',
  //       validators: [
  //         {
  //           type: 'conditionalAnswered',
  //           referenceQuestionId: 'field-2',
  //         },
  //       ],
  //     };

  //     const allFields: FormField[] = [field];

  //     evaluateConditionalAnswered(field, allFields);

  //     // Since referenced field is not in allFields, nothing should be added
  //     allFields.forEach((field) => {
  //       expect(field.fieldDependants).toBeUndefined();
  //     });
  //   });

  //   it('should not overwrite existing fieldDependants', () => {
  //     const field: FormField = {
  //       label: 'Field with Validator',
  //       type: 'obs',
  //       questionOptions: {
  //         rendering: 'number',
  //       },
  //       id: 'field-1',
  //       validators: [
  //         {
  //           type: 'conditionalAnswered',
  //           referenceQuestionId: 'field-2',
  //         },
  //       ],
  //     };

  //     const referencedField: FormField = {
  //       label: 'Referenced Field',
  //       type: 'obs',
  //       questionOptions: {
  //         rendering: 'number',
  //       },
  //       id: 'field-2',
  //       fieldDependants: new Set(['field-3']),
  //     };

  //     const allFields: FormField[] = [field, referencedField];

  //     evaluateConditionalAnswered(field, allFields);

  //     expect(referencedField.fieldDependants).toEqual(new Set(['field-3', 'field-1']));
  //   });
  // });

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

  describe('isPageContentVisible', () => {
    it('should return false if the page is hidden', () => {
      const page = { isHidden: true, sections: [] } as FormPage;
      expect(isPageContentVisible(page)).toBe(false);
    });

    it('should return false if all sections are hidden', () => {
      const page = {
        isHidden: false,
        sections: [
          { isHidden: true, questions: [] },
          { isHidden: true, questions: [] },
        ],
      } as FormPage;
      expect(isPageContentVisible(page)).toBe(false);
    });

    it('should return false if all questions in all sections are hidden', () => {
      const page = {
        isHidden: false,
        sections: [
          { isHidden: false, questions: [{ isHidden: true }, { isHidden: true }] },
          { isHidden: false, questions: [{ isHidden: true }] },
        ],
      } as FormPage;
      expect(isPageContentVisible(page)).toBe(false);
    });

    it('should return false when there are no form fields', () => {
      const page = {
        isHidden: false,
        sections: [
          { isHidden: true, questions: [] },
          { isHidden: false, questions: [] },
        ],
      } as FormPage;
      expect(isPageContentVisible(page)).toBe(false);
    });

    it('should return true if at least one question in a section is visible', () => {
      const page = {
        isHidden: false,
        sections: [
          {
            isHidden: false,
            questions: [{ isHidden: true }, { isHidden: false }],
          },
          {
            isHidden: true,
            questions: [{ isHidden: true }],
          },
        ],
      } as FormPage;
      expect(isPageContentVisible(page)).toBe(true);
    });

    it('should return false for an empty page with no sections', () => {
      const page = { isHidden: false, sections: [] } as FormPage;
      expect(isPageContentVisible(page)).toBe(false);
    });
  });

  describe('extractObsValueAndDisplay', () => {
    // Mock form field types
    const mockFormFields = {
      codedField: {
        questionOptions: {
          rendering: 'select',
          answers: [{ concept: '2395de62-f5a6-49b6-ab0f-57a21a9029c1', label: 'Sneezing Symptom' }],
        },
      },
      toggleField: {
        questionOptions: {
          rendering: 'toggle',
          answers: [],
        },
      },
      dateField: {
        questionOptions: {
          rendering: 'date',
        },
      },
      stringField: {
        questionOptions: {
          rendering: 'text',
        },
      },
    } as any;

    // Primitive value tests
    describe('Primitive Value Handling', () => {
      it('should handle string primitive value', () => {
        const result = extractObsValueAndDisplay(mockFormFields.stringField, 'Hello World');
        expect(result).toEqual({
          value: 'Hello World',
          display: 'Hello World',
        });
      });

      it('should handle number primitive value', () => {
        const result = extractObsValueAndDisplay(mockFormFields.stringField, 42);
        expect(result).toEqual({
          value: 42,
          display: 42,
        });
      });
    });

    // FHIR Observation tests
    describe('FHIR Observation Handling', () => {
      const codedFHIRObs = {
        resourceType: 'Observation',
        code: {
          coding: {
            code: '1095de62-b5a6-49v6-ab0f-57a21a9029cb',
          },
        },
        valueCodeableConcept: {
          coding: [
            {
              code: '2395de62-f5a6-49b6-ab0f-57a21a9029c1',
              display: 'Sneezing',
            },
          ],
        },
      };

      const booleanFHIRObs = {
        resourceType: 'Observation',
        code: {
          coding: {
            code: 'b095deb2-b5a6-49v6-ab0f-57a21a9029cx',
          },
        },
        valueBoolean: true,
      };

      const dateFHIRObs = {
        resourceType: 'Observation',
        code: {
          coding: {
            code: 'e095de62-b5a6-49v6-ab0f-57a21a9029cy',
          },
        },
        valueDateTime: '2024-07-31T01:33:19+00:00',
      };

      it('should handle coded FHIR observation', () => {
        const result = extractObsValueAndDisplay(mockFormFields.codedField, codedFHIRObs);
        expect(result).toEqual({
          value: '2395de62-f5a6-49b6-ab0f-57a21a9029c1',
          display: 'Sneezing Symptom',
        });
      });

      it('should handle boolean FHIR observation', () => {
        const result = extractObsValueAndDisplay(mockFormFields.toggleField, booleanFHIRObs);
        expect(result).toEqual({
          value: ConceptTrue,
          display: undefined,
        });
      });

      it('should handle date FHIR observation', () => {
        const result = extractObsValueAndDisplay(mockFormFields.dateField, dateFHIRObs);
        expect(result).toEqual({
          value: expect.any(Date),
          display: expect.stringContaining('2024-07-31'),
        });
      });
    });

    // OpenMRS Observation tests
    describe('OpenMRS Observation Handling', () => {
      const codedOpenMRSObs = {
        value: {
          uuid: '2395de62-f5a6-49b6-ab0f-57a21a9029c1',
          name: { name: 'Sneezing' },
        },
      };

      const booleanOpenMRSObs = {
        value: {
          uuid: 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3',
          name: { name: 'True' },
        },
      };

      const dateOpenMRSObs = {
        value: '2024-07-31T01:33:19+00:00',
      };

      it('should handle coded OpenMRS observation', () => {
        const result = extractObsValueAndDisplay(mockFormFields.codedField, codedOpenMRSObs);
        expect(result).toEqual({
          value: '2395de62-f5a6-49b6-ab0f-57a21a9029c1',
          display: 'Sneezing Symptom',
        });
      });

      it('should handle boolean OpenMRS observation', () => {
        const result = extractObsValueAndDisplay(mockFormFields.toggleField, booleanOpenMRSObs);
        expect(result).toEqual({
          value: 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3',
          display: 'True',
        });
      });

      it('should handle date OpenMRS observation', () => {
        const result = extractObsValueAndDisplay(mockFormFields.dateField, dateOpenMRSObs);
        expect(result).toEqual({
          value: expect.any(Date),
          display: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
        });
      });
    });
  });
});
