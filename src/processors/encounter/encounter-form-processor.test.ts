import { EncounterFormProcessor } from './encounter-form-processor';
import { type FormSchema } from '../../types';

describe('EncounterFormProcessor', () => {
  describe('prepareFormSchema - validateCalculateExpressions', () => {
    let processor: EncounterFormProcessor;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      processor = new EncounterFormProcessor(null);
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should warn when a calculateExpression contains a quoted string that matches a field ID', () => {
      const schema: FormSchema = {
        name: 'Test Form',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                isExpanded: 'true',
                questions: [
                  {
                    label: 'Last Menstrual Period',
                    type: 'obs',
                    id: 'lmp',
                    questionOptions: {
                      rendering: 'date',
                      concept: 'test-concept',
                    },
                  },
                  {
                    label: 'Expected Date of Delivery',
                    type: 'obs',
                    id: 'edd',
                    questionOptions: {
                      rendering: 'date',
                      concept: 'test-concept',
                      calculate: {
                        calculateExpression: "calcEDD('lmp')",
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        processor: 'EncounterFormProcessor',
        encounterType: 'test-encounter-type',
        referencedForms: [],
        uuid: 'test-form-uuid',
      } as unknown as FormSchema;

      processor.prepareFormSchema(schema);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("contains 'lmp' as a string, but this is a field ID"),
      );
    });

    it('should not warn when a calculateExpression uses bare variable references', () => {
      const schema: FormSchema = {
        name: 'Test Form',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                isExpanded: 'true',
                questions: [
                  {
                    label: 'Last Menstrual Period',
                    type: 'obs',
                    id: 'lmp',
                    questionOptions: {
                      rendering: 'date',
                      concept: 'test-concept',
                    },
                  },
                  {
                    label: 'Expected Date of Delivery',
                    type: 'obs',
                    id: 'edd',
                    questionOptions: {
                      rendering: 'date',
                      concept: 'test-concept',
                      calculate: {
                        calculateExpression: 'calcEDD(lmp)',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        processor: 'EncounterFormProcessor',
        encounterType: 'test-encounter-type',
        referencedForms: [],
        uuid: 'test-form-uuid',
      } as unknown as FormSchema;

      processor.prepareFormSchema(schema);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should not warn when a quoted string does not match any field ID', () => {
      const schema: FormSchema = {
        name: 'Test Form',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                isExpanded: 'true',
                questions: [
                  {
                    label: 'Duration',
                    type: 'obs',
                    id: 'duration',
                    questionOptions: {
                      rendering: 'number',
                      concept: 'test-concept',
                      calculate: {
                        calculateExpression: "calcTimeDifference(onsetDate, 'd')",
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        processor: 'EncounterFormProcessor',
        encounterType: 'test-encounter-type',
        referencedForms: [],
        uuid: 'test-form-uuid',
      } as unknown as FormSchema;

      processor.prepareFormSchema(schema);

      // 'd' is not a field ID, so no warning should be issued
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should warn for nested questions in obsGroups', () => {
      const schema: FormSchema = {
        name: 'Test Form',
        pages: [
          {
            label: 'Page 1',
            sections: [
              {
                label: 'Section 1',
                isExpanded: 'true',
                questions: [
                  {
                    label: 'Height',
                    type: 'obs',
                    id: 'height',
                    questionOptions: {
                      rendering: 'number',
                      concept: 'test-concept',
                    },
                  },
                  {
                    label: 'Weight',
                    type: 'obs',
                    id: 'weight',
                    questionOptions: {
                      rendering: 'number',
                      concept: 'test-concept',
                    },
                  },
                  {
                    label: 'Vitals Group',
                    type: 'obsGroup',
                    id: 'vitalsGroup',
                    questionOptions: {
                      rendering: 'group',
                      concept: 'test-concept',
                    },
                    questions: [
                      {
                        label: 'BMI',
                        type: 'obs',
                        id: 'bmi',
                        questionOptions: {
                          rendering: 'number',
                          concept: 'test-concept',
                          calculate: {
                            calculateExpression: "calcBMI('height', 'weight')",
                          },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        processor: 'EncounterFormProcessor',
        encounterType: 'test-encounter-type',
        referencedForms: [],
        uuid: 'test-form-uuid',
      } as unknown as FormSchema;

      processor.prepareFormSchema(schema);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("'height' as a string, but this is a field ID"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("'weight' as a string, but this is a field ID"));
    });
  });
});
