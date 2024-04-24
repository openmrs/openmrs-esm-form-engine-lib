import { OHRIFormField } from '../api/types';
import { ConceptFalse } from '../constants';
import {
  findAndRegisterReferencedFields,
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
  const field1: OHRIFormField = {
    label: 'Visit Count',
    type: 'obs',
    questionOptions: {
      rendering: 'number',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'htsVisitCount',
  };

  const field2: OHRIFormField = {
    label: 'Notes',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'notes',
  };

  const field3: OHRIFormField = {
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
  const field1: OHRIFormField = {
    label: 'Visit Count',
    type: 'obs',
    questionOptions: {
      rendering: 'number',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'htsVisitCount',
  };

  const field2: OHRIFormField = {
    label: 'Notes',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      answers: [],
    },
    id: 'notes',
  };

  const field3: OHRIFormField = {
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
