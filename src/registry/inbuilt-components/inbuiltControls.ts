import File from '../../components/inputs/file/file.component';
import { type RegistryItem } from '../registry';
import { controlTemplates } from './control-templates';
import { templateToComponentMap } from './template-component-map';
import { type FormFieldProps } from '../../types';
import ContentSwitcher from '../../components/inputs/content-switcher/content-switcher.component';
import DateField from '../../components/inputs/date/date.component';
import Dropdown from '../../components/inputs/select/dropdown.component';
import ExtensionParcel from '../../components/extension/extension-parcel.component';
import FixedValue from '../../components/inputs/fixed-value/fixed-value.component';
import Markdown from '../../components/inputs/markdown/markdown.component';
import MultiSelect from '../../components/inputs/multi-select/multi-select.component';
import NumberField from '../../components/inputs/number/number.component';
import ObsGroup from '../../components/group/obs-group.component';
import Radio from '../../components/inputs/radio/radio.component';
import Repeat from '../../components/repeat/repeat.component';
import TextArea from '../../components/inputs/text-area/text-area.component';
import TextField from '../../components/inputs/text/text.component';
import Toggle from '../../components/inputs/toggle/toggle.component';
import UiSelectExtended from '../../components/inputs/ui-select-extended/ui-select-extended.component';
import WorkspaceLauncher from '../../components/inputs/workspace-launcher/workspace-launcher.component';

/**
 * @internal
 */

export const inbuiltControls: Array<RegistryItem<React.ComponentType<FormFieldProps>>> = [
  {
    name: 'text',
    component: TextField,
  },
  {
    name: 'radio',
    component: Radio,
  },
  {
    name: 'date',
    component: DateField,
  },
  {
    name: 'number',
    component: NumberField,
    alias: 'numeric',
  },
  {
    name: 'checkbox',
    component: MultiSelect,
    alias: 'multiCheckbox',
  },
  {
    name: 'content-switcher',
    component: ContentSwitcher,
  },
  {
    name: 'select',
    component: Dropdown,
  },
  {
    name: 'textarea',
    component: TextArea,
  },
  {
    name: 'toggle',
    component: Toggle,
  },
  {
    name: 'group',
    component: ObsGroup,
  },
  {
    name: 'repeating',
    component: Repeat,
  },
  {
    name: 'fixed-value',
    component: FixedValue,
  },
  {
    name: 'markdown',
    component: Markdown,
  },
  {
    name: 'extension-widget',
    component: ExtensionParcel,
  },
  {
    name: 'datetime',
    component: DateField,
  },
  {
    name: 'ui-select-extended',
    component: UiSelectExtended,
  },
  {
    name: 'file',
    component: File,
  },
  {
    name: 'workspace-launcher',
    component: WorkspaceLauncher,
  },
  ...controlTemplates.map((template) => ({
    name: template.name,
    component: templateToComponentMap.find((component) => component.name === template.name)?.baseControlComponent,
  })),
];
