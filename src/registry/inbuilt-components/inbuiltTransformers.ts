import { FormSchemaTransformer } from '../../api/types';
import { AngularFormEngineSchemaTransformer } from '../../transformers/angular-fe-schema-transformer';
import { RegistryItem } from '../registry';

export const inbuiltFormTransformers: Array<RegistryItem<FormSchemaTransformer>> = [
  {
    name: 'AngularFormEngineSchemaTransformer',
    component: AngularFormEngineSchemaTransformer,
  },
];
