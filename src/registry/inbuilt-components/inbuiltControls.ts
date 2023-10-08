import { OHRIFormFieldProps } from '../../api/types';
import OHRIExtensionParcel from '../../components/extension/ohri-extension-parcel.component';
import UISelectExtended from '../../components/inputs/ui-select-extended/ui-select-extended';
import { OHRIObsGroup } from '../../components/group/ohri-obs-group.component';
import { OHRIContentSwitcher } from '../../components/inputs/content-switcher/ohri-content-switcher.component';
import OHRIDate from '../../components/inputs/date/ohri-date.component';
import OHRIFixedValue from '../../components/inputs/fixed-value/ohri-fixed-value.component';
import { OHRIEncounterLocationPicker } from '../../components/inputs/location/ohri-encounter-location.component';
import OHRIMarkdown from '../../components/inputs/markdown/ohri-markdown.component';
import { OHRIMultiSelect } from '../../components/inputs/multi-select/ohri-multi-select.component';
import OHRINumber from '../../components/inputs/number/ohri-number.component';
import OHRIRadio from '../../components/inputs/radio/ohri-radio.component';
import OHRIDropdown from '../../components/inputs/select/ohri-dropdown.component';
import OHRITextArea from '../../components/inputs/text-area/ohri-text-area.component';
import OHRIText from '../../components/inputs/text/ohri-text.component';
import OHRIToggle from '../../components/inputs/toggle/ohri-toggle.component';
import { OHRIRepeat } from '../../components/repeat/ohri-repeat.component';
import File from '../../components/inputs/file/file.component';
import { RegistryItem } from '../registry';
import { controlTemplates } from './control-templates';
import { templateToComponentMap } from './template-component-map';

/**
 * @internal
 */

export const inbuiltControls: Array<RegistryItem<React.ComponentType<OHRIFormFieldProps>>> = [
  {
    name: 'OHRIText',
    component: OHRIText,
    type: 'text',
  },
  {
    name: 'OHRIRadio',
    component: OHRIRadio,
    type: 'radio',
  },
  {
    name: 'OHRIDate',
    component: OHRIDate,
    type: 'date',
  },
  {
    name: 'OHRINumber',
    component: OHRINumber,
    type: 'number',
    alias: 'numeric',
  },
  {
    name: 'OHRIMultiSelect',
    component: OHRIMultiSelect,
    type: 'checkbox',
    alias: 'multiCheckbox',
  },
  {
    name: 'OHRIContentSwitcher',
    component: OHRIContentSwitcher,
    type: 'content-switcher',
  },
  {
    name: 'OHRIEncounterLocationPicker',
    component: OHRIEncounterLocationPicker,
    type: 'encounter-location',
  },
  {
    name: 'OHRIDropdown',
    component: OHRIDropdown,
    type: 'select',
  },
  {
    name: 'OHRITextArea',
    component: OHRITextArea,
    type: 'textarea',
  },
  {
    name: 'OHRIToggle',
    component: OHRIToggle,
    type: 'toggle',
  },
  {
    name: 'OHRIObsGroup',
    component: OHRIObsGroup,
    type: 'group',
  },
  {
    name: 'OHRIRepeat',
    component: OHRIRepeat,
    type: 'repeating',
  },
  {
    name: 'OHRIFixedValue',
    component: OHRIFixedValue,
    type: 'fixed-value',
  },
  {
    name: 'OHRIMarkdown',
    component: OHRIMarkdown,
    type: 'markdown',
  },
  {
    name: 'OHRIExtensionParcel',
    component: OHRIExtensionParcel,
    type: 'extension-widget',
  },
  {
    name: 'OHRIDateTime',
    component: OHRIDate,
    type: 'datetime',
  },
  {
    name: 'UISelectExtended',
    component: UISelectExtended,
    type: 'ui-select-extended',
  },
  {
    name: 'File',
    component: File,
    type: 'file',
  },
  ...controlTemplates.map(template => ({
    name: `${template.name}Control`,
    component: templateToComponentMap.find(component => component.name === template.name).baseControlComponent,
    type: template.name.toLowerCase(),
  })),
];
