import { type FormField } from '../types';
import { ConceptFalse } from '../constants';
import {
  extractArgs,
  findAndRegisterReferencedFields,
  hasParentheses,
  linkReferencedFieldValues,
  parseExpression,
  replaceFieldRefWithValuePath,
} from './expression-parser';
import { testFields } from './expression-runner.test';

describe('Expression parsing', () => {
  it('should split expression 1 into parts correctly', () => {
    const input =
      "isDateBefore(myValue, '1980-01-01') || myValue < useFieldValue('initiationDate', null) && getOtherValue('arg1', 'arg2')";
    const expectedOutput = [
      "isDateBefore(myValue, '1980-01-01')",
      '||',
      'myValue',
      '<',
      "useFieldValue('initiationDate', null)",
      '&&',
      "getOtherValue('arg1', 'arg2')",
    ];

    expect(parseExpression(input)).toEqual(expectedOutput);
  });

  it('should split expression 2 into parts correctly', () => {
    const input = "isDateBefore(myValue, '1980-01-01') || myValue < useFieldValue('initiationDate', null)";
    const expectedOutput = [
      "isDateBefore(myValue, '1980-01-01')",
      '||',
      'myValue',
      '<',
      "useFieldValue('initiationDate', null)",
    ];

    expect(parseExpression(input)).toEqual(expectedOutput);
  });

  it('should split expression 3 into parts correctly', () => {
    const input =
      "isDateBefore(myValue, '1980-01-01') != myValue && useFieldValue('initiationDate', null) && getOtherValue('Some string', 'Some other string')";
    const expectedOutput = [
      "isDateBefore(myValue, '1980-01-01')",
      '!=',
      'myValue',
      '&&',
      "useFieldValue('initiationDate', null)",
      '&&',
      "getOtherValue('Some string', 'Some other string')",
    ];

    expect(parseExpression(input)).toEqual(expectedOutput);
  });

  it('should split expression 4 into parts correctly', () => {
    const input = "getValue('some id') ? 'was truthy' : 'was false'";
    const expectedOutput = ["getValue('some id')", '?', "'was truthy'", ':', "'was false'"];

    expect(parseExpression(input)).toEqual(expectedOutput);
  });
});

describe('replaceFieldRefWithValuePath', () => {
  const field1: FormField = {
    label: 'Visit Count',
    type: 'obs',
    questionOptions: {
      rendering: 'number',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'htsVisitCount',
  };

  const field2: FormField = {
    label: 'Notes',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'notes',
  };

  const field3: FormField = {
    label: 'Was HIV tested?',
    type: 'obs',
    questionOptions: {
      rendering: 'toggle',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'wasHivTested',
  };

  it("should replace 'htsVisitCount' with value path", () => {
    // setup
    const token = "isEmpty('htsVisitCount')";
    // replay
    const result = replaceFieldRefWithValuePath(field1, 10, token);
    // verify
    expect(result).toEqual('isEmpty(fieldValues.htsVisitCount)');
  });

  it('should replace "notes" with value path', () => {
    // setup
    const token = 'api.getValue(notes)';
    // replay
    const result = replaceFieldRefWithValuePath(field2, 'Some notes', token);
    // verify
    expect(result).toEqual('api.getValue(fieldValues.notes)');
  });

  it('should replace "wasHivTested" with the system encoded boolean value for toggle rendering types', () => {
    const token = "isEmpty('wasHivTested')";
    const result = replaceFieldRefWithValuePath(field3, false, token);
    expect(result).toEqual(`isEmpty('${ConceptFalse}')`);
  });
});

describe('linkReferencedFieldValues', () => {
  const field1: FormField = {
    label: 'Visit Count',
    type: 'obs',
    questionOptions: {
      rendering: 'number',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'htsVisitCount',
  };

  const field2: FormField = {
    label: 'Notes',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'notes',
  };

  const field3: FormField = {
    label: 'Was HIV tested?',
    type: 'obs',
    questionOptions: {
      rendering: 'toggle',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'wasHivTested',
  };

  const valuesMap = {
    htsVisitCount: 10,
    notes: 'Some notes',
    wasHivTested: false,
  };

  it("should replace 'htsVisitCount' with value path", () => {
    // setup
    const expression = "htsVisitCount && helpFn1(htsVisitCount) && helpFn2('htsVisitCount')";
    // replay
    const result = linkReferencedFieldValues([field1], valuesMap, parseExpression(expression));
    // verify
    expect(result).toEqual(
      'fieldValues.htsVisitCount && helpFn1(fieldValues.htsVisitCount) && helpFn2(fieldValues.htsVisitCount)',
    );
  });

  it('should support complex expressions', () => {
    // setup
    const expression =
      'htsVisitCount > 2 ? resolve(api.getByConcept(wasHivTested)) : resolve(api.call2ndApi(wasHivTested, htsVisitCount))';
    // replay
    const result = linkReferencedFieldValues([field1, field2, field3], valuesMap, parseExpression(expression));
    // verify
    expect(result).toEqual(
      `fieldValues.htsVisitCount > 2 ? resolve(api.getByConcept('${ConceptFalse}')) : resolve(api.call2ndApi('${ConceptFalse}', fieldValues.htsVisitCount))`,
    );
  });

  it('should ignore ref to useFieldValue', () => {
    // setup
    const expression =
      "htsVisitCount > 2 ? resolve(api.getByConcept(useFieldValue('wasHivTested'))) : resolve(api.call2ndApi(wasHivTested, useFieldValue('htsVisitCount')))";
    // replay
    const result = linkReferencedFieldValues([field1, field2, field3], valuesMap, parseExpression(expression));
    // verify
    expect(result).toEqual(
      `fieldValues.htsVisitCount > 2 ? resolve(api.getByConcept(useFieldValue('wasHivTested'))) : resolve(api.call2ndApi('${ConceptFalse}', useFieldValue('htsVisitCount')))`,
    );
  });
});

describe('findAndRegisterReferencedFields', () => {
  it('should register field dependants', () => {
    // setup
    const expression = "linkedToCare == 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3' && !isEmpty(htsProviderRemarks)";
    const patientIdentificationNumberField = testFields.find((f) => f.id === 'patientIdentificationNumber');

    // replay
    findAndRegisterReferencedFields(
      { value: patientIdentificationNumberField, type: 'field' },
      parseExpression(expression),
      testFields,
    );

    // verify
    const linkedToCare = testFields.find((f) => f.id === 'linkedToCare');
    const htsProviderRemarks = testFields.find((f) => f.id === 'htsProviderRemarks');
    expect(linkedToCare.fieldDependants).toStrictEqual(new Set(['patientIdentificationNumber']));
    expect(htsProviderRemarks.fieldDependants).toStrictEqual(new Set(['patientIdentificationNumber']));
  });
});

describe('extractArgs', () => {
  it('should extract single argument correctly', () => {
    const expression = "('arg1')";
    const expectedOutput = ['arg1'];
    expect(extractArgs(expression)).toEqual(expectedOutput);
  });

  it('should extract multiple arguments correctly', () => {
    const expression = "('arg1', 'arg2', 'arg3')";
    const expectedOutput = ['arg1', 'arg2', 'arg3'];
    expect(extractArgs(expression)).toEqual(expectedOutput);
  });

  it('should handle arguments with spaces correctly', () => {
    const expression = "('arg with spaces', 'another arg')";
    const expectedOutput = ['arg with spaces', 'another arg'];
    expect(extractArgs(expression)).toEqual(expectedOutput);
  });

  it('should handle arguments with special characters correctly', () => {
    const expression = "('arg!@#$', 'another$%^&arg')";
    const expectedOutput = ['arg!@#$', 'another$%^&arg'];
    expect(extractArgs(expression)).toEqual(expectedOutput);
  });

  it('should handle no arguments correctly', () => {
    const expression = '()';
    const expectedOutput = [];
    expect(extractArgs(expression)).toEqual(expectedOutput);
  });

  it('should handle arguments with escaped quotes correctly', () => {
    const expression = "('arg\\'with\\'escaped\\'quotes', 'another\\'arg')";
    const expectedOutput = ["arg'with'escaped'quotes", "another'arg"];
    expect(extractArgs(expression)).toEqual(expectedOutput);
  });

  it('should handle complex expressions with various argument types', () => {
    const expression = "('string', 123, true, 'another string')";
    const expectedOutput = ['string', '123', 'true', 'another string'];
    expect(extractArgs(expression)).toEqual(expectedOutput);
  });

  it('should handle arguments with no quotes correctly', () => {
    const expression = '(arg1, arg2)';
    const expectedOutput = ['arg1', 'arg2'];
    expect(extractArgs(expression)).toEqual(expectedOutput);
  });
});

describe('hasParentheses', () => {
  it('should return true for expression with single set of parentheses', () => {
    const expression = 'myFunction(arg1, arg2)';
    expect(hasParentheses(expression)).toBe(true);
  });

  it('should return true for expression with multiple sets of parentheses', () => {
    const expression = '(arg1 && (arg2 || arg3))';
    expect(hasParentheses(expression)).toBe(true);
  });

  it('should return true for expression with nested parentheses', () => {
    const expression = 'outerFunction(innerFunction(arg1, arg2))';
    expect(hasParentheses(expression)).toBe(true);
  });

  it('should return false for expression without parentheses', () => {
    const expression = 'arg1 && arg2 || arg3';
    expect(hasParentheses(expression)).toBe(false);
  });

  it('should return true for expression with parentheses inside quotes', () => {
    const expression = "myFunction('arg(with)parentheses')";
    expect(hasParentheses(expression)).toBe(true);
  });

  it('should return true for expression with mixed characters and parentheses', () => {
    const expression = 'a + b * (c - d)';
    expect(hasParentheses(expression)).toBe(true);
  });

  it('should return true for complex expression with multiple types of parentheses', () => {
    const expression = 'func1(arg1, (func2(arg2) && func3(arg3)))';
    expect(hasParentheses(expression)).toBe(true);
  });
});
