import {
  type FormField,
  type DataSource,
  type FormFieldInputProps,
  type FormFieldValidator,
  type FormFieldValueAdapter,
  type FormSchemaTransformer,
  type PostSubmissionAction,
} from '../types';
import { getGlobalStore } from '@openmrs/esm-framework';
import { FormsStore } from '../constants';
import { inbuiltControls } from './inbuilt-components/inbuiltControls';
import { inbuiltValidators } from './inbuilt-components/inbuiltValidators';
import { inbuiltDataSources } from './inbuilt-components/inbuiltDataSources';
import { getControlTemplate } from './inbuilt-components/control-templates';
import { inbuiltPostSubmissionActions } from './inbuilt-components/InbuiltPostSubmissionActions';
import { inbuiltFormTransformers } from './inbuilt-components/inbuiltTransformers';
import { inbuiltFieldValueAdapters } from './inbuilt-components/inbuiltFieldValueAdapters';

/**
 * @internal
 */
export interface RegistryItem<T> {
  // Do we need this?
  name?: string;
  component: T;
  type?: string;
  /**
   * @deprecated
   */
  alias?: string;
}

export interface ComponentRegistration<T> {
  name: string;
  load: () => Promise<{ default: T }>;
}

export interface CustomControlRegistration extends ComponentRegistration<React.ComponentType<FormFieldInputProps>> {
  type: string;
  alias?: string;
}

export interface FieldValueAdapterRegistration extends ComponentRegistration<FormFieldValueAdapter> {
  type: string;
}

export interface FormsRegistryStoreState {
  controls: CustomControlRegistration[];
  fieldValidators: ComponentRegistration<FormFieldValidator>[];
  fieldValueAdapters: FieldValueAdapterRegistration[];
  postSubmissionActions: ComponentRegistration<PostSubmissionAction>[];
  dataSources: ComponentRegistration<DataSource<any>>[];
  expressionHelpers: Record<string, Function>;
  formSchemaTransformers: ComponentRegistration<FormSchemaTransformer>[];
}

interface FormRegistryCache {
  validators: Record<string, FormFieldValidator>;
  controls: Record<string, React.ComponentType<FormFieldInputProps>>;
  fieldValueAdapters: Record<string, FormFieldValueAdapter>;
  postSubmissionActions: Record<string, PostSubmissionAction>;
  dataSources: Record<string, DataSource<any>>;
  formSchemaTransformers: Record<string, FormSchemaTransformer>;
}

const registryCache: FormRegistryCache = {
  validators: {},
  controls: {},
  fieldValueAdapters: {},
  postSubmissionActions: {},
  dataSources: {},
  formSchemaTransformers: {},
};

// Registers

export function registerControl(registration: CustomControlRegistration) {
  getFormsStore().controls.push(registration);
}

export function registerPostSubmissionAction(registration: ComponentRegistration<PostSubmissionAction>) {
  getFormsStore().postSubmissionActions.push(registration);
}

export function registerFieldValueAdapter(registration: FieldValueAdapterRegistration) {
  getFormsStore().fieldValueAdapters.push(registration);
}

export function registerFieldValidator(registration: ComponentRegistration<FormFieldValidator>) {
  getFormsStore().fieldValidators.push(registration);
}

export function registerCustomDataSource(registration: ComponentRegistration<DataSource<any>>) {
  getFormsStore().dataSources.push(registration);
}

export function registerExpressionHelper(name: string, fn: Function) {
  getFormsStore().expressionHelpers[name] = fn;
}

export function registerFormSchemaTransformers(registration: ComponentRegistration<FormSchemaTransformer>) {
  const store = getFormsStore();
  const existingIndex = store.formSchemaTransformers.findIndex((reg) => reg.name === registration.name);

  if (existingIndex !== -1) {
    // If registration with the same name exists, override it
    store.formSchemaTransformers[existingIndex] = registration;
  } else {
    store.formSchemaTransformers.push(registration);
  }
}

// Getters

/**
 * A convenience function that returns the appropriate control for a given rendering type.
 */
export async function getRegisteredControl(renderType: string) {
  if (registryCache.controls[renderType]) {
    return registryCache.controls[renderType];
  }
  let component = inbuiltControls.find(
    (control) => control.name === renderType || control?.alias === renderType,
  )?.component;
  // if undefined, try searching through the registered custom controls
  if (!component) {
    const importedControl = await getFormsStore()
      .controls.find((control) => control.name === renderType || control?.alias === renderType)
      ?.load?.();
    component = importedControl?.default;
  }
  registryCache.controls[renderType] = component;
  return component;
}

/**
 * Retrieves the appropriate field control for a question, considering missing concepts.
 * If the question is of type 'obs' and has a missing concept, it falls back to a disabled text input.
 * Otherwise, it retrieves the registered control based on the rendering specified in the question.
 * @param question - The FormField representing the question.
 * @returns The field control to be used for rendering the question.
 */
export function getFieldControlWithFallback(question: FormField) {
  // Check if the question has a missing concept
  if (hasMissingConcept(question)) {
    // If so, render a disabled text input
    question.disabled = true;
    question.isDisabled = true;
    return getRegisteredControl('text');
  }

  // Retrieve the registered control based on the specified rendering
  return getRegisteredControl(question.questionOptions.rendering);
}

export async function getRegisteredFieldValueAdapter(type: string): Promise<FormFieldValueAdapter> {
  if (registryCache.fieldValueAdapters[type]) {
    return registryCache.fieldValueAdapters[type];
  }
  let adapter = inbuiltFieldValueAdapters.find((adapter) => adapter.type === type)?.component;
  // if undefined, try searching through the registered custom handlers
  if (!adapter) {
    const adapterImport = await getFormsStore()
      .fieldValueAdapters.find((adapter) => adapter.type === type)
      ?.load?.();
    adapter = adapterImport?.default;
  }
  registryCache.fieldValueAdapters[type] = adapter;
  return adapter;
}

export async function getRegisteredFormSchemaTransformers(): Promise<FormSchemaTransformer[]> {
  const transformers = [];

  const cachedTransformers = registryCache.formSchemaTransformers;
  if (Object.keys(cachedTransformers).length) {
    return Object.values(cachedTransformers);
  }

  const formTransformersFromStore = getFormsStore().formSchemaTransformers || [];
  const customTransformers = await Promise.all(
    formTransformersFromStore.map(async (transformer) => {
      const transformerImport = await transformer.load?.();
      return transformerImport?.default;
    }),
  );
  transformers.push(...customTransformers.filter((transformer) => transformer !== undefined));

  transformers.push(...inbuiltFormTransformers.map((inbuiltTransformer) => inbuiltTransformer.component));

  transformers.forEach((transformer) => {
    const inbuiltTransformer = inbuiltFormTransformers.find((t) => t.component === transformer);
    registryCache.formSchemaTransformers[inbuiltTransformer.name] = transformer;
  });

  return transformers;
}

export async function getRegisteredPostSubmissionAction(actionId: string) {
  const cachedAction = registryCache.postSubmissionActions[actionId];
  if (cachedAction) {
    return cachedAction;
  }

  const inbuiltRegistration = inbuiltPostSubmissionActions.find((registration) => registration.name === actionId);

  if (inbuiltRegistration) {
    const lazy = inbuiltRegistration.load;
    const actionImport = await lazy();
    registryCache.postSubmissionActions[actionId] = actionImport.default;
    return actionImport.default;
  }

  const formsStoreRegistration = getFormsStore().postSubmissionActions.find(
    (registration) => registration.name === actionId,
  );

  if (formsStoreRegistration) {
    const lazy = formsStoreRegistration.load;
    const actionImport = await lazy();
    registryCache.postSubmissionActions[actionId] = actionImport.default;
    return actionImport.default;
  } else {
    console.error(`No loader found for PostSubmissionAction registration of id: ${actionId}`);
  }

  return null;
}

export async function getRegisteredValidator(name: string): Promise<FormFieldValidator> {
  if (registryCache.validators[name]) {
    return registryCache.validators[name];
  }
  let validator = inbuiltValidators.find((validator) => validator.name === name)?.component;
  if (!validator) {
    const validatorImport = await getFormsStore()
      .fieldValidators.find((validator) => validator.name === name)
      ?.load?.();
    validator = validatorImport?.default;
  }
  registryCache.validators[name] = validator;
  return validator;
}

export async function getRegisteredDataSource(name: string): Promise<DataSource<any>> {
  if (registryCache.dataSources[name]) {
    return registryCache.dataSources[name];
  }
  let ds = inbuiltDataSources.find((dataSource) => dataSource.name === name)?.component;
  if (!ds) {
    const template = getControlTemplate(name);
    if (template) {
      ds = inbuiltDataSources.find((dataSource) => dataSource.name === template.datasource.name)?.component;
    } else {
      const dataSourceImport = await getFormsStore()
        .dataSources.find((ds) => ds.name === name)
        ?.load?.();
      if (!dataSourceImport) {
        throw new Error('Datasource not found');
      }
      ds = dataSourceImport.default;
    }
  }
  registryCache.dataSources[name] = ds;
  return ds;
}

export function getRegisteredExpressionHelpers() {
  return getFormsStore().expressionHelpers;
}

function getFormsStore(): FormsRegistryStoreState {
  return getGlobalStore<FormsRegistryStoreState>(FormsStore, {
    controls: [],
    postSubmissionActions: [],
    expressionHelpers: {},
    fieldValidators: [],
    fieldValueAdapters: [],
    dataSources: [],
    formSchemaTransformers: [],
  }).getState();
}

function hasMissingConcept(question: FormField) {
  return (
    question.type == 'obs' && !question.questionOptions.concept && question.questionOptions.rendering !== 'fixed-value'
  );
}
