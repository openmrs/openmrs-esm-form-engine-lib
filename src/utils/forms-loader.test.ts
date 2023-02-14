import { FormJsonFile, getForm, getFormByVersion, getLatestFormVersion, applyFormIntent } from './forms-loader';
import formsRegistry from '../../__mocks__/packages/test-forms-registry';
import {
  htsHivtestResultingSchemaV2,
  htsRetrospectiveResultingSchemaV2,
  htsWildcardResultingSchemaV2,
  testSchemaV2,
} from '../../__mocks__/forms/ohri-forms/forms-loader.test.schema';

const htsTestForms: FormJsonFile[] = [
  {
    version: '1.0',
    semanticVersion: '1.0.0',
    json: {
      name: 'Test HTS POC',
      pages: [],
      processor: 'EncounterFormProcessor',
      uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
      referencedForms: [],
      encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
    },
  },
  {
    version: '1.1',
    semanticVersion: '1.1.0',
    json: {
      name: 'Test HTS POC',
      pages: [],
      processor: null,
      uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
      referencedForms: [],
      encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
    },
  },
  {
    version: '2.0',
    semanticVersion: '2.0.0',
    json: {
      name: 'Test HTS POC',
      pages: [],
      processor: null,
      uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
      referencedForms: ['f23de883-ea70-45e5-bff7-eff334b28c4b'],
      encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
    },
  },
];

describe('Forms loader - getForm', () => {
  it('should get latest form if no version was specified', () => {
    // replay
    const latestHTSForm = getForm('hiv', 'hts_poc', null, false, formsRegistry);
    // verify
    expect(latestHTSForm).toEqual({
      name: 'Test HTS POC',
      pages: [
        {
          label: 'Screening',
          sections: [
            {
              label: 'Testing history',
              isExpanded: 'true',
              questions: [
                {
                  label: 'When was the HIV test conducted?',
                  type: 'obs',
                  questionOptions: {
                    rendering: 'date',
                    concept: '164400AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                    weeksList: '',
                  },
                  required: 'true',
                  unspecified: 'true',
                  hide: {
                    hideWhenExpression: 'false',
                  },
                  validators: [
                    {
                      type: 'date',
                      allowFutureDates: 'false',
                    },
                    {
                      type: 'js_expression',
                      failsWhenExpression: "myValue < '1/1/1980' || myValue > today()",
                    },
                  ],
                  behaviours: [
                    {
                      intent: 'HTS_RETROSPECTIVE',
                      required: 'true',
                      unspecified: 'true',
                      hide: {
                        hideWhenExpression: 'false',
                      },
                      validators: [
                        {
                          type: 'date',
                          allowFutureDates: 'false',
                        },
                        {
                          type: 'js_expression',
                          failsWhenExpression: "myValue < '1/1/1980' || myValue > today()",
                        },
                      ],
                    },
                    {
                      intent: 'HTS_HIVTEST',
                      required: 'true',
                    },
                    {
                      intent: '',
                      required: 'false',
                      hide: {
                        hideWhenExpression: "hivTestConducted !== 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3'",
                      },
                      validators: [
                        {
                          type: 'date',
                          allowFutureDates: 'false',
                        },
                        {
                          type: 'js_expression',
                          failsWhenExpression: "myValue < '1/1/1980' || myValue > today()",
                        },
                      ],
                    },
                  ],
                  id: 'dateTestPerformed',
                },
              ],
            },
          ],
        },
      ],
      availableIntents: ['HTS_RETROSPECTIVE', 'HTS_HIVTEST', '*'],
      processor: 'EncounterFormProcessor',
      uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
      referencedForms: [],
      encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
    });
  });

  it('should get form with specified version', () => {
    // replay
    const htsFormV1_0 = getForm('hiv', 'hts_poc', '1.0', false, formsRegistry);
    // verify
    expect(htsFormV1_0).toEqual({
      name: 'Test HTS POC',
      pages: [],
      processor: 'EncounterFormProcessor',
      uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
      referencedForms: [],
      encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
    });
  });

  it('should throw an error if specified version was not found while in strict mode', () => {
    // replay
    try {
      getForm('hiv', 'hts_poc', '9.1', true, formsRegistry);
      // fail test if this point is hit
      fail('An error was expected to be called');
    } catch (error) {
      // verify
      expect(error.message).toBe("Couldn't find form with version: 9.1");
    }
  });

  it('should get lastet if required version was not found while in none strict mode', () => {
    // replay
    const latestForm = getForm('hiv', 'hts_poc', '9.1', false, formsRegistry);
    // verify
    expect(latestForm).toEqual({
      name: 'Test HTS POC',
      pages: [
        {
          label: 'Screening',
          sections: [
            {
              label: 'Testing history',
              isExpanded: 'true',
              questions: [
                {
                  label: 'When was the HIV test conducted?',
                  type: 'obs',
                  questionOptions: {
                    rendering: 'date',
                    concept: '164400AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                    weeksList: '',
                  },
                  required: 'true',
                  unspecified: 'true',
                  hide: {
                    hideWhenExpression: 'false',
                  },
                  validators: [
                    {
                      type: 'date',
                      allowFutureDates: 'false',
                    },
                    {
                      type: 'js_expression',
                      failsWhenExpression: "myValue < '1/1/1980' || myValue > today()",
                    },
                  ],
                  behaviours: [
                    {
                      intent: 'HTS_RETROSPECTIVE',
                      required: 'true',
                      unspecified: 'true',
                      hide: {
                        hideWhenExpression: 'false',
                      },
                      validators: [
                        {
                          type: 'date',
                          allowFutureDates: 'false',
                        },
                        {
                          type: 'js_expression',
                          failsWhenExpression: "myValue < '1/1/1980' || myValue > today()",
                        },
                      ],
                    },
                    {
                      intent: 'HTS_HIVTEST',
                      required: 'true',
                    },
                    {
                      intent: '',
                      required: 'false',
                      hide: {
                        hideWhenExpression: "hivTestConducted !== 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3'",
                      },
                      validators: [
                        {
                          type: 'date',
                          allowFutureDates: 'false',
                        },
                        {
                          type: 'js_expression',
                          failsWhenExpression: "myValue < '1/1/1980' || myValue > today()",
                        },
                      ],
                    },
                  ],
                  id: 'dateTestPerformed',
                },
              ],
            },
          ],
        },
      ],
      availableIntents: ['HTS_RETROSPECTIVE', 'HTS_HIVTEST', '*'],
      processor: 'EncounterFormProcessor',
      uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
      referencedForms: [],
      encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
    });
  });
});

describe('Forms loader - getLatestFormVersion', () => {
  it('should get latest form', () => {
    // replay
    const latest = getLatestFormVersion(htsTestForms);

    // verify
    expect(latest).toEqual({
      version: '2.0',
      semanticVersion: '2.0.0',
      json: {
        name: 'Test HTS POC',
        pages: [],
        processor: null,
        uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
        referencedForms: ['f23de883-ea70-45e5-bff7-eff334b28c4b'],
        encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
      },
    });
  });
});

describe('Forms loader - getFormByVersion', () => {
  it('should get required form version', () => {
    // replay
    const htsFormV1_1 = getFormByVersion(htsTestForms, '1.1');

    // verify
    expect(htsFormV1_1).toEqual({
      version: '1.1',
      semanticVersion: '1.1.0',
      json: {
        name: 'Test HTS POC',
        pages: [],
        processor: null,
        uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
        referencedForms: [],
        encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
      },
    });
  });
});

xdescribe('Forms loader - applyFormIntent', () => {
  it('should return correct fields for HTS_RETROSPECTIVE intent', () => {
    let resultingSchema = applyFormIntent('HTS_RETROSPECTIVE', testSchemaV2);

    expect(resultingSchema).toEqual(htsRetrospectiveResultingSchemaV2);
  });

  it('should return correct fields for HTS_HIVTEST intent', () => {
    let resultingSchema = applyFormIntent('HTS_HIVTEST', testSchemaV2);

    expect(resultingSchema).toEqual(htsHivtestResultingSchemaV2);
  });

  it('should return correct fields for * intent', () => {
    let resultingSchema = applyFormIntent('*', testSchemaV2);

    expect(resultingSchema).toEqual(htsWildcardResultingSchemaV2);
  });
});
