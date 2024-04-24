import File from '../../components/inputs/file/file.component';
import { RegistryItem } from '../registry';
import { controlTemplates } from './control-templates';
import { templateToComponentMap } from './template-component-map';
import { FormFieldProps } from '../../types';
import DateField from '../../components/inputs/date/date.component';
import Radio from '../../components/inputs/radio/radio.component';
import NumberField from '../../components/inputs/number/number.component';
import TextField from '../../components/inputs/text/text.component';
import { MultiSelect } from '../../components/inputs/multi-select/multi-select.component';
import { ContentSwitcher } from '../../components/inputs/content-switcher/content-switcher.component';
import TextArea from '../../components/inputs/text-area/text-area.component';
import Dropdown from '../../components/inputs/select/dropdown.component';
import Toggle from '../../components/inputs/toggle/toggle.component';
import { ObsGroup } from '../../components/group/obs-group.component';
import Repeat from '../../components/repeat/repeat.component';
import Markdown from '../../components/inputs/markdown/markdown.component';
import FixedValue from '../../components/inputs/fixed-value/fixed-value.component';
import ExtensionParcel from '../../components/extension/extension-parcel.component';
import WorkspaceLauncher from '../../components/inputs/workspace-launcher/workspace-launcher.component';
import UISelectExtended from '../../components/inputs/ui-select-extended/ui-select-extended.component';

/**
 * @internal
 */

export const inbuiltControls: Array<RegistryItem<React.ComponentType<FormFieldProps>>> = [
  {
    name: 'TextField',
    component: TextField,
    type: 'text',
  },
  {
    name: 'Radio',
    component: Radio,
    type: 'radio',
  },
  {
    name: 'DateField',
    component: DateField,
    type: 'date',
  },
  {
    name: 'NumberField',
    component: NumberField,
    type: 'number',
    alias: 'numeric',
  },
  {
    name: 'MultiSelect',
    component: MultiSelect,
    type: 'checkbox',
    alias: 'multiCheckbox',
  },
  {
    name: 'ContentSwitcher',
    component: ContentSwitcher,
    type: 'content-switcher',
  },
  {
    name: 'Dropdown',
    component: Dropdown,
    type: 'select',
  },
  {
    name: 'TextArea',
    component: TextArea,
    type: 'textarea',
  },
  {
    name: 'Toggle',
    component: Toggle,
    type: 'toggle',
  },
  {
    name: 'ObsGroup',
    component: ObsGroup,
    type: 'group',
  },
  {
    name: 'Repeat',
    component: Repeat,
    type: 'repeating',
  },
  {
    name: 'FixedValue',
    component: FixedValue,
    type: 'fixed-value',
  },
  {
    name: 'Markdown',
    component: Markdown,
    type: 'markdown',
  },
  {
    name: 'ExtensionParcel',
    component: ExtensionParcel,
    type: 'extension-widget',
  },
  {
    name: 'DateField',
    component: DateField,
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
  {
    name: 'WorkspaceLauncher',
    component: WorkspaceLauncher,
    type: 'workspace-launcher',
  },
  ...controlTemplates.map((template) => ({
    name: `${template.name}Control`,
    component: templateToComponentMap.find((component) => component.name === template.name).baseControlComponent,
    type: template.name,
  })),
];
