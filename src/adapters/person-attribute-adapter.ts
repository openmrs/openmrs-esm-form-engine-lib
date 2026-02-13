import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormFieldValueAdapter, type FormProcessorContextProps } from '../types';
import { clearSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const PersonAttributeAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    clearSubmission(field);
    if (field.meta.initialValue?.refinedValue === value || isEmpty(value)) {
      return null;
    }
    field.meta.submission.newValue = {
      value: value,
      attributeType: field.questionOptions.attributeType,
      uuid: (field.meta.initialValue?.omrsObject as OpenmrsResource)?.uuid,
    };
    return field.meta.submission.newValue;
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const latestAttribute = context.patient?.extension?.find(
      (ext) => ext.url === `http://fhir.openmrs.org/ext/person-attribute/${field.questionOptions.attributeType}`,
    );
    field.meta = {
      ...(field.meta || {}),
      initialValue: {
        omrsObject: latestAttribute as any,
        refinedValue: latestAttribute?.valueString || latestAttribute?.valueReference?.reference,
      },
    };
    return field.meta.initialValue.refinedValue;
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
