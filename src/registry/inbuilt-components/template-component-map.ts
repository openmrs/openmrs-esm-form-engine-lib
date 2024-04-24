import UISelectExtended from '../../components/inputs/ui-select-extended/ui-select-extended.component';
import OHRIDropdown from '../../components/inputs/select/ohri-dropdown.component';
import UiSelectExtended from '../../components/inputs/ui-select-extended/ui-select-extended.component';

export const templateToComponentMap = [
  {
    name: 'drug',
    baseControlComponent: UiSelectExtended,
  },
  {
    name: 'problem',
    baseControlComponent: UiSelectExtended,
  },
  {
    name: 'encounter-provider',
    baseControlComponent: UiSelectExtended,
  },
  {
    name: 'encounter-location',
    baseControlComponent: UiSelectExtended,
  },
  {
    name: 'select-concept-answers',
    baseControlComponent: OHRIDropdown,
  },
];
