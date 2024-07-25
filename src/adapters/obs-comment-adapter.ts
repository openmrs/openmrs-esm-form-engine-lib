import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormFieldValueAdapter, type FormProcessorContextProps } from '../types';
import { hasSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const ObsCommentAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    const targetField = context.getFormField(field.meta.targetField);
    if (hasSubmission(targetField) && !isEmpty(value)) {
      targetField.meta.submission.newValue.comment = value;
    }
    return targetField;
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const encounter = sourceObject ?? context.domainObjectValue;
    if (encounter) {
      const targetFieldId = field.id.split('_obs_comment')[0];
      const targetField = context.formFields.find((field) => field.id === targetFieldId);
      return targetField?.meta.previousValue?.comment;
    }
    return null;
  },
  getPreviousValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const encounter = sourceObject ?? context.previousDomainObjectValue;
    if (encounter) {
      return this.getInitialValue(field, encounter, context);
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
