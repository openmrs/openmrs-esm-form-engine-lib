import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormField, type OpenmrsEncounter, type OpenmrsObs, type PatientIdentifier } from '../../types';
import { isEmpty } from '../../validators/form-validator';
import { type EncounterContext } from '../../form-context';
import { saveAttachment, saveEncounter, savePatientIdentifier } from '../../api/api';
import { hasSubmission } from '../../utils/common-utils';

export class EncounterFormManager {
  static preparePatientIdentifiers(fields: FormField[], encounterLocation: string): PatientIdentifier[] {
    const patientIdentifierFields = fields.filter((field) => field.type === 'patientIdentifier');
    return patientIdentifierFields.map((field) => ({
      identifier: field.value,
      identifierType: field.questionOptions.identifierType,
      location: encounterLocation,
    }));
  }

  static prepareEncounter(
    allFields: FormField[],
    encounterContext: EncounterContext,
    obsGroupsToVoid: OpenmrsObs[],
    encounterRole: OpenmrsResource,
    visit: OpenmrsResource,
    encounterType: string,
    formUuid: string,
  ) {
    const { patient, encounter, encounterDate, encounterProvider, location } = encounterContext;
    const obsForSubmission = [];
    prepareObs(obsForSubmission, obsGroupsToVoid, allFields, patient, encounterDate, location);
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
            encounterRole: encounterRole?.uuid,
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
            encounterRole: encounterRole?.uuid,
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

  static saveEncounter(encounter: OpenmrsEncounter, abortController: AbortController) {
    return saveEncounter(abortController, encounter, encounter?.uuid);
  }

  static saveAttachments(fields: FormField[], encounter: OpenmrsEncounter, abortController: AbortController) {
    const fileFields = fields?.filter((field) => field?.questionOptions.rendering === 'file');
    return fileFields.map((field) => {
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
      const identifier = getPatientLatestIdentifier(patient, patientIdentifier.identifierType);
      if (identifier) {
        patientIdentifier.uuid = identifier.id;
      }
      return savePatientIdentifier(patientIdentifier, patient.id);
    });
  }
}

// Helpers

function prepareObs(
  obsForSubmission: OpenmrsObs[],
  obsGroupsToVoid: OpenmrsObs[],
  fields: FormField[],
  patient: fhir.Patient,
  encounterDate: Date,
  encounterLocation: any,
) {
  fields
    .filter((field) => field.value || field.type == 'obsGroup') // filter out fields with empty values except groups
    .filter((field) => !field.isParentHidden && !field.isHidden && (field.type == 'obs' || field.type == 'obsGroup'))
    .filter((field) => !field['groupId']) // filter out grouped obs
    .filter((field) => !field.questionOptions.isTransient && field.questionOptions.rendering !== 'file')
    .forEach((field) => {
      if (field.type == 'obsGroup') {
        const obsGroup = {
          person: patient?.id,
          obsDatetime: encounterDate,
          concept: field.questionOptions.concept,
          location: encounterLocation,
          order: null,
          groupMembers: [],
          uuid: field.uuid,
          voided: false,
        } as any as OpenmrsObs;

        let hasValue = false;
        field.questions.forEach((groupedField) => {
          if (groupedField.value) {
            hasValue = true;
            if (Array.isArray(groupedField.value)) {
              obsGroup.groupMembers.push(...groupedField.value);
            } else {
              obsGroup.groupMembers.push(groupedField.value);
            }
          }
        });
        hasValue && cleanupAndAddObsToList(obsForSubmission, obsGroup);
      } else {
        cleanupAndAddObsToList(obsForSubmission, field.value);
      }
    });
  obsGroupsToVoid.forEach((obs) => cleanupAndAddObsToList(obsForSubmission, obs));
}

function prepareOrders(fields: FormField[]) {
  return fields
    .filter((field) => field.type === 'testOrder' && hasSubmission(field))
    .flatMap((field) => [field.meta.submission.newValue, field.meta.submission.voidedValue])
    .filter((o) => o);
}

function cleanupAndAddObsToList(obsList: Array<Partial<OpenmrsObs>>, obs: Partial<OpenmrsObs>) {
  if (Array.isArray(obs)) {
    obs.forEach((o) => {
      if (isEmpty(o.groupMembers)) {
        delete o.groupMembers;
      } else {
        o.groupMembers.forEach((obsChild) => {
          if (isEmpty(obsChild.groupMembers)) {
            delete obsChild.groupMembers;
          }
        });
      }
      obsList.push(o);
    });
  } else {
    if (isEmpty(obs.groupMembers)) {
      delete obs.groupMembers;
    } else {
      obs.groupMembers.forEach((obsChild) => {
        if (isEmpty(obsChild.groupMembers)) {
          delete obsChild.groupMembers;
        }
      });
    }
    obsList.push(obs);
  }
}

export function getPatientLatestIdentifier(patient: fhir.Patient, identifierType: string) {
  const patientIdentifiers = patient.identifier;
  return patientIdentifiers.find((identifier) => {
    if (identifier.type.coding && identifier.type.coding[0].code === identifierType) {
      return true;
    }
    return false;
  });
}
