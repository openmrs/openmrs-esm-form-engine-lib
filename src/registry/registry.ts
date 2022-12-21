import { OHRIObsGroup } from '../components/group/ohri-obs-group.component';
import { OHRIContentSwitcher } from '../components/inputs/content-switcher/ohri-content-switcher.component';
import OHRIDate from '../components/inputs/date/ohri-date.component';
import { OHRIEncounterLocationPicker } from '../components/inputs/location/ohri-encounter-location.component';
import { OHRIMultiSelect } from '../components/inputs/multi-select/ohri-multi-select.component';
import OHRINumber from '../components/inputs/number/ohri-number.component';
import OHRIRadio from '../components/inputs/radio/ohri-radio.component';
import OHRIDropdown from '../components/inputs/select/ohri-dropdown.component';
import OHRITextArea from '../components/inputs/text-area/ohri-text-area.component';
import OHRIText from '../components/inputs/text/ohri-text.component';
import OHRIToggle from '../components/inputs/toggle/ohri-toggle.component';
import { OHRIRepeat } from '../components/repeat/ohri-repeat.component';
import { OHRIFieldValidator } from '../validators/ohri-form-validator';
import { EncounterLocationSubmissionHandler, ObsSubmissionHandler } from '../submission-handlers/base-handlers';
import { FieldValidator, PostSubmissionAction, SubmissionHandler } from '../api/types';
import OHRIFixedValue from '../components/inputs/fixed-value/ohri-fixed-value.component';
import OHRIMarkdown from '../components/inputs/markdown/ohri-markdown.component';
import { OHRIDateValidator } from '../validators/ohri-date-validator';
import { OHRIJSExpressionValidator } from '../validators/ohri-js-expression-validator';
import { getGlobalStore } from '@openmrs/esm-framework';
import { OHRIFormsStore } from '../constants';
import OHRIExtensionParcel from '../components/extension/ohri-extension-parcel.component';

export interface RegistryItem {
  id: string;
  component: any;
  type?: string;
}

export interface ComponentRegistration {
  id: string;
  load: () => Promise<any>;
}

export interface PostSubmissionActionRegistration extends ComponentRegistration {
  load: () => Promise<{ default: PostSubmissionAction }>;
}

export interface CustomControlRegistration extends Omit<ComponentRegistration, 'load'> {
  loadControl: () => Promise<any>;
  type: string;
}
interface ValidatorRegistryItem extends RegistryItem {
  component: FieldValidator;
}

export interface FormsRegistryStoreState {
  customControls: Array<CustomControlRegistration>;
  postSubmissionActions: Array<PostSubmissionActionRegistration>;
}

export const baseFieldComponents: Array<CustomControlRegistration> = [
  {
    id: 'OHRIText',
    loadControl: () => Promise.resolve({ default: OHRIText }),
    type: 'text',
  },
  {
    id: 'OHRIRadio',
    loadControl: () => Promise.resolve({ default: OHRIRadio }),
    type: 'radio',
  },
  {
    id: 'OHRIDate',
    loadControl: () => Promise.resolve({ default: OHRIDate }),
    type: 'date',
  },
  {
    id: 'OHRINumber',
    loadControl: () => Promise.resolve({ default: OHRINumber }),
    type: 'number',
  },
  {
    id: 'OHRIMultiSelect',
    loadControl: () => Promise.resolve({ default: OHRIMultiSelect }),
    type: 'checkbox',
  },
  {
    id: 'OHRIContentSwitcher',
    loadControl: () => Promise.resolve({ default: OHRIContentSwitcher }),
    type: 'content-switcher',
  },
  {
    id: 'OHRIEncounterLocationPicker',
    loadControl: () => Promise.resolve({ default: OHRIEncounterLocationPicker }),
    type: 'encounter-location',
  },
  {
    id: 'OHRIDropdown',
    loadControl: () => Promise.resolve({ default: OHRIDropdown }),
    type: 'select',
  },
  {
    id: 'OHRITextArea',
    loadControl: () => Promise.resolve({ default: OHRITextArea }),
    type: 'textarea',
  },
  {
    id: 'OHRIToggle',
    loadControl: () => Promise.resolve({ default: OHRIToggle }),
    type: 'toggle',
  },
  {
    id: 'OHRIObsGroup',
    loadControl: () => Promise.resolve({ default: OHRIObsGroup }),
    type: 'group',
  },
  {
    id: 'OHRIRepeat',
    loadControl: () => Promise.resolve({ default: OHRIRepeat }),
    type: 'repeating',
  },
  {
    id: 'OHRIFixedValue',
    loadControl: () => Promise.resolve({ default: OHRIFixedValue }),
    type: 'fixed-value',
  },
  {
    id: 'OHRIMarkdown',
    loadControl: () => Promise.resolve({ default: OHRIMarkdown }),
    type: 'markdown',
  },
  {
    id: 'OHRIExtensionParcel',
    loadControl: () => Promise.resolve({ default: OHRIExtensionParcel }),
    type: 'extension-widget',
  },
  {
    id: 'OHRIDateTime',
    loadControl: () => Promise.resolve({ default: OHRIDate }),
    type: 'datetime',
  },
];

const baseHandlers: Array<RegistryItem> = [
  {
    id: 'ObsSubmissionHandler',
    component: ObsSubmissionHandler,
    type: 'obs',
  },
  {
    id: 'ObsGroupHandler',
    component: ObsSubmissionHandler,
    type: 'obsGroup',
  },
  {
    id: 'EncounterLocationSubmissionHandler',
    component: EncounterLocationSubmissionHandler,
    type: 'encounterLocation',
  },
];

const fieldValidators: Array<ValidatorRegistryItem> = [
  {
    id: 'OHRIBaseValidator',
    component: OHRIFieldValidator,
  },
  {
    id: 'date',
    component: OHRIDateValidator,
  },
  {
    id: 'js_expression',
    component: OHRIJSExpressionValidator,
  },
];

export const getFieldComponent = renderType => {
  let lazy = baseFieldComponents.find(item => item.type == renderType)?.loadControl;
  if (!lazy) {
    lazy = getOHRIFormsStore().customControls.find(item => item.type == renderType)?.loadControl;
  }
  return lazy?.();
};

export function getHandler(type: string): SubmissionHandler {
  return baseHandlers.find(handler => handler.type == type)?.component;
}

export function addHandler(handler: RegistryItem) {
  baseHandlers.push(handler);
}

export function addvalidator(validator: ValidatorRegistryItem) {
  if (validator) {
    fieldValidators.push(validator);
  }
}

function getOHRIFormsStore(): FormsRegistryStoreState {
  return getGlobalStore<FormsRegistryStoreState>(OHRIFormsStore, {
    customControls: [],
    postSubmissionActions: [],
  }).getState();
}

export function getValidator(id: string): FieldValidator {
  return fieldValidators.find(validator => validator.id == id)?.component || fieldValidators[0].component;
}

export function registerControl(registration: CustomControlRegistration) {
  getOHRIFormsStore().customControls.push(registration);
}

export function registerPostSubmissionAction(registration: PostSubmissionActionRegistration) {
  getOHRIFormsStore().postSubmissionActions.push(registration);
}

export function getPostSubmissionActionById(actionId: string) {
  const lazy = getOHRIFormsStore().postSubmissionActions.find(registration => registration.id == actionId)?.load;
  if (lazy) {
    return lazy();
  } else {
    console.error(`No loader found for PostSubmissionAction registration of id: ${actionId}`);
  }
  return null;
}
