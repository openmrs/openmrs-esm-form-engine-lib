import TextField from '../../components/inputs/text/text.component';
import { type FormFieldInputProps } from '../../types';
import { type RegistryItem } from '../registry';

/**
 * @internal
 */

export const inbuiltControls: Array<RegistryItem<React.ComponentType<FormFieldInputProps>>> = [
  {
    name: 'text',
    component: TextField,
  },
];
