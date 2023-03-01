import { parseExpression } from './expression-parser';

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
