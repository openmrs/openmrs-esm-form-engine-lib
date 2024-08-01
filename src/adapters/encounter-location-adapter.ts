import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import {
  type ValueAndDisplay,
  type FormField,
  type FormFieldValueAdapter,
  type FormProcessorContextProps,
} from '../types';
import { gracefullySetSubmission } from '../utils/common-utils';

export const EncounterLocationAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    gracefullySetSubmission(field, value, null);
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps): any {
    if (sourceObject && sourceObject['location']?.uuid) {
      return sourceObject['location'].uuid;
    }

    return context.location.uuid;
  },
  getPreviousValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): ValueAndDisplay {
    const encounter = sourceObject ?? context.previousDomainObjectValue;
    return {
      value: encounter?.location?.uuid,
      display: encounter?.location?.name,
    };
  },
  getDisplayValue: function (field: FormField, value: string) {
    return value;
  },
  tearDown: function (): void {
    return;
  },
};
