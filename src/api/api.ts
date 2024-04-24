import { openmrsFetch } from '@openmrs/esm-framework';
import { encounterRepresentation } from '../constants';
import { OpenmrsForm, ProgramEnrollmentPayload } from '../types';
import { isUuid } from '../utils/boolean-utils';

const BASE_WS_API_URL = '/ws/rest/v1/';

export function saveEncounter(abortController: AbortController, payload, encounterUuid?: string) {
  const url = encounterUuid ? `/ws/rest/v1/encounter/${encounterUuid}?v=full` : `/ws/rest/v1/encounter?v=full`;

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
  const url = '/ws/rest/v1/attachment';

  const content = field?.value.value;
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
  const attachmentUrl = '/ws/rest/v1/attachment';
  return openmrsFetch(`${attachmentUrl}?patient=${patientUuid}&encounter=${encounterUuid}`, {
    signal: abortController.signal,
  }).then((response) => response.data);
}

export function getConcept(conceptUuid: string, v: string) {
  return openmrsFetch(`/ws/rest/v1/concept/${conceptUuid}?v=${v}`).then(({ data }) => data.results);
}

export function getLocationsByTag(tag: string) {
  return openmrsFetch(`/ws/rest/v1/location?tag=${tag}&v=custom:(uuid,display)`).then(({ data }) => data.results);
}

export function getAllLocations() {
  return openmrsFetch<{ results }>(`/ws/rest/v1/location?v=custom:(uuid,display)`).then(({ data }) => data.results);
}

export async function getPreviousEncounter(patientUuid: string, encounterType: string) {
  const query = `patient=${patientUuid}&_sort=-_lastUpdated&_count=1&type=${encounterType}`;
  let response = await openmrsFetch(`/ws/fhir2/R4/Encounter?${query}`);
  if (response?.data?.entry?.length) {
    const latestEncounter = response.data.entry[0].resource.id;
    response = await openmrsFetch(`/ws/rest/v1/encounter/${latestEncounter}?v=${encounterRepresentation}`);
    return response.data;
  }
  return null;
}

export function getLatestObs(patientUuid: string, conceptUuid: string, encounterTypeUuid?: string) {
  let params = `patient=${patientUuid}&code=${conceptUuid}${
    encounterTypeUuid ? `&encounter.type=${encounterTypeUuid}` : ''
  }`;
  // the latest obs
  params += '&_sort=-_lastUpdated&_count=1';
  return openmrsFetch(`/ws/fhir2/R4/Observation?${params}`).then(({ data }) => {
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
    ? { url: `/ws/rest/v1/form/${nameOrUUID}?v=full`, isUUID: true }
    : { url: `/ws/rest/v1/form?q=${nameOrUUID}&v=full`, isUUID: false };

  const { data: openmrsFormResponse } = await openmrsFetch(url);
  if (isUUID) {
    return openmrsFormResponse;
  }
  return openmrsFormResponse.results?.length
    ? openmrsFormResponse.results[0]
    : new Error(`Form with ${nameOrUUID} was not found`);
}

/**
 * Fetches ClobData for a given OpenMRS form.
 * @param {OpenmrsForm} form - The OpenMRS form object.
 * @returns {Promise<any | null>} - A Promise that resolves to the fetched ClobData or null if not found.
 */
export async function fetchClobdata(form: OpenmrsForm): Promise<any | null> {
  if (!form) {
    return null;
  }

  const jsonSchemaResource = form.resources.find(({ name }) => name === 'JSON schema');
  if (!jsonSchemaResource) {
    return null;
  }

  const clobDataUrl = `/ws/rest/v1/clobdata/${jsonSchemaResource.valueReference}`;
  const { data: clobDataResponse } = await openmrsFetch(clobDataUrl);

  return clobDataResponse;
}

function dataURItoFile(dataURI: string) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to a typed array
  const buffer = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    buffer[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([buffer], { type: mimeString });
  return blob;
}

//Program Enrollment
export function getPatientEnrolledPrograms(patientUuid: string) {
  return openmrsFetch(
    `${BASE_WS_API_URL}programenrollment?patient=${patientUuid}&v=custom:(uuid,display,program,dateEnrolled,dateCompleted,location:(uuid,display))`,
  ).then(({ data }) => {
    if (data) {
      return data;
    }
    return null;
  });
}

export function createProgramEnrollment(payload: ProgramEnrollmentPayload, abortController: AbortController) {
  if (!payload) {
    throw new Error('Program enrollment cannot be created because no payload is supplied');
  }
  const { program, patient, dateEnrolled, dateCompleted, location } = payload;
  return openmrsFetch(`${BASE_WS_API_URL}programenrollment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: { program, patient, dateEnrolled, dateCompleted, location },
    signal: abortController.signal,
  });
}

export function updateProgramEnrollment(
  programEnrollmentUuid: string,
  payload: ProgramEnrollmentPayload,
  abortController: AbortController,
) {
  if (!payload || !programEnrollmentUuid) {
    throw new Error('Program enrollment cannot be edited without a payload or a program Uuid');
  }
  const { dateEnrolled, dateCompleted, location } = payload;
  return openmrsFetch(`${BASE_WS_API_URL}programenrollment/${programEnrollmentUuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: { dateEnrolled, dateCompleted, location },
    signal: abortController.signal,
  });
}
