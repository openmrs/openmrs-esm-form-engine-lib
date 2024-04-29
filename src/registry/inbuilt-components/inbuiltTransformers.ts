import { AngularFormEngineSchemaTransformer } from '../../transformers/angular-fe-schema-transformer';
import { type FormSchemaTransformer } from '../../types';
import { type RegistryItem } from '../registry';

export const inbuiltFormTransformers: Array<RegistryItem<FormSchemaTransformer>> = [
  {
    name: 'AngularFormEngineSchemaTransformer',
    component: AngularFormEngineSchemaTransformer,
  },
];
