import { registerExpressionHelper } from '..';
import { type FormField } from '../types';
import { evaluateAsyncExpression, evaluateExpression, type ExpressionContext } from './expression-runner';

export const testFields: Array<FormField> = [
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

export const fields: Array<FormField> = [
  {
    label: 'No Interest',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'no_interest_concept',
      answers: [],
    },
    id: 'no_interest',
  },
  {
    label: 'Depressed',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'depressed_concept',
      answers: [],
    },
    id: 'depressed',
  },
  {
    label: 'Bad Sleep',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'bad_sleep_concept',
      answers: [],
    },
    id: 'bad_sleep',
  },
  {
    label: 'Feeling Tired',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'feeling_tired_concept',
      answers: [],
    },
    id: 'feeling_tired',
  },
  {
    label: 'Poor Appetite',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'poor_appetite_concept',
      answers: [],
    },
    id: 'poor_appetite',
  },
  {
    label: 'Troubled',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'troubled_concept',
      answers: [],
    },
    id: 'troubled',
  },
  {
    label: 'Feeling Bad',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'feeling_bad_concept',
      answers: [],
    },
    id: 'feeling_bad',
  },
  {
    label: 'Speaking Slowly',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'speaking_slowly_concept',
      answers: [],
    },
    id: 'speaking_slowly',
  },
  {
    label: 'Better Off Dead',
    type: 'obs',
    questionOptions: {
      rendering: 'radio',
      concept: 'better_dead_concept',
      answers: [],
    },
    id: 'better_dead',
  },
];

describe('Expression runner', () => {
  const context: ExpressionContext = { mode: 'enter', patient: {} };
  const allFields = JSON.parse(JSON.stringify(testFields));
  let valuesMap = {
    linkedToCare: '',
    patientIdentificationNumber: '',
    htsProviderRemarks: '',
    referredToPreventionServices: [],
    bodyTemperature: 0,
    no_interest: '',
    depressed: '',
    bad_sleep: '',
    feeling_tired: '',
    poor_appetite: '',
    troubled: '',
    feeling_bad: '',
    speaking_slowly: '',
    better_dead: '',
  };

  afterEach(() => {
    // teardown
    valuesMap = {
      linkedToCare: '',
      patientIdentificationNumber: '',
      htsProviderRemarks: '',
      referredToPreventionServices: [],
      bodyTemperature: 0,
      no_interest: '',
      depressed: '',
      bad_sleep: '',
      feeling_tired: '',
      poor_appetite: '',
      troubled: '',
      feeling_bad: '',
      speaking_slowly: '',
      better_dead: '',
    };
    allFields.forEach((field) => {
      field.fieldDependents = undefined;
    });
  });

  it('should support unary expressions', () => {
    // replay and verify
    expect(
      evaluateExpression('true', { value: allFields[0], type: 'field' }, allFields, valuesMap, context),
    ).toBeTruthy();
    // replay and verify
    expect(
      evaluateExpression('!true', { value: allFields[0], type: 'field' }, allFields, valuesMap, context),
    ).toBeFalsy();
    // replay and verify
    expect(
      evaluateExpression('!false', { value: allFields[0], type: 'field' }, allFields, valuesMap, context),
    ).toBeTruthy();
  });

  it('should support binary expressions', () => {
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

  it('should support complex expressions', () => {
    // setup
    valuesMap.bad_sleep = 'a53f32bc-6904-4692-8a4c-fb7403cf0306';
    valuesMap.better_dead = '296b39ec-06c5-4310-8f30-d2c9f083fb71';
    valuesMap.depressed = '5eb5852d-3d29-41f9-b2ff-d194e062003d';
    valuesMap.feeling_bad = '349260db-8e0f-4c06-be92-5120b3708d1e';
    valuesMap.feeling_tired = '0ea1378d-04eb-4e7e-908b-26d8c27d37e1';
    valuesMap.troubled = '57766c65-6548-486b-9dad-0fedf531ed7d';

    const expression =
      "(no_interest === 'b631d160-8d40-4cf7-92cd-67f628c889e8' ? 1 : isEmpty(no_interest) ? 2 : no_interest === '8ff1f85c-4f04-4f5b-936a-5aa9320cb66e' ? 3 : 0) + (depressed === 'b631d160-8d40-4cf7-92cd-67f628c889e8' ? 1 : depressed === '5eb5852d-3d29-41f9-b2ff-d194e062003d' ? 2 :  depressed==='8ff1f85c-4f04-4f5b-936a-5aa9320cb66e' ? 3 : 0) + (bad_sleep === 'a53f32bc-6904-4692-8a4c-fb7403cf0306' ? 1 : bad_sleep === '234259ec-5368-4488-8482-4f261cc76714' ? 2 : bad_sleep === '8ff1f85c-4f04-4f5b-936a-5aa9320cb66e' ? 3 : 0) + (feeling_tired === 'b631d160-8d40-4cf7-92cd-67f628c889e8' ? 1 : feeling_tired === '234259ec-5368-4488-8482-4f261cc76714' ? 2 : feeling_tired === '0ea1378d-04eb-4e7e-908b-26d8c27d37e1' ? 3 : 0) +(poor_appetite === 'b631d160-8d40-4cf7-92cd-67f628c889e8' ? 1 : poor_appetite === '234259ec-5368-4488-8482-4f261cc76714' ? 2 : poor_appetite === '8ff1f85c-4f04-4f5b-936a-5aa9320cb66e' ? 3 : 0) + (troubled === '57766c65-6548-486b-9dad-0fedf531ed7d' ? 1 : troubled === '234259ec-5368-4488-8482-4f261cc76714' ? 2 : troubled === '8ff1f85c-4f04-4f5b-936a-5aa9320cb66e' ? 3 : 0) + (feeling_bad === 'b631d160-8d40-4cf7-92cd-67f628c889e8' ? 1 : feeling_bad === '234259ec-5368-4488-8482-4f261cc76714' ? 2 : feeling_bad === '349260db-8e0f-4c06-be92-5120b3708d1e' ? 3 : 0) + (speaking_slowly === 'b631d160-8d40-4cf7-92cd-67f628c889e8' ? 1 : speaking_slowly === '234259ec-5368-4488-8482-4f261cc76714' ? 2 : speaking_slowly === '8ff1f85c-4f04-4f5b-936a-5aa9320cb66e' ? 3 : 0) + (better_dead === 'b631d160-8d40-4cf7-92cd-67f628c889e8' ? 1 : better_dead === '296b39ec-06c5-4310-8f30-d2c9f083fb71' ? 2 : better_dead === '8ff1f85c-4f04-4f5b-936a-5aa9320cb66e' ? 3 : 0)";

    expect(evaluateExpression(expression, { value: allFields[9], type: 'field' }, allFields, valuesMap, context)).toBe(
      14,
    );
  });

  it('should support async expressions', async () => {
    // setup
    valuesMap.bad_sleep = 'a53f32bc-6904-4692-8a4c-fb7403cf0306';
    registerExpressionHelper('getAsyncValue', () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(18);
        }, 10);
      });
    });

    const result = await evaluateAsyncExpression(
      'getAsyncValue().then(value => !isEmpty(bad_sleep) ? value + 3 : value)',
      { value: allFields[9], type: 'field' },
      allFields,
      valuesMap,
      context,
    );
    expect(result).toBe(21);
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
        "includes(referredToPreventionServices, '88cdde2b-753b-48ac-a51a-ae5e1ab24846') && !includes(referredToPreventionServices, '1691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')",
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
        "mode == 'enter' && isEmpty(htsProviderRemarks)",
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
    expect(referredToPreventionServices.fieldDependents).toBeFalsy();
    expect(htsProviderRemarks.fieldDependents).toBeFalsy();
    // replay
    expect(
      evaluateExpression(
        "!includes(referredToPreventionServices, '88cdde2b-753b-48ac-a51a-ae5e1ab24846') && isEmpty(htsProviderRemarks)",
        { value: allFields[4], type: 'field' },
        allFields,
        valuesMap,
        context,
      ),
    ).toBeTruthy();
    expect(Array.from(referredToPreventionServices.fieldDependents)).toStrictEqual(['bodyTemperature']);
    expect(Array.from(htsProviderRemarks.fieldDependents)).toStrictEqual(['bodyTemperature']);
  });

  it('should support registered custom helper functions', () => {
    // setup
    function customHelper(a, b) {
      return a + b;
    }
    registerExpressionHelper('customAdd', customHelper);

    // verify
    const result = evaluateExpression(
      'customAdd(2, 3)',
      { value: allFields[1], type: 'field' },
      allFields,
      {},
      context,
    );
    expect(result).toEqual(5);
  });
});
