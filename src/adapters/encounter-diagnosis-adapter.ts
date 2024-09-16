import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type DiagnosisPayload, type FormFieldValueAdapter, type FormProcessorContextProps } from '../types';
import { type FormContextProps } from '../provider/form-provider';
import { type OpenmrsEncounter, type FormField } from '../types';
import { clearSubmission, gracefullySetSubmission } from '../utils/common-utils';

export let assignedDiagnosesIds: string[] = [];

export const EncounterDiagnosisAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    if (context.sessionMode == 'edit' && field.meta?.previousValue?.uuid) {
      return editDiagnosis(value, field, context.patient.id);
    }
    const newValue = constructNewDiagnosis(value, field, context.patient.id);
    gracefullySetSubmission(field, newValue, null);
    return newValue;
  },
  getInitialValue: function (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ): Promise<any> {
    const encounter = sourceObject ?? (context.domainObjectValue as OpenmrsEncounter);
    const matchedDiagnosis = encounter.diagnoses.find(
      (diagnosis) => diagnosis.formFieldPath === `rfe-forms-${field.id}`,
    );

    if (matchedDiagnosis) {
      field.meta = { ...(field.meta || {}), previousValue: matchedDiagnosis };
      if (!assignedDiagnosesIds.includes(matchedDiagnosis.diagnosis?.coded?.uuid)) {
        assignedDiagnosesIds.push(matchedDiagnosis.diagnosis?.coded?.uuid);
      }
      return matchedDiagnosis.diagnosis?.coded.uuid;
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
  getDisplayValue: (field: FormField, value: any) => {
    return field.questionOptions.answers?.find((option) => option.concept == value)?.label || value;
  },
  tearDown: function (): void {
    assignedDiagnosesIds = [];
  },
};

const constructNewDiagnosis = (value: any, field: FormField, patientUuid: string, uuid?: string) => {
  if (!value) {
    return null;
  }
  const diagnosis: DiagnosisPayload = {
    patient: patientUuid,
    condition: null,
    diagnosis: {
      coded: value,
    },
    certainty: field.questionOptions?.diagnosis?.isConfirmed ? 'CONFIRMED' : 'PROVISIONAL',
    rank: field.questionOptions.diagnosis?.rank ?? 1, // rank 1 denotes a diagnosis is primary, else secondary
    formFieldPath: `rfe-forms-${field.id}`,
    formFieldNamespace: 'rfe-forms',
  };

  if (uuid && uuid.trim() !== '') {
    diagnosis.uuid = uuid;
  }

  return diagnosis;
};

function editDiagnosis(newEncounterDiagnosis: any, field: FormField, patientUuid: string) {
  if (newEncounterDiagnosis === field.meta.previousValue?.diagnosis?.coded?.uuid && !field.meta.repeat?.wasDeleted) {
    clearSubmission(field);
    return null;
  }

  //the field has been deleted
  if (field.meta.repeat?.wasDeleted) {
    const voided = {
      uuid: field.meta.previousValue?.uuid,
      voided: true,
    };
    gracefullySetSubmission(field, constructNewDiagnosis(newEncounterDiagnosis, field, null), voided);
    return field.meta.submission.newValue || null;
  } else {
    const oldDiagnosis = field.meta.initialValue?.omrsObject as OpenmrsResource;
    const newValue = constructNewDiagnosis(newEncounterDiagnosis, field, patientUuid, oldDiagnosis.uuid);
    gracefullySetSubmission(field, newValue, null);
    return newValue;
  }
}
