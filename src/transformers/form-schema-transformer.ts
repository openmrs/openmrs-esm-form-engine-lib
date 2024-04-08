import { OHRIFormSchema } from '../api/types';
import { getRegisteredFormSchemaTransformers } from '../registry/registry';

export async function transformSchema(form: OHRIFormSchema) {
  const transformers = await getRegisteredFormSchemaTransformers();
  const transformedForm = await transformers.reduce(async (previousPromise, transformer) => {
    const previousTransformedForm = await previousPromise;
    return transformer.transform(form);
  }, Promise.resolve(form));
  return transformedForm;
}
