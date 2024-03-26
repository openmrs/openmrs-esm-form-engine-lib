import { FormSchemaTransformer } from '../../api/types';
import { AngularFormTransformer } from '../../transformers/AFETransformer';
import { RegistryItem } from '../registry';

export const inbuiltFormTransformers: Array<RegistryItem<FormSchemaTransformer>> = [
  {
    name: 'AFESChemaTransformer',
    component: AngularFormTransformer,
  },
];
