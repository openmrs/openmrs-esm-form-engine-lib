import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import {
  type ValueAndDisplay,
  type FormField,
  type FormFieldValueAdapter,
  type FormProcessorContextProps,
} from '../types';
import { gracefullySetSubmission } from '../utils/common-utils';

export const EncounterRoleAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    gracefullySetSubmission(field, value, null);
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const encounter = sourceObject ?? context.domainObjectValue;
    if (encounter) {
      return getLatestEncounterRole(encounter)?.uuid;
    }
    return context.customDependencies.defaultEncounterRole.uuid;
  },
  getPreviousValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): ValueAndDisplay {
    const encounter = sourceObject ?? context.previousDomainObjectValue;
    if (encounter) {
      const role = getLatestEncounterRole(encounter);
      return {
        value: role?.uuid,
        display: role?.name,
      };
    }
    return null;
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

function getLatestEncounterRole(encounter: OpenmrsResource) {
  if (encounter && encounter['encounterProviders']?.length) {
    const lastProviderIndex = encounter['encounterProviders'].length - 1;
    return encounter['encounterProviders'][lastProviderIndex].encounterRole;
  }
  return null;
}
