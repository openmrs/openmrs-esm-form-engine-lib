import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import {
  type ValueAndDisplay,
  type FormField,
  type FormFieldValueAdapter,
  type FormProcessorContextProps,
} from '../types';
import { gracefullySetSubmission } from '../utils/common-utils';

export const EncounterProviderAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    gracefullySetSubmission(field, value, null);
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const encounter = sourceObject ?? context.previousDomainObjectValue;
    return getLatestProvider(encounter)?.uuid;
  },
  getPreviousValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): ValueAndDisplay {
    const encounter = sourceObject ?? context.previousDomainObjectValue;
    const provider = getLatestProvider(encounter);
    return {
      value: provider?.uuid,
      display: provider?.name,
    };
  },
  getDisplayValue: function (field: FormField, value: any) {
    if (value?.display) {
      return value.display;
    }
    return value;
  },
  tearDown: function (): void {
    return;
  },
};

function getLatestProvider(encounter: OpenmrsResource) {
  if (encounter && encounter['encounterProviders']?.length) {
    const lastProviderIndex = encounter['encounterProviders'].length - 1;
    return encounter['encounterProviders'][lastProviderIndex].provider;
  }
  return null;
}
