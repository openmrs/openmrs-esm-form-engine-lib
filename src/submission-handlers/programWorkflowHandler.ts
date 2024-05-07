import { clearSubmission } from '../utils/common-utils';
import { type EncounterContext, type FormField, type OpenmrsEncounter, type SubmissionHandler } from '..';
import { getPatientProgram } from '../components/encounter/encounter-form-manager';
import isEmpty from 'lodash-es/isEmpty';
import dayjs from 'dayjs';

export const ProgramWorkflowHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    clearSubmission(field);
    if (field.meta?.previousValue?.value === value || isEmpty(value)) {
      return null;
    }
    field.meta.submission.newValue = {
      name: field.label,
      state: value,
      startDate: dayjs(context.encounterDate).format(),
    };
    return value;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    const programWorkflows = getPatientProgram(context.patientPrograms, context.programUuid);

    if (field.type == 'programWorkflow') {
      const workflowUuid = programWorkflows.shift()?.states.find((state) => state.state.name === field.label)?.state
        ?.programWorkflow?.uuid;
      return workflowUuid;
    }
    if (field.type == 'programState') {
      const programStateUuid = programWorkflows.shift()?.states?.find((state) => state.state.name === field.label && state.state.retired == false)?.state.uuid;
      return programStateUuid;
    }
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    return null;
  },
};
