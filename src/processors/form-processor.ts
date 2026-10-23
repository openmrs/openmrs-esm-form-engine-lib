import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type ValueAndDisplay, type FormField, type FormSchema, type FormProcessorContextProps } from '../types';

export type FormProcessorConstructor = new (...args: ConstructorParameters<typeof FormProcessor>) => FormProcessor;

/**
 * The setters a processor uses to feed its results back into the processor context. These are the
 * only three properties it can change; the rest of {@link FormProcessorContextProps} is derived by
 * the FormProcessorFactory. They supersede the `setContext` passed alongside them, which is shaped
 * like a `setState` over the whole context but silently discards everything else.
 */
export interface FormProcessorContextSetters {
  setDomainObjectValue: (value: OpenmrsResource) => void;
  setPreviousDomainObjectValue: (value: OpenmrsResource) => void;
  setCustomDependencies: (
    dependencies: Record<string, any> | ((previous: Record<string, any>) => Record<string, any>),
  ) => void;
}

export type GetCustomHooksResponse = {
  useCustomHooks: (context: Partial<FormProcessorContextProps>) => {
    data: any;
    isLoading: boolean;
    error: any;
    /**
     * Called once the hook has finished loading, to merge its results into the processor context.
     * `setContext` is deprecated; use `setters`.
     */
    updateContext: (
      setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>,
      setters: FormProcessorContextSetters,
    ) => void;
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

  /**
   * Loads whatever the processor needs before the form can render, merging the results into the
   * processor context. `setContext` is deprecated; use `setters`.
   */
  async loadDependencies(
    context: Partial<FormProcessorContextProps>,
    setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>,
    setters: FormProcessorContextSetters,
  ): Promise<Record<string, any>> {
    return Promise.resolve({});
  }

  abstract getHistoricalValue(field: FormField, context: FormContextProps): Promise<ValueAndDisplay>;
  abstract processSubmission(context: FormContextProps, abortController: AbortController): Promise<OpenmrsResource>;
  abstract getInitialValues(context: FormProcessorContextProps): Promise<Record<string, any>>;
  abstract getCustomHooks(): GetCustomHooksResponse;
  abstract prepareFormSchema(schema: FormSchema): FormSchema;
}
