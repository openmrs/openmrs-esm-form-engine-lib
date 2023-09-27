import UISelectExtended from '../../components/inputs/ui-select-extended/ui-select-extended';

export const controlTemplates = [
  {
    name: 'drug',
    baseControlComponent: UISelectExtended,
    datasource: {
      name: 'drug_datasource',
      config: {
        class: '8d490dfc-c2cc-11de-8d13-0010c6dffd0f',
      },
    },
  },
];

export const getControlTemplate = (name: string) => {
  return controlTemplates.find(template => template.name === name);
};
