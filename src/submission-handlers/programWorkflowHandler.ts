import { type EncounterContext, type FormField, type OpenmrsEncounter, type SubmissionHandler } from '..';
import { getPatientProgram } from '../components/encounter/encounter-form-manager';

export const ProgramWorkflowHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    return value;
  },
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields: Array<FormField>,
    context: EncounterContext,
  ) => {
    let count = 0;
    console.log("==bet", context.patientPrograms)
    const programWorkflows = getPatientProgram(context.patientPrograms, context.programUuid);
    console.log("====field", field)
    console.log("====programWorkflows", programWorkflows)

    if(field.type == 'programWorkflow') {
      const workflowUuid = programWorkflows.shift()?.program.allWorkflows[count]?.uuid;
      count += 1;
      return workflowUuid;
    }
    console.log("====count", count)
    if(field.type == 'programState') {
      return programWorkflows[0]?.states?.find((state) => state.state.retired == false)?.state?.uuid;
    }
  },

  getDisplayValue: (field: FormField, value: any) => {
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    return null;
  },
};

