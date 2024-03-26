import { OHRIFormSchema } from '../api/types';
import { getRegisteredformSchemaTransformers } from '../registry/registry';

export async function transformSchema(form: OHRIFormSchema) {
  const transformers = await getRegisteredformSchemaTransformers();
  transformers.forEach((transformer) => {
    transformer.transform(form);
  });
}
