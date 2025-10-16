import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormProcessorContextProps, type FormFieldValueAdapter } from '../types';
import dayjs from 'dayjs';
import { clearSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';

export const ProgramStateAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    clearSubmission(field);
    if ((field.meta?.initialValue?.omrsObject as OpenmrsResource)?.uuid === value || isEmpty(value)) {
      return null;
    }
    field.meta.submission.newValue = {
      state: value,
      startDate: dayjs().format(),
    };
  },
  getInitialValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): Promise<any> {
    const program = context.customDependencies.patientPrograms?.find(
      (program) => program.program.uuid === field.questionOptions.programUuid,
    );
    if (program?.states?.length > 0) {
      const currentState = program.states
        .filter((state) => !state.endDate)
        .find((state) => state.state.programWorkflow?.uuid === field.questionOptions.workflowUuid)?.state;
      field.meta = {
        ...(field.meta || {}),
        initialValue: {
          omrsObject: currentState,
        },
      };
      return currentState?.uuid;
    }
    return null;
  },
  getPreviousValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): Promise<any> {
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
