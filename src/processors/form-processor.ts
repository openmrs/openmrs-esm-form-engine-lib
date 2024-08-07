import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type ValueAndDisplay, type FormField, type FormSchema } from '../types';
import { type FormProcessorContextProps } from '../types';

export type FormProcessorConstructor = new (...args: ConstructorParameters<typeof FormProcessor>) => FormProcessor;

export type GetCustomHooksResponse = {
  useCustomHooks: (context: Partial<FormProcessorContextProps>) => {
    data: any;
    isLoading: boolean;
    error: any;
    updateContext: (setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>) => void;
  };
};

export abstract class FormProcessor {
  formJson: FormSchema;
  domainObjectValue: OpenmrsResource;

  constructor(formJson: FormSchema) {
    this.formJson = formJson;
  }

  getDomainObject() {
    return this.domainObjectValue;
  }

  async loadDependencies(
    context: Partial<FormProcessorContextProps>,
    setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>,
  ): Promise<Record<string, any>> {
    return Promise.resolve({});
  }

  abstract getHistoricalValue(field: FormField, context: FormContextProps): Promise<ValueAndDisplay>;
  abstract processSubmission(context: FormContextProps, abortController: AbortController): Promise<OpenmrsResource>;
  abstract getInitialValues(context: FormProcessorContextProps): Promise<Record<string, any>>;
  abstract getCustomHooks(): GetCustomHooksResponse;
  abstract prepareFormSchema(schema: FormSchema): FormSchema;
}
