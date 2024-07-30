import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormProcessorContextProps, type FormFieldValueAdapter } from '../types';
import { gracefullySetSubmission } from '../utils/common-utils';

export const EncounterDatetimeAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    gracefullySetSubmission(field, value, null);
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    return sourceObject?.encounterDatetime ? new Date(sourceObject.encounterDatetime) : context.sessionDate;
  },
  getPreviousValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    if (sourceObject?.encounterDatetime) {
      return new Date(sourceObject.encounterDatetime);
    }
    return null;
  },
  getDisplayValue: function (field: FormField, value: any) {
    return value;
  },
  tearDown: function (): void {
    return;
  },
};
