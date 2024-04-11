import {
  DataSource,
  FieldValidator,
  FormSchemaTransformer,
  OHRIFormFieldProps,
  PostSubmissionAction,
  SubmissionHandler,
} from '../api/types';
import { getGlobalStore } from '@openmrs/esm-framework';
import { OHRIFormsStore } from '../constants';
import { inbuiltControls } from './inbuilt-components/inbuiltControls';
import { inbuiltFieldSubmissionHandlers } from './inbuilt-components/inbuiltFieldSubmissionHandlers';
import { inbuiltValidators } from './inbuilt-components/inbuiltValidators';
import { inbuiltDataSources } from './inbuilt-components/inbuiltDataSources';
import { getControlTemplate } from './inbuilt-components/control-templates';
import { inbuiltPostSubmissionActions } from './inbuilt-components/InbuiltPostSubmissionActions';
import { inbuiltFormTransformers } from './inbuilt-components/inbuiltTransformers';

/**
 * @internal
 */
export interface RegistryItem<T> {
  name: string;
  component: T;
  type?: string;
  alias?: string;
}

export interface ComponentRegistration<T> {
  name: string;
  load: () => Promise<{ default: T }>;
}

export interface CustomControlRegistration extends ComponentRegistration<React.ComponentType<OHRIFormFieldProps>> {
  type: string;
  alias?: string;
}

export interface FieldSubmissionHandlerRegistration extends ComponentRegistration<SubmissionHandler> {
  type: string;
}

export interface FormSchemaTransformerRegistration extends ComponentRegistration<FormSchemaTransformer> {}

export interface FormsRegistryStoreState {
  controls: CustomControlRegistration[];
  fieldValidators: ComponentRegistration<FieldValidator>[];
  fieldSubmissionHandlers: FieldSubmissionHandlerRegistration[];
  postSubmissionActions: ComponentRegistration<PostSubmissionAction>[];
  dataSources: ComponentRegistration<DataSource<any>>[];
  expressionHelpers: Record<string, Function>;
  formSchemaTransformers: FormSchemaTransformerRegistration[];
}

interface FormRegistryCache {
  validators: Record<string, FieldValidator>;
  controls: Record<string, React.ComponentType<OHRIFormFieldProps>>;
  fieldSubmissionHandlers: Record<string, SubmissionHandler>;
  postSubmissionActions: Record<string, PostSubmissionAction>;
  dataSources: Record<string, DataSource<any>>;
  formSchemaTransformers: Record<string, FormSchemaTransformer>;
}

const registryCache: FormRegistryCache = {
  validators: {},
  controls: {},
  fieldSubmissionHandlers: {},
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

export function registerFieldSubmissionHandler(registration: FieldSubmissionHandlerRegistration) {
  getFormsStore().fieldSubmissionHandlers.push(registration);
}

export function registerFieldValidator(registration: ComponentRegistration<FieldValidator>) {
  getFormsStore().fieldValidators.push(registration);
}

export function registerCustomDataSource(registration: ComponentRegistration<DataSource<any>>) {
  getFormsStore().dataSources.push(registration);
}

export function registerExpressionHelper(name: string, fn: Function) {
  getFormsStore().expressionHelpers[name] = fn;
}

export function registereformSchemaTransformers(registration: FormSchemaTransformerRegistration) {
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
 * A convinience function that returns the appropriate control for a given rendering type.
 */
export async function getRegisteredControl(renderType: string) {
  if (registryCache.controls[renderType]) {
    return registryCache.controls[renderType];
  }
  let component = inbuiltControls.find((item) => item.type === renderType || item?.alias === renderType)?.component;
  // if undefined, try serching through the registered custom controls
  if (!component) {
    const importedControl = await getFormsStore()
      .controls.find((item) => item.type === renderType || item?.alias === renderType)
      ?.load?.();
    component = importedControl?.default;
  }
  registryCache.controls[renderType] = component;
  return component;
}

/**
 * A convinience function that returns the appropriate submission handler for a given type.
 */
export async function getRegisteredFieldSubmissionHandler(type: string): Promise<SubmissionHandler> {
  if (registryCache.fieldSubmissionHandlers[type]) {
    return registryCache.fieldSubmissionHandlers[type];
  }
  let handler = inbuiltFieldSubmissionHandlers.find((handler) => handler.type === type)?.component;
  // if undefined, try serching through the registered custom handlers
  if (!handler) {
    const handlerImport = await getFormsStore()
      .fieldSubmissionHandlers.find((handler) => handler.type === type)
      ?.load?.();
    handler = handlerImport?.default;
  }
  registryCache.fieldSubmissionHandlers[type] = handler;
  return handler;
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

export async function getRegisteredValidator(name: string): Promise<FieldValidator> {
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
  return getGlobalStore<FormsRegistryStoreState>(OHRIFormsStore, {
    controls: [],
    postSubmissionActions: [],
    expressionHelpers: {},
    fieldValidators: [],
    fieldSubmissionHandlers: [],
    dataSources: [],
    formSchemaTransformers: [],
  }).getState();
}
