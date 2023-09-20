import { DataSource, FieldValidator, OHRIFormFieldProps, PostSubmissionAction, SubmissionHandler } from '../api/types';
import { getGlobalStore } from '@openmrs/esm-framework';
import { OHRIFormsStore } from '../constants';
import { inbuiltControls } from './inbuilt-components/inbuiltControls';
import { inbuiltFieldSubmissionHandlers } from './inbuilt-components/inbuiltFieldSubmissionHandlers';
import { inbuiltValidators } from './inbuilt-components/inbuiltValidators';
import { inbuiltDataSources } from './inbuilt-components/inbuiltDataSources';

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

export interface FormsRegistryStoreState {
  controls: CustomControlRegistration[];
  fieldValidators: ComponentRegistration<FieldValidator>[];
  fieldSubmissionHandlers: FieldSubmissionHandlerRegistration[];
  postSubmissionActions: ComponentRegistration<PostSubmissionAction>[];
  dataSources: ComponentRegistration<DataSource<any>>[];
  expressionHelpers: Record<string, Function>;
}

interface FormRegistryCache {
  validators: Record<string, FieldValidator>;
  controls: Record<string, React.ComponentType<OHRIFormFieldProps>>;
  fieldSubmissionHandlers: Record<string, SubmissionHandler>;
  postSubmissionActions: Record<string, PostSubmissionAction>;
  dataSources: Record<string, DataSource<any>>;
}

const registryCache: FormRegistryCache = {
  validators: {},
  controls: {},
  fieldSubmissionHandlers: {},
  postSubmissionActions: {},
  dataSources: {},
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

// Getters

/**
 * A convinience function that returns the appropriate control for a given rendering type.
 */
export async function getRegisteredControl(renderType: string) {
  if (registryCache.controls[renderType]) {
    return registryCache.controls[renderType];
  }
  let component = inbuiltControls.find(item => item.type === renderType || item?.alias === renderType)?.component;
  // if undefined, try serching through the registered custom controls
  if (!component) {
    const importedControl = await getFormsStore()
      .controls.find(item => item.type === renderType || item?.alias === renderType)
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
  let handler = inbuiltFieldSubmissionHandlers.find(handler => handler.type === type)?.component;
  // if undefined, try serching through the registered custom handlers
  if (!handler) {
    const handlerImport = await getFormsStore()
      .fieldSubmissionHandlers.find(handler => handler.type === type)
      ?.load?.();
    handler = handlerImport?.default;
  }
  registryCache.fieldSubmissionHandlers[type] = handler;
  return handler;
}

export async function getRegisteredPostSubmissionAction(actionId: string) {
  if (registryCache.postSubmissionActions[actionId]) {
    return registryCache.postSubmissionActions[actionId];
  }
  const lazy = getFormsStore().postSubmissionActions.find(registration => registration.name === actionId)?.load;
  if (lazy) {
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
  let validator = inbuiltValidators.find(validator => validator.name === name)?.component;
  if (!validator) {
    const validatorImport = await getFormsStore()
      .fieldValidators.find(validator => validator.name === name)
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
  let ds = inbuiltDataSources.find(dataSource => dataSource.name === name)?.component;
  if (!ds) {
    const dataSourceImport = await getFormsStore()
      .dataSources.find(ds => ds.name === name)
      ?.load?.();
    ds = dataSourceImport.default;
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
  }).getState();
}
