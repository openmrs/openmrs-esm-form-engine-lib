import { type OpenmrsResource } from '@openmrs/esm-framework';
import {
  type OpenmrsObs,
  type FormFieldValueAdapter,
  type FormProcessorContextProps,
  type OpenmrsEncounter,
  type FormField,
} from '../types';
import { type FormContextProps } from '../provider/form-provider';
import { gracefullySetSubmission } from '../utils/common-utils';
import { isEmpty } from '../validators/form-validator';
import { isTrue } from '../utils/boolean-utils';

export let assignedDiagnosesIds: string[] = [];

export const EncounterDiagnosisAdapter: FormFieldValueAdapter = {
  transformFieldValue: function (field: FormField, value: any, context: FormContextProps) {
    if (field.meta.initialValue?.omrsObject && isEmpty(value)) {
      return gracefullySetSubmission(field, undefined, voidDiagnosis(field.meta.initialValue.omrsObject as OpenmrsObs));
    }
    if (!isEmpty(value)) {
      const previousDiagnosis = field.meta.initialValue?.omrsObject as OpenmrsResource;
      if (hasPreviousDiagnosisValueChanged(previousDiagnosis, value)) {
        return gracefullySetSubmission(
          field,
          editDiagnosis(value, field, previousDiagnosis, context.patient.id),
          undefined,
        );
      }
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
      field.meta = {
        ...(field.meta || {}),
        initialValue: {
          omrsObject: matchedDiagnosis,
          refinedValue: matchedDiagnosis.diagnosis?.coded.uuid,
        },
      };
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

const constructNewDiagnosis = (value: string, field: FormField, patientUuid: string) => {
  if (!value) {
    return null;
  }
  return {
    patient: patientUuid,
    condition: null,
    diagnosis: {
      coded: value,
    },
    certainty: isTrue(field.questionOptions?.diagnosis?.isConfirmed) ? 'CONFIRMED' : 'PROVISIONAL',
    rank: field.questionOptions.diagnosis?.rank ?? 1, // rank 1 denotes a diagnosis is primary, else secondary
    formFieldPath: `rfe-forms-${field.id}`,
    formFieldNamespace: 'rfe-forms',
  };
};

function editDiagnosis(
  newEncounterDiagnosis: string,
  field: FormField,
  previousDiagnosis: OpenmrsResource,
  patientUuid: string,
) {
  return {
    patient: patientUuid,
    condition: null,
    diagnosis: {
      coded: newEncounterDiagnosis,
    },
    certainty: isTrue(field.questionOptions?.diagnosis?.isConfirmed) ? 'CONFIRMED' : 'PROVISIONAL',
    rank: field.questionOptions.diagnosis?.rank ?? 1, // rank 1 denotes a diagnosis is primary, else secondary
    formFieldPath: `rfe-forms-${field.id}`,
    formFieldNamespace: 'rfe-forms',
    uuid: previousDiagnosis.uuid,
  };
}

export function hasPreviousDiagnosisValueChanged(previousDiagnosis: OpenmrsResource, newValue: string) {
  if (isEmpty(previousDiagnosis)) {
    return false;
  }
  return previousDiagnosis.value !== newValue;
}

export function voidDiagnosis(diagnosis: OpenmrsResource) {
  return { uuid: diagnosis.uuid, voided: true };
}
