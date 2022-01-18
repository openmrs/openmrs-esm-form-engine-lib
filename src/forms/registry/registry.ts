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
import { FieldValidator, SubmissionHandler } from '../types';
import OHRIFixedValue from '../components/inputs/fixed-value/ohri-fixed-value.component';
import OHRIMarkdown from '../components/inputs/markdown/ohri-markdown.component';

const baseFieldComponents: Array<RegistryItem> = [
  {
    id: 'OHRIText',
    component: OHRIText,
    type: 'text',
  },
  {
    id: 'OHRIRadio',
    component: OHRIRadio,
    type: 'radio',
  },
  {
    id: 'OHRIDate',
    component: OHRIDate,
    type: 'date',
  },
  {
    id: 'OHRINumber',
    component: OHRINumber,
    type: 'number',
  },
  {
    id: 'OHRIMultiSelect',
    component: OHRIMultiSelect,
    type: 'checkbox',
  },
  {
    id: 'OHRIContentSwitcher',
    component: OHRIContentSwitcher,
    type: 'content-switcher',
  },
  {
    id: 'OHRIEncounterLocationPicker',
    component: OHRIEncounterLocationPicker,
    type: 'encounter-location',
  },
  {
    id: 'OHRIDropdown',
    component: OHRIDropdown,
    type: 'select',
  },
  {
    id: 'OHRITextArea',
    component: OHRITextArea,
    type: 'textarea',
  },
  {
    id: 'OHRIToggle',
    component: OHRIToggle,
    type: 'toggle',
  },
  {
    id: 'OHRIObsGroup',
    component: OHRIObsGroup,
    type: 'group',
  },
  {
    id: 'OHRIRepeat',
    component: OHRIRepeat,
    type: 'repeating',
  },
  {
    id: 'OHRIFixedValue',
    component: OHRIFixedValue,
    type: 'fixed-value',
  },
  {
    id: 'OHRIMarkdown',
    component: OHRIMarkdown,
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
    id: 'OHRIFieldValidator',
    component: OHRIFieldValidator,
  },
];

export const getFieldComponent = renderType => {
  return baseFieldComponents.find(item => item.type == renderType)?.component;
};

export function getHandler(type: string): SubmissionHandler {
  return baseHandlers.find(handler => handler.type == type)?.component;
}

export function addHandler(handler: RegistryItem) {
  baseHandlers.push(handler);
}

export function addFieldComponent(fieldComponent: RegistryItem) {
  baseFieldComponents.push(fieldComponent);
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

interface ValidatorRegistryItem extends RegistryItem {
  component: FieldValidator;
}
