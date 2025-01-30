import { PersonAttributesTransformer } from '../../transformers/person-attributes-transformer';
import { DefaultFormSchemaTransformer } from '../../transformers/default-schema-transformer';
import { type FormSchemaTransformer } from '../../types';
import { type RegistryItem } from '../registry';

export const inbuiltFormTransformers: Array<RegistryItem<FormSchemaTransformer>> = [
  {
    name: 'DefaultFormSchemaTransformer',
    component: DefaultFormSchemaTransformer,
  },
  {
    name: 'PersonAttributesTransformer',
    component: PersonAttributesTransformer,
  },
];
