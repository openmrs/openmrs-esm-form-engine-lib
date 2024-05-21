import { clearSubmission } from '../utils/common-utils';
import { type EncounterContext, type FormField, type OpenmrsEncounter, type SubmissionHandler } from '..';
import isEmpty from 'lodash-es/isEmpty';
import dayjs from 'dayjs';

export const ProgramStateHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    clearSubmission(field);
    if (field.meta?.previousValue?.value === value || isEmpty(value)) {
      return null;
    }
    field.meta.submission.newValue = {
      state: value,
      startDate: dayjs().format(),
    };
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    const program = context.patientPrograms.find(
      (program) => program.program.uuid === field.questionOptions.programUuid,
    );
    if (program?.states?.length > 0) {
      return program.states
        .filter((state) => !state.endDate)
        .find((state) => state.state.programWorkflow?.uuid === field.questionOptions.workflowUuid)?.state?.uuid;
    }
    return null;
  },
  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    return null;
  },
};
