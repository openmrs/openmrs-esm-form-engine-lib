import { type FormContextProps } from '../provider/form-provider';
import { type FormSchema } from '../types';
import { type FormProcessorContextProps } from '../types';

export type FormProcessorConstructor = new (...args: ConstructorParameters<typeof FormProcessor>) => FormProcessor;

export abstract class FormProcessor {
  formJson: FormSchema;
  domainObjectValue: any;
  constructor(formJson: FormSchema) {
    this.formJson = formJson;
  }
  getDomainObject() {
    return this.domainObjectValue;
  }
  abstract processSubmission(context: FormContextProps): Promise<Record<string, any>>;
  abstract loadDependencies(context: Partial<FormProcessorContextProps>): Promise<any>;
  abstract resolveContextDependencies(
    context: FormProcessorContextProps,
    setContext: (context: FormProcessorContextProps) => void,
  ): void;
  abstract getInitialValues(context: FormProcessorContextProps): Promise<Record<string, any>>;
  abstract getCustomHooks(): {
    useCustomHooks: (context: Partial<FormProcessorContextProps>) => {
      data: any;
      isLoading: boolean;
      error: any;
      updateContext: (
        data: any,
        processor: FormProcessor,
        setContext: (context: FormProcessorContextProps) => void,
      ) => void;
    };
  };
  abstract prepareFormSchema(schema: FormSchema): FormSchema;
}
