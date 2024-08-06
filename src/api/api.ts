import { fhirBaseUrl, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { encounterRepresentation } from '../constants';
import type { PersonAttribute, OpenmrsForm, PatientIdentifier, PatientProgramPayload } from '../types';
import { isUuid } from '../utils/boolean-utils';

export function saveEncounter(abortController: AbortController, payload, encounterUuid?: string) {
  const url = encounterUuid
    ? `${restBaseUrl}/encounter/${encounterUuid}?v=${encounterRepresentation}`
    : `${restBaseUrl}/encounter?v=${encounterRepresentation}`;

  return openmrsFetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: payload,
    signal: abortController.signal,
  });
}

export function saveAttachment(patientUuid, field, conceptUuid, date, encounterUUID, abortController) {
  const url = `${restBaseUrl}/attachment`;

  const content = field.meta.submission?.newValue?.value;
  const cameraUploadType = typeof content === 'string' && content?.split(';')[0].split(':')[1].split('/')[1];

  const formData = new FormData();
  const fileCaption = field.id;

  formData.append('fileCaption', fileCaption);
  formData.append('patient', patientUuid);

  if (typeof content === 'object') {
    formData.append('file', content);
  } else {
    formData.append('file', new File([''], `camera-upload.${cameraUploadType}`), `camera-upload.${cameraUploadType}`);
    formData.append('base64Content', content);
  }
  formData.append('encounter', encounterUUID);
  formData.append('obsDatetime', date);

  return openmrsFetch(url, {
    method: 'POST',
    signal: abortController.signal,
    body: formData,
  });
}

export function getAttachmentByUuid(patientUuid: string, encounterUuid: string, abortController: AbortController) {
  const attachmentUrl = `${restBaseUrl}/attachment`;
  return openmrsFetch(`${attachmentUrl}?patient=${patientUuid}&encounter=${encounterUuid}`, {
    signal: abortController.signal,
  }).then((response) => response.data);
}

export function getConcept(conceptUuid: string, v: string) {
  return openmrsFetch(`${restBaseUrl}/concept/${conceptUuid}?v=${v}`).then(({ data }) => data.results);
}

export function getLocationsByTag(tag: string) {
  return openmrsFetch(`${restBaseUrl}/location?tag=${tag}&v=custom:(uuid,display)`).then(({ data }) => data.results);
}

export function getAllLocations() {
  return openmrsFetch<{ results }>(`${restBaseUrl}/location?v=custom:(uuid,display)`).then(({ data }) => data.results);
}

export async function getPreviousEncounter(patientUuid: string, encounterType: string) {
  const query = `patient=${patientUuid}&_sort=-date&_count=1&type=${encounterType}`;
  let response = await openmrsFetch(`${fhirBaseUrl}/Encounter?${query}`);
  if (response?.data?.entry?.length) {
    const latestEncounter = response.data.entry[0].resource.id;
    response = await openmrsFetch(`${restBaseUrl}/encounter/${latestEncounter}?v=${encounterRepresentation}`);
    return response.data;
  }
  return null;
}

export function getLatestObs(patientUuid: string, conceptUuid: string, encounterTypeUuid?: string) {
  let params = `patient=${patientUuid}&code=${conceptUuid}${
    encounterTypeUuid ? `&encounter.type=${encounterTypeUuid}` : ''
  }`;
  // the latest obs
  params += '&_sort=-date&_count=1';
  return openmrsFetch(`${fhirBaseUrl}/Observation?${params}`).then(({ data }) => {
    return data.entry?.length ? data.entry[0].resource : null;
  });
}

/**
 * Fetches an OpenMRS form using either its name or UUID.
 * @param {string} nameOrUUID - The form's name or UUID.
 * @returns {Promise<OpenmrsForm | null>} - A Promise that resolves to the fetched OpenMRS form or null if not found.
 */
export async function fetchOpenMRSForm(nameOrUUID: string): Promise<OpenmrsForm | null> {
  if (!nameOrUUID) {
    return null;
  }

  const { url, isUUID } = isUuid(nameOrUUID)
    ? { url: `${restBaseUrl}/form/${nameOrUUID}?v=full`, isUUID: true }
    : { url: `${restBaseUrl}/form?q=${nameOrUUID}&v=full`, isUUID: false };

  const { data: openmrsFormResponse } = await openmrsFetch(url);
  if (isUUID) {
    return openmrsFormResponse;
  }

  return openmrsFormResponse.results?.length
    ? openmrsFormResponse.results.find((form) => form.retired === false)
    : new Error(`Form with ${nameOrUUID} was not found`);
}

/**
 * Fetches ClobData for a given OpenMRS form.
 * @param {OpenmrsForm} form - The OpenMRS form object.
 * @returns {Promise<any | null>} - A Promise that resolves to the fetched ClobData or null if not found.
 */
export async function fetchClobData(form: OpenmrsForm): Promise<any | null> {
  if (!form) {
    return null;
  }

  const jsonSchemaResource = form.resources.find(({ name }) => name === 'JSON schema');
  if (!jsonSchemaResource) {
    return null;
  }

  const clobDataUrl = `${restBaseUrl}/clobdata/${jsonSchemaResource.valueReference}`;
  const { data: clobDataResponse } = await openmrsFetch(clobDataUrl);

  return clobDataResponse;
}
export async function getPersonAttributeTypeFormat(personAttributeTypeUuid: string) {
  try {
    const response = await openmrsFetch(
      `${restBaseUrl}/personattributetype/${personAttributeTypeUuid}?v=custom:(format)`,
    );
    if (!response) {
      throw new Error('openmrsFetch did not return a response');
    }
    const { data } = response;
    if (!data || !data.results) {
      throw new Error('Response data is invalid');
    }
    return data.results;
  } catch (error) {
    console.error('Error fetching person attribute type format:', error);
    return null;
  }
}

// Program Enrollment
export function getPatientEnrolledPrograms(patientUuid: string) {
  return openmrsFetch(
    `${restBaseUrl}/programenrollment?patient=${patientUuid}&v=custom:(uuid,display,program:(uuid,name,allWorkflows),dateEnrolled,dateCompleted,location:(uuid,display),states:(state:(uuid,name,concept:(uuid),programWorkflow:(uuid)))`,
  ).then(({ data }) => {
    if (data) {
      return data;
    }
    return null;
  });
}

export function saveProgramEnrollment(payload: PatientProgramPayload, abortController: AbortController) {
  if (!payload) {
    throw new Error('Program enrollment cannot be created because no payload is supplied');
  }
  const url = payload.uuid ? `${restBaseUrl}/programenrollment/${payload.uuid}` : `${restBaseUrl}/programenrollment`;
  return openmrsFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: abortController.signal,
  });
}

export function savePatientIdentifier(patientIdentifier: PatientIdentifier, patientUuid: string) {
  let url: string;

  if (patientIdentifier.uuid) {
    url = `${restBaseUrl}/patient/${patientUuid}/identifier/${patientIdentifier.uuid}`;
  } else {
    url = `${restBaseUrl}/patient/${patientUuid}/identifier`;
  }

  return openmrsFetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(patientIdentifier),
  });
}

export function savePersonAttribute(personAttribute: PersonAttribute, personUuid: string) {
  let url: string;

  if (personAttribute.uuid) {
    url = `${restBaseUrl}/person/${personUuid}/attribute/${personAttribute.uuid}`;
  } else {
    url = `${restBaseUrl}/person/${personUuid}/attribute`;
  }

  return openmrsFetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(personAttribute),
  });
}
