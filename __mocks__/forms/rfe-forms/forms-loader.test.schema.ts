export const testSchemaV2 = {
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
                  intent: '*',
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
  processor: 'EncounterFormProcessor',
  uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
  referencedForms: [],
  encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
};

export const htsRetrospectiveResultingSchemaV2 = {
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
              id: 'dateTestPerformed',
            },
          ],
        },
      ],
    },
  ],
  processor: 'EncounterFormProcessor',
  uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
  referencedForms: [],
  encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
};

export const htsHivtestResultingSchemaV2 = {
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
              id: 'dateTestPerformed',
            },
          ],
        },
      ],
    },
  ],
  processor: 'EncounterFormProcessor',
  uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
  referencedForms: [],
  encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
};

export const htsWildcardResultingSchemaV2 = {
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
              id: 'dateTestPerformed',
            },
          ],
        },
      ],
    },
  ],
  processor: 'EncounterFormProcessor',
  uuid: 'da24c540-cc83-43bc-978f-c1ef180a497f',
  referencedForms: [],
  encounterType: '79c1f50f-f77d-42e2-ad2a-d29304dde2fe',
};
