import { AngularFormEngineSchemaTransformer } from '../../transformers/angular-fe-schema-transformer';
import { FormSchemaTransformer } from '../../types';
import { RegistryItem } from '../registry';

export const inbuiltFormTransformers: Array<RegistryItem<FormSchemaTransformer>> = [
  {
    name: 'AngularFormEngineSchemaTransformer',
    component: AngularFormEngineSchemaTransformer,
  },
];
