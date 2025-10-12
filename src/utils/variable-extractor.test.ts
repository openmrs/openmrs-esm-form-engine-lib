import { extractVariableNamesFromExpression } from './variable-extractor';
import { trackFieldDependenciesFromString, type FormNode } from './expression-runner';
import { type FormField } from '../types';

// Mock the registerDependency function and simpleHash
jest.mock('./common-expression-helpers', () => ({
  registerDependency: jest.fn(),
  simpleHash: jest.fn((str) => str.length), // Simple mock for hashing
  CommonExpressionHelpers: jest.fn().mockImplementation(() => ({
    // Mock implementation of CommonExpressionHelpers
  })),
}));

// Mock the framework's compile and extractVariableNames functions
jest.mock('@openmrs/esm-framework', () => ({
  compile: jest.fn((expr) => {
    // Simulate compilation failure for invalid expressions
    if (expr.includes('field2 + (field3 * 2') && !expr.includes(')')) {
      throw new Error('Invalid expression');
    }
    return { compiled: expr };
  }),
  extractVariableNames: jest.fn((compiled) => {
    const expr = compiled.compiled;
    // Simulate different extraction results based on expression
    if (expr === 'field2 + nonexistentField') {
      return ['field2', 'nonexistentField'];
    }
    if (expr.includes('field2 + (field3 * 2') && !expr.includes(')')) {
      // Invalid expression - framework might still return something
      return ['field2', 'field3'];
    }
    return ['field2', 'field3']; // Default mock extraction
  }),
  evaluateAsType: jest.fn((compiled, context) => {
    // Mock evaluation based on expression content
    const expr = compiled.compiled;
    if (expr.includes('field2 > 10 && field3 === "yes"')) {
      return true;
    }
    if (expr.includes('patient.age > 18 && field2 === "adult" && _.isEmpty(field3)')) {
      return true;
    }
    return 42; // Default mock result
  }),
  getGlobalStore: jest.fn(() => ({
    getState: jest.fn(() => ({})),
    subscribe: jest.fn(),
  })),
}));

describe('extractVariableNamesFromExpression', () => {
  it('should extract simple variable names', () => {
    const expression = 'a + b * c';
    const result = extractVariableNamesFromExpression(expression);
    expect(result).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('should extract variables from member expressions', () => {
    const expression = 'obj.prop + arr[0]';
    const result = extractVariableNamesFromExpression(expression);
    expect(result).toEqual(expect.arrayContaining(['obj', 'arr']));
  });

  it('should handle function calls', () => {
    const expression = 'Math.max(a, b) + func(c)';
    const result = extractVariableNamesFromExpression(expression);
    expect(result).toEqual(expect.arrayContaining(['a', 'b', 'c', 'func']));
  });

  it('should exclude keywords and built-ins', () => {
    const expression = 'if (a > 0) { return b; } else { return null; }';
    const result = extractVariableNamesFromExpression(expression);
    expect(result).toEqual(['a', 'b']);
  });

  it('should handle empty expressions', () => {
    expect(extractVariableNamesFromExpression('')).toEqual([]);
    expect(extractVariableNamesFromExpression('   ')).toEqual([]);
    expect(extractVariableNamesFromExpression(null as any)).toEqual([]);
  });

  it('should handle complex expressions', () => {
    const expression = 'patient.age > 18 && visit.type === "OPD" && _.isEmpty(notes)';
    const result = extractVariableNamesFromExpression(expression);
    expect(result).toEqual(expect.arrayContaining(['patient', 'visit', 'notes', '_']));
  });

  it('should handle invalid expressions gracefully', () => {
    const expression = 'a + (b * c'; // Missing closing parenthesis
    const result = extractVariableNamesFromExpression(expression);
    // Should return empty array for invalid expressions
    expect(result).toEqual([]);
  });
});

describe('Dynamic Expression Changes', () => {
  const mockField1: FormField = {
    id: 'field1',
    type: 'obs',
    label: 'Field 1',
    questionOptions: { rendering: 'text' },
    meta: {},
  };

  const mockField2: FormField = {
    id: 'field2',
    type: 'obs',
    label: 'Field 2',
    questionOptions: { rendering: 'text' },
    meta: {},
  };

  const mockField3: FormField = {
    id: 'field3',
    type: 'obs',
    label: 'Field 3',
    questionOptions: { rendering: 'text' },
    meta: {},
  };

  const allFields = [mockField1, mockField2, mockField3];
  const fieldNode: FormNode = { value: mockField1, type: 'field' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track dependencies for dynamic expression changes', () => {
    const expression = 'field2 + field3 * 2';
    trackFieldDependenciesFromString(expression, fieldNode, allFields);

    // Verify that dependencies were registered
    const { registerDependency } = require('./common-expression-helpers');
    expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField2);
    expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField3);
  });

  it('should handle complex expressions with dynamic changes', () => {
    const expression = 'patient.age > 18 && field2 === "yes" && _.isEmpty(field3)';
    trackFieldDependenciesFromString(expression, fieldNode, allFields);

    const { registerDependency } = require('./common-expression-helpers');
    expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField2);
    expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField3);
    // Note: patient and _ are not form fields, so they shouldn't be registered as dependencies
  });

  it('should handle empty expressions gracefully', () => {
    trackFieldDependenciesFromString('', fieldNode, allFields);
    trackFieldDependenciesFromString('   ', fieldNode, allFields);

    const { registerDependency } = require('./common-expression-helpers');
    expect(registerDependency).not.toHaveBeenCalled();
  });

  it('should handle invalid expressions gracefully', () => {
    const invalidExpression = 'field2 + (field3 * 2'; // Missing closing parenthesis
    trackFieldDependenciesFromString(invalidExpression, fieldNode, allFields);

    const { registerDependency } = require('./common-expression-helpers');
    // Invalid expressions should not register any dependencies
    expect(registerDependency).not.toHaveBeenCalled();
  });

  it('should not register dependencies for non-existent fields', () => {
    const expression = 'field2 + nonexistentField';
    trackFieldDependenciesFromString(expression, fieldNode, allFields);

    const { registerDependency } = require('./common-expression-helpers');
    expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField2);
    expect(registerDependency).toHaveBeenCalledTimes(1); // Only field2, not nonexistentField
  });

  describe('Form Entry (Running Mode) Integration', () => {
    it('should work with evaluateExpression during form entry', () => {
      const { evaluateExpression } = require('./expression-runner');
      const expression = 'field2 + field3 * 2';
      const context = {
        patient: { age: 25, sex: 'M' },
        mode: 'enter' as const,
      };

      // Mock the evaluation context setup
      const result = evaluateExpression(expression, fieldNode, allFields, {}, context);

      // Should evaluate successfully (result is not null)
      expect(result).toBeDefined();

      // Dependencies should be tracked during evaluation
      const { registerDependency } = require('./common-expression-helpers');
      expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField2);
      expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField3);
    });

    it('should handle dynamic field value changes during form entry', () => {
      const { evaluateExpression } = require('./expression-runner');
      const expression = 'field2 > 10 && field3 === "yes"';
      const context = {
        patient: { age: 25, sex: 'M' },
        mode: 'enter' as const,
      };
      const fieldValues = { field2: 15, field3: 'yes' };

      const result = evaluateExpression(expression, fieldNode, allFields, fieldValues, context);

      // Should evaluate to true with the given values
      expect(result).toBe(true);

      // Dependencies should be tracked
      const { registerDependency } = require('./common-expression-helpers');
      expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField2);
      expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField3);
    });

    it('should handle complex expressions with patient data during form entry', () => {
      const { evaluateExpression } = require('./expression-runner');
      const expression = 'patient.age > 18 && field2 === "adult" && _.isEmpty(field3)';
      const context = {
        patient: { age: 25, sex: 'M' },
        mode: 'enter' as const,
      };
      const fieldValues = { field2: 'adult', field3: null };

      const result = evaluateExpression(expression, fieldNode, allFields, fieldValues, context);

      // Should evaluate to true
      expect(result).toBe(true);

      // Dependencies should be tracked (only form fields, not patient properties)
      const { registerDependency } = require('./common-expression-helpers');
      expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField2);
      expect(registerDependency).toHaveBeenCalledWith(fieldNode, mockField3);
      expect(registerDependency).toHaveBeenCalledTimes(2); // Only field2 and field3
    });
  });
});
