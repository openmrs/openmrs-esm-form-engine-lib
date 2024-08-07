import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormProcessorContextProps, type FormFieldValueAdapter } from '../types';

export const ControlAdapter: FormFieldValueAdapter = {
  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    return null;
  },
  getInitialValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): Promise<any> {
    return null;
  },
  getPreviousValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): Promise<any> {
    return null;
  },
  tearDown: function (): void {
    return;
  },
};
