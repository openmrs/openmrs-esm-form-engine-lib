import { clearSubmission } from '../utils/common-utils';
import { type EncounterContext, type FormField, type OpenmrsEncounter, type SubmissionHandler } from '..';
import { getPatientProgram } from '../components/encounter/encounter-form-manager';
import isEmpty from 'lodash-es/isEmpty';
import dayjs from 'dayjs';

export const ProgramStateHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    clearSubmission(field);
    if (field.meta?.previousValue?.value === value || isEmpty(value)) {
      return null;
    }
    const formattedvalue = (field.meta.submission.newValue = {
      state: value,
      startDate: dayjs(context.encounterDate).format(),
    });
    return formattedvalue;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    const programWorkflows = getPatientProgram(context.patientPrograms, field.questionOptions.programUuid);

    if (programWorkflows?.states?.length > 0) {
      return programWorkflows.states.find(
        (state) => state.state.programWorkflow?.uuid == field.questionOptions.workFlowUuid,
      ).state.uuid;
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
