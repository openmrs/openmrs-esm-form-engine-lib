import { type FormSchema } from '../types';
import { DefaultFormSchemaTransformer } from './default-schema-transformer';
import testForm from '__mocks__/forms/afe-forms/test-schema-transformer-form.json';

const expectedTransformedSchema = {
  name: 'AFE form with aliased questions',
  readonly: false,
  pages: [
    {
      label: 'Page 1',
      readonly: false,
      id: 'page-Page1-0',
      sections: [
        {
          label: 'Section 1',
          isExpanded: true,
          questions: [
            {
              label: 'Multi Checkbox',
              type: 'obs',
              required: true,
              id: 'dem_multi_checkbox',
              questionOptions: {
                rendering: 'checkbox',
                isCheckboxSearchable: true,
              },
              validators: [
                {
                  type: 'form_field',
                },
                {
                  type: 'default_value',
                },
              ],
              meta: {
                submission: null,
                pageId: 'page-Page1-0',
                initialValue: {
                  omrsObject: null,
                  refinedValue: null,
                },
              },
            },
            {
              label: 'Numeric',
              id: 'dem_numeric',
              type: 'obs',
              required: false,
              questionOptions: {
                rendering: 'number',
              },
              validators: [
                {
                  type: 'form_field',
                },
                {
                  type: 'default_value',
                },
              ],
              meta: {
                submission: null,
                pageId: 'page-Page1-0',
                initialValue: {
                  omrsObject: null,
                  refinedValue: null,
                },
              },
            },
            {
              label: 'Encounter Provider',
              id: 'dem_encounter_provider',
              type: 'encounterProvider',
              required: false,
              questionOptions: {
                rendering: 'encounter-provider',
              },
              validators: [
                {
                  type: 'form_field',
                },
                {
                  type: 'default_value',
                },
              ],
              meta: {
                submission: null,
                pageId: 'page-Page1-0',
                initialValue: {
                  omrsObject: null,
                  refinedValue: null,
                },
              },
            },
            {
              id: 'dem_encounter_location',
              type: 'obsGroup',
              required: false,
              questionOptions: {
                rendering: 'group',
              },
              questions: [
                {
                  label: 'Encounter Location',
                  type: 'encounterLocation',
                  required: false,
                  questionOptions: {
                    rendering: 'encounter-location',
                  },
                  validators: [
                    {
                      type: 'form_field',
                    },
                    {
                      type: 'default_value',
                    },
                  ],
                  meta: {
                    submission: null,
                    pageId: 'page-Page1-0',
                    initialValue: {
                      omrsObject: null,
                      refinedValue: null,
                    },
                  },
                },
              ],
              meta: {
                submission: null,
                pageId: 'page-Page1-0',
                initialValue: {
                  omrsObject: null,
                  refinedValue: null,
                },
              },
            },
            {
              id: 'labOrder',
              type: 'testOrder',
              label: 'Add Lab Order',
              required: true,
              questionOptions: {
                rendering: 'repeating',
                concept: 'f1742346-cf43-4a17-8c98-720e3f487fc0',
                orderType: 'testorder',
                orderSettingUuid: 'INPATIENT',
                repeatOptions: {
                  limit: 2,
                },
                answers: [
                  {
                    concept: '30e2da8f-34ca-4c93-94c8-d429f22d381c',
                    label: 'Option 1',
                  },
                  {
                    concept: '143264AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                    label: 'Option 2',
                  },
                ],
              },
              validators: [
                {
                  type: 'form_field',
                },
                {
                  type: 'default_value',
                },
              ],
              meta: {
                submission: null,
                pageId: 'page-Page1-0',
                initialValue: {
                  omrsObject: null,
                  refinedValue: null,
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

describe('Default form schema transformer', () => {
  it('should transform AFE schema to be compatible with RFE', () => {
    expect(DefaultFormSchemaTransformer.transform(testForm as any)).toEqual(expectedTransformedSchema);
  });

  it('should handle checkbox-searchable rendering', () => {
    // setup
    const form = {
      pages: [
        {
          sections: [
            {
              questions: [
                {
                  label: 'Searchable Checkbox',
                  type: 'obs',
                  questionOptions: {
                    rendering: 'checkbox-searchable',
                  },
                  id: 'searchableCheckbox',
                },
              ],
            },
          ],
        },
      ],
    };
    // exercise
    const transformedForm = DefaultFormSchemaTransformer.transform(form as FormSchema);
    const transformedQuestion = transformedForm.pages[0].sections[0].questions[0];
    // verify
    expect(transformedQuestion.questionOptions.rendering).toEqual('checkbox');
    expect(transformedQuestion.questionOptions.isCheckboxSearchable).toEqual(true);
  });

  it('should handle multiCheckbox rendering', () => {
    // setup
    const form = {
      pages: [
        {
          sections: [
            {
              questions: [
                {
                  label: 'Multi Checkbox',
                  type: 'obs',
                  questionOptions: {
                    rendering: 'multiCheckbox',
                  },
                  id: 'multiCheckboxField',
                },
              ],
            },
          ],
        },
      ],
    };
  });
});
