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
import { FieldValidator, SubmissionHandler } from '../api/types';
import OHRIFixedValue from '../components/inputs/fixed-value/ohri-fixed-value.component';
import OHRIMarkdown from '../components/inputs/markdown/ohri-markdown.component';
import { OHRIDateValidator } from '../validators/ohri-date-validator';
import { OHRIJSExpressionValidator } from '../validators/ohri-js-expression-validator';
import { getGlobalStore } from '@openmrs/esm-framework';
import { OHRIFormsTagLibraryStore } from '../constants';

export interface FormsRegistryStoreState {
  baseFieldComponents: Array<RegistryItem>;
  customControls: Array<RegistryItem>;
  baseHandlers: Array<RegistryItem>;
  fieldValidators: Array<ValidatorRegistryItem>;
}

export const baseFieldComponents: Array<ControlRegistryItem> = [
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
    const tagLib = getGlobalStore<Array<ControlRegistryItem>>(OHRIFormsTagLibraryStore, []).getState();
    lazy = tagLib.find(item => item.type == renderType)?.loadControl;
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

export function getValidator(id: string): FieldValidator {
  return fieldValidators.find(validator => validator.id == id)?.component || fieldValidators[0].component;
}

export interface RegistryItem {
  id: string;
  component: any;
  type?: string;
}

export interface ControlRegistryItem {
  id: string;
  loadControl: () => Promise<any>;
  type: string;
}
interface ValidatorRegistryItem extends RegistryItem {
  component: FieldValidator;
}
