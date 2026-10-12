import { describe, expect, it } from 'vitest';
import { rewriteFieldIds, toFieldId, toVariableName } from './field-id-rewriter';

describe('rewriteFieldIds', () => {
  it('prefixes words that start with a digit but are not numbers', () => {
    expect(rewriteFieldIds("1stVisit === 'yes' && 2ndDose")).toBe("__field_1stVisit === 'yes' && __field_2ndDose");
  });

  it('leaves numeric literals unchanged', () => {
    const expression = 'a > 6e1 && a > 5e-1 && a > 1.5E+2 && a > 0x10 && a > 0b11 && a > 1_000 && a > 75.0 && a > .5';
    expect(rewriteFieldIds(expression)).toBe(expression);
  });

  it('leaves string literals unchanged', () => {
    const expression = `'1stVisit' + "2ndDose" + \`3rdVisit\` + 'it\\'s 4th'`;
    expect(rewriteFieldIds(expression)).toBe(expression);
  });

  it('leaves identifiers containing digits unchanged', () => {
    expect(rewriteFieldIds('visit1 && v2_3')).toBe('visit1 && v2_3');
  });
});

describe('toVariableName and toFieldId', () => {
  it('round-trip digit-leading and ordinary field ids', () => {
    expect(toVariableName('1stVisit')).toBe('__field_1stVisit');
    expect(toFieldId('__field_1stVisit')).toBe('1stVisit');
    expect(toVariableName('weight')).toBe('weight');
    expect(toFieldId('weight')).toBe('weight');
  });
});
