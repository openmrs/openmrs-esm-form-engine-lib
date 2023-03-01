import { OHRIFormField } from '../api/types';
import { checkReferenceToResolvedFragment, evaluateExpression, ExpressionContext } from './expression-runner';

export const testFields: Array<OHRIFormField> = [
  {
    label: 'Was the client linked to care and treatment in this facility?',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'e8e8fe71-adbb-48e7-b531-589985094d30',
      answers: [
        {
          concept: 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3',
          label: 'Yes',
        },
        {
          concept: '488b58ff-64f5-4f8a-8979-fa79940b1594',
          label: 'No',
        },
      ],
    },
    id: 'linkedToCare',
  },
  {
    label: 'What Identification Number was issued to the client?',
    type: 'obs',
    questionOptions: {
      rendering: 'text',
      concept: '162576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    id: 'patientIdentificationNumber',
  },
  {
    label: 'Which of the following prevention services was the client referred to?',
    type: 'obs',
    questionOptions: {
      rendering: 'checkbox',
      concept: '5f394708-ca7d-4558-8d23-a73de181b02d',
      answers: [
        {
          concept: '88cdde2b-753b-48ac-a51a-ae5e1ab24846',
          label: 'Pre Exposure Prophylaxis (PEP)',
        },
        {
          concept: '46da10c7-49e3-45e5-8e82-7c529d52a1a8',
          label: 'STI Testing and Treatment',
        },
        {
          concept: '1691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          label: 'Post-exposure prophylaxis',
        },
        {
          concept: '162223AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          label: 'Voluntary male circumcision clinic',
        },
      ],
    },
    id: 'referredToPreventionServices',
  },
  {
    label: 'What were the HTS provider’s remarks?',
    type: 'obs',
    questionOptions: {
      rendering: 'textarea',
      concept: '437d1e25-e7ab-481c-aabc-01f21c6cdef1',
    },
    id: 'htsProviderRemarks',
  },
  {
    label: 'Body Temperature',
    type: 'obs',
    questionOptions: {
      rendering: 'number',
      concept: '537d1e25-e7av-481c-aabc-01f21c6cdefo',
    },
    id: 'bodyTemperature',
  },
];

describe('Common expression runner - evaluateExpression', () => {
  const context: ExpressionContext = { mode: 'enter', patient: {} };
  const allFields = JSON.parse(JSON.stringify(testFields));
  let valuesMap = {
    linkedToCare: '',
    patientIdentificationNumber: '',
    htsProviderRemarks: '',
    referredToPreventionServices: [],
    bodyTemperature: 0,
  };

  afterEach(() => {
    // teardown
    valuesMap = {
      linkedToCare: '',
      patientIdentificationNumber: '',
      htsProviderRemarks: '',
      referredToPreventionServices: [],
      bodyTemperature: 0,
    };
    allFields.forEach(field => {
      field.fieldDependants = undefined;
    });
  });

  it('should evaluate basic boolean strings', () => {
    // replay and verify
    expect(
      evaluateExpression('true', { value: allFields[0], type: 'field' }, allFields, valuesMap, context),
    ).toBeTruthy();
    // replay and verify
    expect(
      evaluateExpression('false', { value: allFields[0], type: 'field' }, allFields, valuesMap, context),
    ).toBeFalsy();
  });

  it('should support two dimession expressions', () => {
    // replay and verify
    expect(
      evaluateExpression(
        "linkedToCare == '488b58ff-64f5-4f8a-8979-fa79940b1594'",
        { value: allFields[1], type: 'field' },
        allFields,
        valuesMap,
        context,
      ),
    ).toBeFalsy();
    // provide some values
    valuesMap['linkedToCare'] = '488b58ff-64f5-4f8a-8979-fa79940b1594';
    // replay and verify
    expect(
      evaluateExpression(
        "linkedToCare == '488b58ff-64f5-4f8a-8979-fa79940b1594'",
        { value: allFields[1], type: 'field' },
        allFields,
        valuesMap,
        context,
      ),
    ).toBeTruthy();
  });

  it('should support multiple dimession expressions', () => {
    // replay and verify
    expect(
      evaluateExpression(
        "linkedToCare == 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3' && htsProviderRemarks !== '' && bodyTemperature >= 39",
        { value: allFields[1], type: 'field' },
        allFields,
        valuesMap,
        context,
      ),
    ).toBeFalsy();
    // provide some values
    valuesMap['linkedToCare'] = 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3';
    valuesMap['htsProviderRemarks'] = 'Some test remarks...';
    valuesMap['bodyTemperature'] = 40;
    // replay and verify
    expect(
      evaluateExpression(
        "linkedToCare == 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3' && htsProviderRemarks !== '' && bodyTemperature >= 39",
        { value: allFields[1], type: 'field' },
        allFields,
        valuesMap,
        context,
      ),
    ).toBeTruthy();
  });

  it('should support isEmpty(value) runtime helper function', () => {
    // setup
    valuesMap['linkedToCare'] = 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3';
    // replay and verify
    expect(
      evaluateExpression(
        '!isEmpty(`linkedToCare`) && isEmpty(`htsProviderRemarks`)',
        { value: allFields[1], type: 'field' },
        allFields,
        valuesMap,
        context,
      ),
    ).toBeTruthy();
  });

  it('should support includes(question, value) runtime helper function', () => {
    // setup
    valuesMap['referredToPreventionServices'] = [
      '88cdde2b-753b-48ac-a51a-ae5e1ab24846',
      '162223AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    ];
    // replay and verify
    expect(
      evaluateExpression(
        'includes(`referredToPreventionServices`, `88cdde2b-753b-48ac-a51a-ae5e1ab24846`) && !includes(`referredToPreventionServices`, `1691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)',
        { value: allFields[1], type: 'field' },
        allFields,
        valuesMap,
        context,
      ),
    ).toBeTruthy();
  });

  it('should support session mode as a runtime', () => {
    expect(
      evaluateExpression(
        'mode == `enter` && isEmpty(`htsProviderRemarks`)',
        { value: allFields[2], type: 'field' },
        allFields,
        valuesMap,
        context,
      ),
    ).toBeTruthy();
  });

  it("should register dependency of the current node to it's determinant", () => {
    // setup
    const referredToPreventionServices = allFields[2];
    const htsProviderRemarks = allFields[3];
    // verify
    expect(referredToPreventionServices.fieldDependants).toBeFalsy();
    expect(htsProviderRemarks.fieldDependants).toBeFalsy();
    // replay
    expect(
      evaluateExpression(
        '!includes(`referredToPreventionServices`, `88cdde2b-753b-48ac-a51a-ae5e1ab24846`) && isEmpty(`htsProviderRemarks`)',
        { value: allFields[4], type: 'field' },
        allFields,
        valuesMap,
        context,
      ),
    ).toBeTruthy();
    expect(Array.from(referredToPreventionServices.fieldDependants)).toStrictEqual(['bodyTemperature']);
    expect(Array.from(htsProviderRemarks.fieldDependants)).toStrictEqual(['bodyTemperature']);
  });
});

describe('Common expression runner - checkReferenceToResolvedFragment', () => {
  it('should extract resolved fragment and chained reference when given a valid input', () => {
    const token = 'resolve(api.fetchSomeValue("arg1", "arg2")).someOtherRef';
    const expected = ['resolve(api.fetchSomeValue("arg1", "arg2"))', '.someOtherRef'];
    const result = checkReferenceToResolvedFragment(token);
    expect(result).toEqual(expected);
  });

  it('should extract only resolved fragment when there is no chained reference', () => {
    const token = 'resolve(AnotherFragment)';
    const expected = ['resolve(AnotherFragment)', ''];
    const result = checkReferenceToResolvedFragment(token);
    expect(result).toEqual(expected);
  });

  it('should return an empty string for the resolved fragment and chained reference when given an invalid input', () => {
    const token = 'invalidToken';
    const expected = ['', ''];
    const result = checkReferenceToResolvedFragment(token);
    expect(result).toEqual(expected);
  });
});
