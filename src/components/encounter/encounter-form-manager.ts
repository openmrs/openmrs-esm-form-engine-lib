import { type OpenmrsResource } from '@openmrs/esm-framework';
import {
  type PatientProgram,
  type FormField,
  type OpenmrsEncounter,
  type OpenmrsObs,
  type PatientIdentifier,
  type PersonAttribute,
  type PatientProgramPayload,
} from '../../types';
import { type EncounterContext } from '../../form-context';
import { saveAttachment, saveEncounter, savePatientIdentifier, saveProgramEnrollment, savePersonAttribute, } from '../../api/api';
import { hasRendering, hasSubmission } from '../../utils/common-utils';
import { voidObs, constructObs } from '../../submission-handlers/obsHandler';
import dayjs from 'dayjs';

export class EncounterFormManager {
  static preparePatientIdentifiers(fields: FormField[], encounterLocation: string): PatientIdentifier[] {
    return fields
      .filter((field) => field.type === 'patientIdentifier' && hasSubmission(field))
      .map((field) => field.meta.submission.newValue);
  }

  static prepareEncounter(
    allFields: FormField[],
    encounterContext: EncounterContext,
    visit: OpenmrsResource,
    encounterType: string,
    formUuid: string,
  ) {
    const { patient, encounter, encounterDate, encounterRole, encounterProvider, location } = encounterContext;
    const obsForSubmission = [];
    prepareObs(obsForSubmission, allFields);
    const ordersForSubmission = prepareOrders(allFields);
    let encounterForSubmission: OpenmrsEncounter = {};

    if (encounterContext.encounter) {
      Object.assign(encounterForSubmission, encounter);
      encounterForSubmission.location = location.uuid;
      // update encounter providers
      const hasCurrentProvider =
        encounterForSubmission.encounterProviders.findIndex(
          (encProvider) => encProvider.provider.uuid == encounterProvider,
        ) !== -1;
      if (!hasCurrentProvider) {
        encounterForSubmission.encounterProviders = [
          ...encounterForSubmission.encounterProviders,
          {
            provider: encounterProvider,
            encounterRole,
          },
        ];
        encounterForSubmission.form = {
          uuid: formUuid,
        };
        encounterForSubmission['visit'] = {
          uuid: visit?.uuid,
        };
      }
      encounterForSubmission.obs = obsForSubmission;
      encounterForSubmission.orders = ordersForSubmission;
    } else {
      encounterForSubmission = {
        patient: patient.id,
        encounterDatetime: encounterDate,
        location: location.uuid,
        encounterType: encounterType,
        encounterProviders: [
          {
            provider: encounterProvider,
            encounterRole,
          },
        ],
        obs: obsForSubmission,
        form: {
          uuid: formUuid,
        },
        visit: visit?.uuid,
        orders: ordersForSubmission,
      };
    }
    return encounterForSubmission;
  }

  static preparePersonAttributes(fields: FormField[], encounterLocation: string): PersonAttribute[] {
    return fields
      .filter((field) => field.type === 'personAttribute' && hasSubmission(field))
      .map((field) => field.meta.submission.newValue);
  }

  static savePersonAttributes(person: fhir.Person, attributes: PersonAttribute[]) {
    return attributes.map((personAttribute) => {
      return savePersonAttribute(personAttribute, person.id);
    });
  }

  static saveEncounter(encounter: OpenmrsEncounter, abortController: AbortController) {
    return saveEncounter(abortController, encounter, encounter?.uuid);
  }

  static saveAttachments(fields: FormField[], encounter: OpenmrsEncounter, abortController: AbortController) {
    const complexFields = fields?.filter(
      (field) => field?.questionOptions.rendering === 'file' && hasSubmission(field),
    );

    if (!complexFields?.length) return [];

    return complexFields.map((field) => {
      const patientUuid = typeof encounter?.patient === 'string' ? encounter?.patient : encounter?.patient?.uuid;
      return saveAttachment(
        patientUuid,
        field,
        field?.questionOptions.concept,
        new Date().toISOString(),
        encounter?.uuid,
        abortController,
      );
    });
  }

  static savePatientIdentifiers(patient: fhir.Patient, identifiers: PatientIdentifier[]) {
    return identifiers.map((patientIdentifier) => {
      return savePatientIdentifier(patientIdentifier, patient.id);
    });
  }

  static preparePatientPrograms(
    fields: FormField[],
    patient: fhir.Patient,
    currentPatientPrograms: Array<PatientProgram>,
  ): Array<PatientProgramPayload> {
    const programStateFields = fields.filter((field) => field.type === 'programState' && hasSubmission(field));
    const programMap = new Map<string, PatientProgramPayload>();
    programStateFields.forEach((field) => {
      const programUuid = field.questionOptions.programUuid;
      const newState = field.meta.submission.newValue;
      const existingProgramEnrollment = currentPatientPrograms.find((program) => program.program.uuid === programUuid);

      if (existingProgramEnrollment) {
        if (programMap.has(programUuid)) {
          programMap.get(programUuid).states.push(newState);
        } else {
          programMap.set(programUuid, {
            uuid: existingProgramEnrollment.uuid,
            states: [newState],
          });
        }
      } else {
        if (programMap.has(programUuid)) {
          programMap.get(programUuid).states.push(newState);
        } else {
          programMap.set(programUuid, {
            patient: patient.id,
            program: programUuid,
            states: [newState],
            dateEnrolled: dayjs().format(),
          });
        }
      }
    });
    return Array.from(programMap.values());
  }

  static savePatientPrograms = (patientPrograms: PatientProgramPayload[]) => {
    const ac = new AbortController();
    return Promise.all(patientPrograms.map((programPayload) => saveProgramEnrollment(programPayload, ac)));
  };
}

// Helpers

function prepareObs(obsForSubmission: OpenmrsObs[], fields: FormField[]) {
  fields
    .filter((field) => hasSubmittableObs(field))
    .forEach((field) => {
      if ((field.isHidden || field.isParentHidden) && field.meta.previousValue) {
        const valuesArray = Array.isArray(field.meta.previousValue)
          ? field.meta.previousValue
          : [field.meta.previousValue];
        addObsToList(
          obsForSubmission,
          valuesArray.map((obs) => voidObs(obs)),
        );
        return;
      }
      if (field.type == 'obsGroup') {
        if (field.meta.submission?.voidedValue) {
          addObsToList(obsForSubmission, field.meta.submission.voidedValue);
          return;
        }
        const obsGroup = constructObs(field, null);
        if (field.meta.previousValue) {
          obsGroup.uuid = field.meta.previousValue.uuid;
        }
        field.questions.forEach((groupedField) => {
          if (hasSubmission(groupedField)) {
            addObsToList(obsGroup.groupMembers, groupedField.meta.submission.newValue);
            addObsToList(obsGroup.groupMembers, groupedField.meta.submission.voidedValue);
          }
        });
        if (obsGroup.groupMembers.length || obsGroup.voided) {
          addObsToList(obsForSubmission, obsGroup);
        }
      }
      if (hasSubmission(field)) {
        addObsToList(obsForSubmission, field.meta.submission.newValue);
        addObsToList(obsForSubmission, field.meta.submission.voidedValue);
      }
    });
}

function prepareOrders(fields: FormField[]) {
  return fields
    .filter((field) => field.type === 'testOrder' && hasSubmission(field))
    .flatMap((field) => [field.meta.submission.newValue, field.meta.submission.voidedValue])
    .filter((o) => o);
}

function addObsToList(obsList: Array<Partial<OpenmrsObs>>, obs: Partial<OpenmrsObs>) {
  if (!obs) {
    return;
  }
  if (Array.isArray(obs)) {
    obsList.push(...obs);
  } else {
    obsList.push(obs);
  }
}

function hasSubmittableObs(field: FormField) {
  const {
    questionOptions: { isTransient },
    type,
  } = field;

  if (isTransient || !['obs', 'obsGroup'].includes(type) || hasRendering(field, 'file') || field['groupId']) {
    return false;
  }
  if ((field.isHidden || field.isParentHidden) && field.meta.previousValue) {
    return true;
  }
  return !field.isHidden && !field.isParentHidden && (type === 'obsGroup' || hasSubmission(field));
}
