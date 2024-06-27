import { type ControlTemplate } from '../../types';

export const controlTemplates: Array<ControlTemplate> = [
  {
    name: 'drug',
    datasource: {
      name: 'drug_datasource',
      config: {
        class: '8d490dfc-c2cc-11de-8d13-0010c6dffd0f',
      },
    },
  },
  {
    name: 'select-concept-answers',
    datasource: {
      name: 'select_concept_answers_datasource',
      config: {
        concept: '',
      },
    },
  },
  {
    name: 'person-attribute-location',
    datasource: {
      name: 'person_attribute_location_datasource',
    },
  },
  {
    name: 'encounter-provider',
    datasource: {
      name: 'provider_datasource',
    },
  },
  {
    name: 'encounter-role',
    datasource: {
      name: 'encounter_role_datasource',
    },
  },
  {
    name: 'encounter-location',
    datasource: {
      name: 'location_datasource',
    },
  },
  {
    name: 'problem',
    datasource: {
      name: 'problem_datasource',
      config: {
        class: [
          '8d4918b0-c2cc-11de-8d13-0010c6dffd0f',
          '8d492954-c2cc-11de-8d13-0010c6dffd0f',
          '8d492b2a-c2cc-11de-8d13-0010c6dffd0f',
        ],
      },
    },
  },
];

export const getControlTemplate = (name: string) => {
  return controlTemplates.find((template) => template.name === name);
};
