import { formatDate, type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import {
  type FormField,
  type FormProcessorContextProps,
  type FormFieldValueAdapter,
  type ValueAndDisplay,
} from '../types';
import { gracefullySetSubmission } from '../utils/common-utils';

export const EncounterDatetimeAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    gracefullySetSubmission(field, value, null);
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    return sourceObject?.encounterDatetime ? new Date(sourceObject.encounterDatetime) : context.sessionDate;
  },
  getPreviousValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): ValueAndDisplay {
    if (sourceObject?.encounterDatetime) {
      const date = new Date(sourceObject.encounterDatetime);
      return {
        value: date,
        display: this.getDisplayValue(field, date),
      };
    }
    return null;
  },
  getDisplayValue: function (field: FormField, value: Date) {
    return formatDate(value);
  },
  tearDown: function (): void {
    return;
  },
};
