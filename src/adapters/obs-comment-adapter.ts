import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormFieldValueAdapter, type FormProcessorContextProps } from '../types';
import { hasSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';
import { editObs, hasPreviousObsValueChanged } from './obs-adapter';

export const ObsCommentAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    const targetField = context.getFormField(field.meta.targetField);
    const targetFieldCurrentValue = context.methods.getValues(targetField.id);
    const targetFieldInitialObs = targetField.meta.initialValue?.omrsObject as OpenmrsResource;

    if (targetField.meta.submission?.newValue) {
      if (isEmpty(value) && !isNewSubmissionEffective(targetField, targetFieldCurrentValue)) {
        // clear submission
        targetField.meta.submission.newValue = null;
      } else {
        targetField.meta.submission.newValue.comment = value;
      }
    } else if (!hasSubmission(targetField) && targetFieldInitialObs) {
      if (isEmpty(value) && isEmpty(targetFieldInitialObs.comment)) {
        return null;
      }
      // generate submission
      const newSubmission = editObs(targetField, targetFieldCurrentValue);
      targetField.meta.submission = {
        newValue: {
          ...newSubmission,
          comment: value,
        },
      };
    }
    return null;
  },
  getInitialValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    const encounter = sourceObject ?? context.domainObjectValue;
    if (encounter) {
      const targetFieldId = field.id.split('_obs_comment')[0];
      const targetField = context.formFields.find((field) => field.id === targetFieldId);
      return (targetField?.meta.initialValue.omrsObject as OpenmrsResource)?.comment;
    }
    return null;
  },
  getPreviousValue: function (field: FormField, sourceObject: OpenmrsResource, context: FormProcessorContextProps) {
    return null;
  },
  getDisplayValue: function (field: FormField, value: string) {
    return value;
  },
  tearDown: function (): void {
    return;
  },
};

export function isNewSubmissionEffective(targetField: FormField, targetFieldCurrentValue: any) {
  return (
    hasPreviousObsValueChanged(targetField, targetFieldCurrentValue) ||
    !isEmpty(targetField.meta.submission.newValue.obsDatetime)
  );
}
