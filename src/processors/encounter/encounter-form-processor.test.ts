import { EncounterFormProcessor, extractDependencies, buildDependencyGraph, topologicalSort } from './encounter-form-processor';
import { type FormField, type FormProcessorContextProps, type FormSchema } from '../../types';

describe('EncounterFormProcessor', () => {
  let processor: EncounterFormProcessor;
  let mockFormSchema: FormSchema;

  beforeEach(() => {
    mockFormSchema = {
      name: 'Test Form',
      pages: [],
      encounterType: 'test-encounter-type',
      processor: 'EncounterFormProcessor',
      uuid: 'test-uuid',
      referencedForms: []
    };
    processor = new EncounterFormProcessor(mockFormSchema);
  });

  describe('extractDependencies', () => {
    it('should extract field dependencies from simple expressions', () => {
      const expression = 'field1 + field2';
      const dependencies = extractDependencies(expression);
      expect(dependencies).toContain('field1');
      expect(dependencies).toContain('field2');
    });

    it('should extract dependencies from complex expressions', () => {
      const expression = 'field1 === "value" && field2 > 10 || field3.includes("test")';
      const dependencies = extractDependencies(expression);
      expect(dependencies).toContain('field1');
      expect(dependencies).toContain('field2');
      expect(dependencies).toContain('field3');
    });

    it('should handle complex expressions that cannot be parsed', () => {
      const expression = 'if (true) { return field1; } else { return false; }';
      const dependencies = extractDependencies(expression);
      // Complex JavaScript syntax may not be parseable by the expression evaluator
      // In such cases, we gracefully return an empty array
      expect(dependencies).toEqual([]);
    });

    it('should handle empty expressions', () => {
      const expression = '';
      const dependencies = extractDependencies(expression);
      expect(dependencies).toEqual([]);
    });

    it('should handle expressions with no dependencies', () => {
      const expression = 'Math.PI * 2';
      const dependencies = extractDependencies(expression);
      expect(dependencies).not.toContain('Math');
      expect(dependencies).not.toContain('PI');
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build dependency graph for fields with calculate expressions', () => {
      const fields: FormField[] = [
        {
          id: 'field1',
          type: 'obs',
          questionOptions: {
            rendering: 'text',
            calculate: {
              calculateExpression: 'true'
            }
          }
        },
        {
          id: 'field2',
          type: 'obs',
          questionOptions: {
            rendering: 'text',
            calculate: {
              calculateExpression: 'field1'
            }
          }
        },
        {
          id: 'field3',
          type: 'obs',
          questionOptions: {
            rendering: 'text',
            calculate: {
              calculateExpression: 'field1 + field2'
            }
          }
        }
      ];

      const graph = buildDependencyGraph(fields);

      expect(graph.get('field1')).toEqual([]);
      expect(graph.get('field2')).toEqual(['field1']);
      expect(graph.get('field3')).toEqual(['field1', 'field2']);
    });

    it('should handle fields without calculate expressions', () => {
      const fields: FormField[] = [
        {
          id: 'field1',
          type: 'obs',
          questionOptions: {
            rendering: 'text'
          }
        },
        {
          id: 'field2',
          type: 'obs',
          questionOptions: {
            rendering: 'text',
            calculate: {
              calculateExpression: 'field1'
            }
          }
        }
      ];

      const graph = buildDependencyGraph(fields);

      expect(graph.get('field1')).toEqual([]);
      expect(graph.get('field2')).toEqual(['field1']);
    });
  });

  describe('topologicalSort', () => {
    it('should sort fields in dependency order', () => {
      const graph = new Map<string, string[]>([
        ['field1', []],
        ['field2', ['field1']],
        ['field3', ['field1', 'field2']]
      ]);

      const sorted = topologicalSort(graph);

      // field1 should come before field2 and field3
      expect(sorted.indexOf('field1')).toBeLessThan(sorted.indexOf('field2'));
      expect(sorted.indexOf('field1')).toBeLessThan(sorted.indexOf('field3'));
      // field2 should come before field3
      expect(sorted.indexOf('field2')).toBeLessThan(sorted.indexOf('field3'));
    });

    it('should handle independent fields', () => {
      const graph = new Map<string, string[]>([
        ['field1', []],
        ['field2', []],
        ['field3', []]
      ]);

      const sorted = topologicalSort(graph);

      expect(sorted).toHaveLength(3);
      expect(sorted).toContain('field1');
      expect(sorted).toContain('field2');
      expect(sorted).toContain('field3');
    });

    it('should handle circular dependencies gracefully', () => {
      const graph = new Map<string, string[]>([
        ['field1', ['field2']],
        ['field2', ['field1']]
      ]);

      // Should not throw and should return some ordering
      const sorted = topologicalSort(graph);

      expect(sorted).toHaveLength(2);
      expect(sorted).toContain('field1');
      expect(sorted).toContain('field2');
    });
  });

  describe('getInitialValues with chained calculate expressions', () => {
    it('should evaluate chained calculate expressions in dependency order', async () => {
      const mockContext: Partial<FormProcessorContextProps> = {
        formFields: [
          {
            id: 'triage_RED_Vv_1',
            type: 'obs',
            questionOptions: {
              rendering: 'text',
              calculate: {
                calculateExpression: 'true'
              }
            }
          },
          {
            id: 'triage_RED_Vv_2',
            type: 'obs',
            questionOptions: {
              rendering: 'text',
              calculate: {
                calculateExpression: 'triage_RED_Vv_1'
              }
            }
          },
          {
            id: 'triage_RED_Vv_3',
            type: 'obs',
            questionOptions: {
              rendering: 'text',
              calculate: {
                calculateExpression: 'triage_RED_Vv_1 && triage_RED_Vv_2'
              }
            }
          }
        ],
        formFieldAdapters: {},
        sessionMode: 'enter',
        patient: {}
      };

      const initialValues = await processor.getInitialValues(mockContext as FormProcessorContextProps);

      expect(initialValues['triage_RED_Vv_1']).toBe(true);
      expect(initialValues['triage_RED_Vv_2']).toBe(true);
      expect(initialValues['triage_RED_Vv_3']).toBe(true);
    });

    it('should handle complex chained expressions', async () => {
      const mockContext: Partial<FormProcessorContextProps> = {
        formFields: [
          {
            id: 'baseValue',
            type: 'obs',
            questionOptions: {
              rendering: 'number',
              calculate: {
                calculateExpression: '10'
              }
            }
          },
          {
            id: 'doubled',
            type: 'obs',
            questionOptions: {
              rendering: 'number',
              calculate: {
                calculateExpression: 'baseValue * 2'
              }
            }
          },
          {
            id: 'final',
            type: 'obs',
            questionOptions: {
              rendering: 'number',
              calculate: {
                calculateExpression: 'doubled + baseValue'
              }
            }
          }
        ],
        formFieldAdapters: {},
        sessionMode: 'enter',
        patient: {}
      };

      const initialValues = await processor.getInitialValues(mockContext as FormProcessorContextProps);

      expect(initialValues['baseValue']).toBe(10);
      expect(initialValues['doubled']).toBe(20);
      expect(initialValues['final']).toBe(30);
    });

    it('should handle fields without calculate expressions', async () => {
      const mockContext: Partial<FormProcessorContextProps> = {
        formFields: [
          {
            id: 'regularField',
            type: 'obs',
            questionOptions: {
              rendering: 'text'
            }
          },
          {
            id: 'calculatedField',
            type: 'obs',
            questionOptions: {
              rendering: 'text',
              calculate: {
                calculateExpression: '"calculated"'
              }
            }
          }
        ],
        formFieldAdapters: {},
        sessionMode: 'enter',
        patient: {}
      };

      const initialValues = await processor.getInitialValues(mockContext as FormProcessorContextProps);

      expect(initialValues['regularField']).toBe('');
      expect(initialValues['calculatedField']).toBe('calculated');
    });
  });
});
