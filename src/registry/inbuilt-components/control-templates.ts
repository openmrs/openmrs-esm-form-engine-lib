import { ControlTemplate } from '../../api/types';

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
    name: 'problem',
    datasource: {
      name: 'problem_datasource',
      config: {
        class: ['8d4918b0-c2cc-11de-8d13-0010c6dffd0f', '8d492954-c2cc-11de-8d13-0010c6dffd0f'],
      },
    },
  },
];

export const getControlTemplate = (name: string) => {
  return controlTemplates.find(template => template.name === name);
};
