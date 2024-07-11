import { type RegistryItem } from '../..';
import { ObsAdapter } from '../../adapters/obs-adapter';
import { type FormFieldValueAdapter } from '../../types';

export const inbuiltFieldValueAdapters: RegistryItem<FormFieldValueAdapter>[] = [
  {
    type: 'obs',
    component: ObsAdapter,
  },
];
