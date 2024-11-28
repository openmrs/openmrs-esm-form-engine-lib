import { formatDate, parseDate, toOmrsIsoString, type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { isNewSubmissionEffective } from './obs-comment-adapter';
import { isEmpty } from '../validators/form-validator';
import { type FormField, type FormFieldValueAdapter, type FormProcessorContextProps } from '../types';
import { hasSubmission } from '../utils/common-utils';
import { editObs } from './obs-adapter';

export const InlineDateAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    const targetField = context.getFormField(field.meta.targetField);
    const targetFieldCurrentValue = context.methods.getValues(targetField.id);
    const dateString = value instanceof Date ? toOmrsIsoString(value) : value;

    if (targetField.meta.submission?.newValue) {
      if (isEmpty(dateString) && !isNewSubmissionEffective(targetField, targetFieldCurrentValue)) {
        // Clear submission if the new date is empty and no effective submission exists
        targetField.meta.submission.newValue = null;
      } else if (targetField.meta.submission.newValue.obsDatetime !== dateString) {
        // Only update obsDatetime if the new date differs from the current one
        targetField.meta.submission.newValue.obsDatetime = dateString;
      }
    } else if (!hasSubmission(targetField) && targetField.meta.previousValue) {
      if (isEmpty(value) && isEmpty(targetField.meta.previousValue.obsDatetime)) {
        return null; // Avoid submission if both new and previous dates are empty
      }
      if (targetField.meta.previousValue.obsDatetime !== dateString) {
        // Only create a new submission if the previous value is different from the new date
        const newSubmission = editObs(targetField, targetFieldCurrentValue);
        targetField.meta.submission = {
          newValue: {
            ...newSubmission,
            obsDatetime: dateString,
          },
        };
      }
    }
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const encounter = sourceObject ?? context.domainObjectValue;
    if (encounter) {
      const targetFieldId = field.id.split('_inline_date')[0];
      const targetField = context.formFields.find((field) => field.id === targetFieldId);
      if (targetField?.meta.previousValue?.obsDatetime) {
        return parseDate(targetField.meta.previousValue.obsDatetime);
      }
    }
    return null;
  },
  getPreviousValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    return null;
  },
  getDisplayValue: function (field: FormField, value: Date) {
    if (value) {
      return formatDate(value);
    }
    return null;
  },
  tearDown: function (): void {
    return;
  },
};
