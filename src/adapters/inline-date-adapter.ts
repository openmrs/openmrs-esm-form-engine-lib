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
        // clear submission
        targetField.meta.submission.newValue = null;
      } else {
        targetField.meta.submission.newValue.obsDatetime = dateString;
      }
    } else if (!hasSubmission(targetField) && targetField.meta.initialValue?.omrsObject) {
      if (isEmpty(value) && isEmpty((targetField.meta.initialValue.omrsObject as OpenmrsResource)?.obsDatetime)) {
        return null;
      }
      // generate submission
      const newSubmission = editObs(targetField, targetFieldCurrentValue);
      targetField.meta.submission = {
        newValue: {
          ...newSubmission,
          obsDatetime: dateString,
        },
      };
    }
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const encounter = sourceObject ?? context.domainObjectValue;
    if (encounter) {
      const targetFieldId = field.id.split('_inline_date')[0];
      const targetField = context.formFields.find((field) => field.id === targetFieldId);
      const targetFieldInitialObs = targetField?.meta.initialValue?.omrsObject as OpenmrsResource;
      if (targetFieldInitialObs?.obsDatetime) {
        return parseDate(targetFieldInitialObs.obsDatetime);
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
