import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormFieldValueAdapter, type FormProcessorContextProps } from '..';
import { type FormContextProps } from '../provider/form-provider';
import { type OpenmrsEncounter, type FormField } from '../types';
import { clearSubmission, gracefullySetSubmission } from '../utils/common-utils';

export let assignedEncounterDiagnosisIds: string[] = [];

export const EncounterDiagnosisAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    if (context.sessionMode == 'edit' && field.meta?.previousValue?.uuid) {
      return editDiagnosis(value, field);
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
    const availableDiagnoses = sourceObject ?? (context.domainObjectValue as OpenmrsEncounter);
    const matchedDiagnosis = availableDiagnoses.diagnoses?.find(
      (diagnosis) => diagnosis.formFieldPath === `rfe-forms-${field.id}`,
    );
    if (matchedDiagnosis) {
      field.meta = { ...(field.meta || {}), previousValue: matchedDiagnosis };
      assignedEncounterDiagnosisIds.push(matchedDiagnosis.diagnosis?.coded?.uuid);

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
    assignedEncounterDiagnosisIds = [];
  },
};

const constructNewDiagnosis = (value: any, field: FormField, patientUuid: string) => {
  if (!value) {
    return null;
  }
  return {
    patient: patientUuid,
    condition: null,
    diagnosis: {
      coded: value,
    },
    certainty: 'CONFIRMED',
    rank: field.questionOptions.rank, // rank 1 denotes a diagnosis is primary, else secondary
    formFieldPath: `rfe-forms-${field.id}`,
    formFieldNamespace: 'rfe-forms',
  };
};

function editDiagnosis(newEncounterDiagnosis: any, field: FormField) {
  if (newEncounterDiagnosis === field.meta.previousValue?.concept?.uuid) {
    clearSubmission(field);
    return null;
  }
  const voided = {
    uuid: field.meta.previousValue?.uuid,
    voided: true,
  };
  gracefullySetSubmission(field, constructNewDiagnosis(newEncounterDiagnosis, field, null), voided);
  return field.meta.submission.newValue || null;
}
