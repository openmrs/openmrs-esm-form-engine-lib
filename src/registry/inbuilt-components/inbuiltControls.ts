import ObsGroup from '../../components/group/obs-group.component';
import ContentSwitcher from '../../components/inputs/content-switcher/content-switcher.component';
import DateField from '../../components/inputs/date/date.component';
import FixedValue from '../../components/inputs/fixed-value/fixed-value.component';
import Markdown from '../../components/inputs/markdown/markdown.component';
import MultiSelect from '../../components/inputs/multi-select/multi-select.component';
import NumberField from '../../components/inputs/number/number.component';
import Radio from '../../components/inputs/radio/radio.component';
import Dropdown from '../../components/inputs/select/dropdown.component';
import TextArea from '../../components/inputs/text-area/text-area.component';
import TextField from '../../components/inputs/text/text.component';
import Toggle from '../../components/inputs/toggle/toggle.component';
import UiSelectExtended from '../../components/inputs/ui-select-extended/ui-select-extended.component';
import WorkspaceLauncher from '../../components/inputs/workspace-launcher/workspace-launcher.component';
import Repeat from '../../components/repeat/repeat.component';
import File from '../../components/inputs/file/file.component';
import { type FormFieldInputProps } from '../../types';
import { type RegistryItem } from '../registry';
import { controlTemplates } from './control-templates';
import { templateToComponentMap } from './template-component-map';

/**
 * @internal
 */

export const inbuiltControls: Array<RegistryItem<React.ComponentType<FormFieldInputProps>>> = [
  {
    name: 'text',
    component: TextField,
  },
  {
    name: 'textarea',
    component: TextArea,
  },
  {
    name: 'select',
    component: Dropdown,
  },
  {
    name: 'checkbox',
    component: MultiSelect,
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
    name: 'datetime',
    component: DateField,
  },
  {
    name: 'number',
    component: NumberField,
  },
  {
    name: 'content-switcher',
    component: ContentSwitcher,
  },
  {
    name: 'toggle',
    component: Toggle,
  },
  {
    name: 'workspace-launcher',
    component: WorkspaceLauncher,
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
    name: 'markdown',
    component: Markdown,
  },
  {
    name: 'fixed-value',
    component: FixedValue,
  },
  {
    name: 'ui-select-extended',
    component: UiSelectExtended,
  },
  {
    name: 'file',
    component: File,
  },
  ...controlTemplates.map((template) => ({
    name: template.name,
    component: templateToComponentMap.find((component) => component.name === template.name).baseControlComponent,
  })),
];
