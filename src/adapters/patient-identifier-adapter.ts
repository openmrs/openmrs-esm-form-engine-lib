import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormFieldValueAdapter, type FormProcessorContextProps } from '../types';
import { clearSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const PatientIdentifierAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    clearSubmission(field);
    if (field.meta.initialValue?.refinedValue === value || isEmpty(value)) {
      return null;
    }
    field.meta.submission.newValue = {
      identifier: value,
      identifierType: field.questionOptions.identifierType,
      uuid: (field.meta.initialValue?.omrsObject as OpenmrsResource)?.id,
      location: context.location,
    };
    return field.meta.submission.newValue;
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const latestIdentifier = context.patient?.identifier?.find(
      (identifier) => identifier.type?.coding[0]?.code === field.questionOptions.identifierType,
    );
    field.meta = {
      ...(field.meta || {}),
      initialValue: {
        omrsObject: latestIdentifier as any,
        refinedValue: latestIdentifier?.value,
      },
    };
    return latestIdentifier?.value;
  },
  getPreviousValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
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
