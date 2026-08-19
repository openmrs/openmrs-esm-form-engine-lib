import { type FormSchema, type PreFilledQuestions } from '../types';
import { vi, describe, it, expect } from 'vitest';
import { DefaultFormSchemaTransformer } from './default-schema-transformer';
import { testForm } from '__mocks__/forms';

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

  it('should preserve diagnosis datasource config when mapping to the problem datasource', () => {
    const form = {
      pages: [
        {
          sections: [
            {
              questions: [
                {
                  id: 'primaryDiagnosis',
                  label: 'Primary diagnosis',
                  type: 'diagnosis',
                  questionOptions: {
                    rendering: 'repeating',
                    datasource: {
                      name: 'diagnoses',
                      config: {
                        conceptSourceUuid: 'icd-11-source',
                      },
                    },
                    diagnosis: {
                      conceptClasses: ['diagnosis-class'],
                      rank: 1,
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const transformedForm = DefaultFormSchemaTransformer.transform(form as any);
    const transformedQuestion = transformedForm.pages[0].sections[0].questions[0];

    expect(transformedQuestion.questionOptions.datasource).toEqual({
      name: 'problem_datasource',
      config: {
        conceptSourceUuid: 'icd-11-source',
        class: ['diagnosis-class'],
      },
    });
  });

  it('should preserve diagnosis datasource config for concept-set diagnoses', () => {
    const form = {
      pages: [
        {
          sections: [
            {
              questions: [
                {
                  id: 'primaryDiagnosis',
                  label: 'Primary diagnosis',
                  type: 'diagnosis',
                  questionOptions: {
                    rendering: 'repeating',
                    datasource: {
                      name: 'diagnoses',
                      config: {
                        conceptSourceUuid: 'icd-11-source',
                      },
                    },
                    diagnosis: {
                      conceptSet: 'diagnosis-concept-set',
                      rank: 1,
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const transformedForm = DefaultFormSchemaTransformer.transform(form as any);
    const transformedQuestion = transformedForm.pages[0].sections[0].questions[0];

    expect(transformedQuestion.questionOptions.datasource).toEqual({
      name: 'problem_datasource',
      config: {
        conceptSourceUuid: 'icd-11-source',
        concept: 'diagnosis-concept-set',
        useSetMembersByConcept: true,
      },
    });
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

  it('should handle pre-filled questions', () => {
    const form = {
      pages: [
        {
          sections: [
            {
              questions: [
                {
                  id: 'question1',
                  type: 'obs',
                  questionOptions: {},
                },
                {
                  id: 'nestedGroup',
                  type: 'obsGroup',
                  questionOptions: {
                    rendering: 'group',
                  },
                  questions: [
                    {
                      id: 'nestedQuestion1',
                      type: 'obs',
                      questionOptions: {},
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const preFilledQuestions = {
      question1: 'prefilledValue1',
      nestedQuestion1: 'prefilledValue2',
    };

    const transformedForm = DefaultFormSchemaTransformer.transform(
      form as FormSchema,
      preFilledQuestions as PreFilledQuestions,
    );

    expect(transformedForm.pages[0].sections[0].questions[0].questionOptions.defaultValue).toEqual('prefilledValue1');
    expect(transformedForm.pages[0].sections[0].questions[1].questions[0].questionOptions.defaultValue).toEqual(
      'prefilledValue2',
    );
  });

  it('should not modify questions when no pre-filled questions are provided', () => {
    const form = {
      pages: [
        {
          sections: [
            {
              questions: [
                {
                  id: 'question1',
                  type: 'obs',
                  questionOptions: {},
                },
              ],
            },
          ],
        },
      ],
    };

    const transformedForm = DefaultFormSchemaTransformer.transform(form as FormSchema);

    expect(transformedForm.pages[0].sections[0].questions[0].questionOptions.defaultValue).toBeUndefined();
  });

  it('should handle empty pre-filled questions object', () => {
    const form = {
      pages: [
        {
          sections: [
            {
              questions: [
                {
                  id: 'question1',
                  type: 'obs',
                  questionOptions: {},
                },
              ],
            },
          ],
        },
      ],
    };

    const transformedForm = DefaultFormSchemaTransformer.transform(form as FormSchema, {} as PreFilledQuestions);

    expect(transformedForm.pages[0].sections[0].questions[0].questionOptions.defaultValue).toBeUndefined();
  });

  describe('type and rendering rewrites', () => {
    function transformQuestions(...questions: Array<Record<string, unknown>>) {
      const form = { pages: [{ sections: [{ questions }] }] } as unknown as FormSchema;
      return DefaultFormSchemaTransformer.transform(form).pages[0].sections[0].questions;
    }

    it('should map encounterRole questions to the encounter-role rendering', () => {
      const [question] = transformQuestions({
        id: 'encRole',
        type: 'encounterRole',
        questionOptions: { rendering: 'ui-select-extended' },
      });

      expect(question.questionOptions.rendering).toEqual('encounter-role');
    });

    it('should map ui-select-extended encounterDatetime questions to the date rendering', () => {
      const [uiSelect, datetime] = transformQuestions(
        { id: 'encDate1', type: 'encounterDatetime', questionOptions: { rendering: 'ui-select-extended' } },
        { id: 'encDate2', type: 'encounterDatetime', questionOptions: { rendering: 'datetime' } },
      );

      expect(uiSelect.questionOptions.rendering).toEqual('date');
      expect(uiSelect.datePickerFormat).toEqual('calendar');
      expect(datetime.questionOptions.rendering).toEqual('datetime');
    });

    it('should default the datePickerFormat of datetime questions to "both"', () => {
      const [defaulted, explicit] = transformQuestions(
        { id: 'apptDatetime', type: 'obs', questionOptions: { rendering: 'datetime' } },
        { id: 'pinnedDatetime', type: 'obs', datePickerFormat: 'calendar', questionOptions: { rendering: 'datetime' } },
      );

      expect(defaulted.datePickerFormat).toEqual('both');
      expect(explicit.datePickerFormat).toEqual('calendar');
    });

    it('should inject the select-concept-answers datasource when none is configured', () => {
      const [question] = transformQuestions({
        id: 'conceptAnswers',
        type: 'obs',
        questionOptions: { rendering: 'select-concept-answers', concept: 'concept-set-uuid' },
      });

      expect(question.questionOptions.isSearchable).toBe(true);
      expect(question.questionOptions.datasource).toEqual({
        name: 'select_concept_answers_datasource',
        config: { concept: 'concept-set-uuid' },
      });
    });

    it('should keep a pre-configured select-concept-answers datasource', () => {
      const [question] = transformQuestions({
        id: 'conceptAnswers',
        type: 'obs',
        questionOptions: {
          rendering: 'select-concept-answers',
          concept: 'concept-set-uuid',
          datasource: { name: 'custom_datasource', config: { concept: 'custom-concept-uuid' } },
        },
      });

      expect(question.questionOptions.isSearchable).toBe(true);
      expect(question.questionOptions.datasource).toEqual({
        name: 'custom_datasource',
        config: { concept: 'custom-concept-uuid' },
      });
    });

    it('should turn workspace-launcher questions into controls', () => {
      const [question] = transformQuestions({
        id: 'launcher',
        type: 'obs',
        questionOptions: { rendering: 'workspace-launcher' },
      });

      expect(question.type).toEqual('control');
    });

    it('should make drug and problem questions searchable', () => {
      const [drug, problem] = transformQuestions(
        { id: 'drugQuestion', type: 'obs', questionOptions: { rendering: 'drug' } },
        { id: 'problemQuestion', type: 'obs', questionOptions: { rendering: 'problem' } },
      );

      expect(drug.questionOptions.isSearchable).toBe(true);
      expect(problem.questionOptions.isSearchable).toBe(true);
    });

    it('should render inline multiCheckbox questions as plain checkboxes', () => {
      const [question] = transformQuestions({
        id: 'inlineMulti',
        type: 'obs',
        inlineMultiCheckbox: true,
        questionOptions: { rendering: 'multiCheckbox' },
      });

      expect(question.questionOptions.rendering).toEqual('checkbox');
      expect(question.questionOptions.isCheckboxSearchable).toBeUndefined();
    });
  });
});
