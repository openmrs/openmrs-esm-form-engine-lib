import {
  type FormField,
  type FormProcessorContextProps,
  type OpenmrsEncounter,
  type OpenmrsObs,
  type PatientIdentifier,
  type PatientProgram,
  type PatientProgramPayload,
} from '../../types';
import { saveAttachment, savePatientIdentifier, saveProgramEnrollment } from '../../api';
import { hasRendering, hasSubmission } from '../../utils/common-utils';
import dayjs from 'dayjs';
import { assignedObsIds, constructObs, voidObs } from '../../adapters/obs-adapter';
import { type FormContextProps } from '../../provider/form-provider';
import { ConceptTrue } from '../../constants';
import { DefaultValueValidator } from '../../validators/default-value-validator';
import { cloneRepeatField } from '../../components/repeat/helpers';
import { assignedOrderIds } from '../../adapters/orders-adapter';
import { type OpenmrsResource } from '@openmrs/esm-framework';

export function prepareEncounter(
  context: FormContextProps,
  encounterDate: Date,
  encounterRole: string,
  encounterProvider: string,
  location: string,
) {
  const { patient, formJson, domainObjectValue: encounter, formFields, visit } = context;
  const obsForSubmission = [];
  prepareObs(obsForSubmission, formFields);
  const ordersForSubmission = prepareOrders(formFields);
  let encounterForSubmission: OpenmrsEncounter = {};

  if (encounter) {
    Object.assign(encounterForSubmission, encounter);
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
    }
    // TODO: Question: Should we be editing the location, form and visit here?
    encounterForSubmission.encounterDatetime = encounterDate;
    encounterForSubmission.location = location;
    encounterForSubmission.form = {
      uuid: formJson.uuid,
    };
    if (visit) {
      encounterForSubmission.visit = visit.uuid;
    }
    encounterForSubmission.obs = obsForSubmission;
    encounterForSubmission.orders = ordersForSubmission;
  } else {
    encounterForSubmission = {
      patient: patient.id,
      encounterDatetime: encounterDate,
      location: location,
      encounterType: formJson.encounterType,
      encounterProviders: [
        {
          provider: encounterProvider,
          encounterRole,
        },
      ],
      obs: obsForSubmission,
      form: {
        uuid: formJson.uuid,
      },
      visit: visit?.uuid,
      orders: ordersForSubmission,
    };
  }
  return encounterForSubmission;
}

export function preparePatientIdentifiers(fields: FormField[], encounterLocation: string): PatientIdentifier[] {
  return fields
    .filter((field) => field.type === 'patientIdentifier' && hasSubmission(field))
    .map((field) => field.meta.submission.newValue);
}

export function savePatientIdentifiers(patient: fhir.Patient, identifiers: PatientIdentifier[]) {
  return identifiers.map((patientIdentifier) => {
    return savePatientIdentifier(patientIdentifier, patient.id);
  });
}

export function preparePatientPrograms(
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

export function savePatientPrograms(patientPrograms: PatientProgramPayload[]) {
  const ac = new AbortController();
  return Promise.all(patientPrograms.map((programPayload) => saveProgramEnrollment(programPayload, ac)));
}

export function saveAttachments(fields: FormField[], encounter: OpenmrsEncounter, abortController: AbortController) {
  const complexFields = fields?.filter((field) => field?.questionOptions.rendering === 'file' && hasSubmission(field));

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

export function getMutableSessionProps(context: FormContextProps) {
  const {
    formFields,
    location,
    currentProvider,
    sessionDate,
    customDependencies,
    domainObjectValue: encounter,
  } = context;
  const { defaultEncounterRole } = customDependencies;
  const encounterRole =
    formFields.find((field) => field.type === 'encounterRole')?.meta.submission?.newValue || defaultEncounterRole?.uuid;
  const encounterProvider =
    formFields.find((field) => field.type === 'encounterProvider')?.meta.submission?.newValue || currentProvider.uuid;
  const encounterDate =
    formFields.find((field) => field.type === 'encounterDatetime')?.meta.submission?.newValue ||
    encounter?.encounterDatetime ||
    sessionDate;
  const encounterLocation =
    formFields.find((field) => field.type === 'encounterLocation')?.meta.submission?.newValue ||
    encounter?.location?.uuid ||
    location.uuid;
  return {
    encounterRole: encounterRole as string,
    encounterProvider: encounterProvider as string,
    encounterDate: encounterDate as Date,
    encounterLocation: encounterLocation as string,
  };
}

// Helpers

function prepareObs(obsForSubmission: OpenmrsObs[], fields: FormField[]) {
  fields.filter((field) => hasSubmittableObs(field)).forEach((field) => processObsField(obsForSubmission, field));
}

function processObsField(obsForSubmission: OpenmrsObs[], field: FormField) {
  if ((field.isHidden || field.isParentHidden) && field.meta.initialValue.omrsObject) {
    const valuesArray = Array.isArray(field.meta.initialValue.omrsObject)
      ? field.meta.initialValue.omrsObject
      : [field.meta.initialValue.omrsObject];
    addObsToList(
      obsForSubmission,
      valuesArray.map((obs) => voidObs(obs)),
    );
    return;
  }

  if (field.type === 'obsGroup') {
    processObsGroup(obsForSubmission, field);
  } else if (hasSubmission(field)) {
    // For non-group obs with a submission
    addObsToList(obsForSubmission, field.meta.submission.newValue);
    addObsToList(obsForSubmission, field.meta.submission.voidedValue);
  }
}

function processObsGroup(obsForSubmission: OpenmrsObs[], groupField: FormField) {
  if (groupField.meta.submission?.voidedValue) {
    addObsToList(obsForSubmission, groupField.meta.submission.voidedValue);
    return;
  }

  const obsGroup = constructObs(groupField, null);
  if (groupField.meta.initialValue?.omrsObject) {
    obsGroup.uuid = (groupField.meta.initialValue.omrsObject as OpenmrsResource).uuid;
  }

  groupField.questions.forEach((nestedField) => {
    if (nestedField.type === 'obsGroup') {
      const nestedObsGroup: OpenmrsObs[] = [];
      processObsGroup(nestedObsGroup, nestedField);
      addObsToList(obsGroup.groupMembers, nestedObsGroup);
    } else if (hasSubmission(nestedField)) {
      addObsToList(obsGroup.groupMembers, nestedField.meta.submission.newValue);
      addObsToList(obsGroup.groupMembers, nestedField.meta.submission.voidedValue);
    }
  });

  if (obsGroup.groupMembers?.length || obsGroup.voided) {
    addObsToList(obsForSubmission, obsGroup);
  }
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

  if (isTransient || !['obs', 'obsGroup'].includes(type) || hasRendering(field, 'file') || field.meta.groupId) {
    return false;
  }
  if ((field.isHidden || field.isParentHidden) && field.meta.initialValue?.omrsObject) {
    return true;
  }
  return !field.isHidden && !field.isParentHidden && (type === 'obsGroup' || hasSubmission(field));
}

export function inferInitialValueFromDefaultFieldValue(field: FormField) {
  if (field.questionOptions.rendering == 'toggle' && typeof field.questionOptions.defaultValue != 'boolean') {
    return field.questionOptions.defaultValue == ConceptTrue;
  }
  // validate default value
  if (!DefaultValueValidator.validate(field, field.questionOptions.defaultValue).length) {
    return field.questionOptions.defaultValue;
  }
}

export async function hydrateRepeatField(
  field: FormField,
  encounter: OpenmrsEncounter,
  initialValues: Record<string, any>,
  context: FormProcessorContextProps,
): Promise<FormField[]> {
  let counter = 1;
  const { formFieldAdapters } = context;
  const unMappedGroups = encounter.obs.filter(
    (obs) =>
      obs.concept.uuid === field.questionOptions.concept &&
      obs.uuid != (field.meta.initialValue?.omrsObject as OpenmrsResource)?.uuid &&
      !assignedObsIds.includes(obs.uuid),
  );
  const unMappedOrders = encounter.orders.filter((order) => {
    const availableOrderables = field.questionOptions.answers?.map((answer) => answer.concept) || [];
    return availableOrderables.includes(order.concept?.uuid) && !assignedOrderIds.includes(order.uuid);
  });
  if (field.type === 'testOrder') {
    return Promise.all(
      unMappedOrders
        .filter((order) => !order.voided)
        .map(async (order) => {
          const clone = cloneRepeatField(field, order, counter++);
          initialValues[clone.id] = await formFieldAdapters[field.type].getInitialValue(
            clone,
            { orders: [order] } as any,
            context,
          );
          return clone;
        }),
    );
  }
  // handle obs groups
  return Promise.all(
    unMappedGroups.map(async (group) => {
      const clone = cloneRepeatField(field, group, counter++);
      await Promise.all(
        clone.questions.map(async (childField) => {
          initialValues[childField.id] = await formFieldAdapters[field.type].getInitialValue(
            childField,
            { obs: [group] } as any,
            context,
          );
        }),
      );
      assignedObsIds.push(group.uuid);
      return [clone, ...clone.questions];
    }),
  ).then((results) => results.flat());
}
