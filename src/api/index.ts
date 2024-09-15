import { fhirBaseUrl, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { encounterRepresentation } from '../constants';
import { type OpenmrsForm, type PatientIdentifier, type PatientProgramPayload } from '../types';
import { isUuid } from '../utils/boolean-utils';
import { voidObs } from '../adapters/obs-adapter';

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
  if (content && content.action === 'CLEAR') {
    // Handle file removal
    return voidAttachment(encounterUUID, conceptUuid, abortController).then(() => {
      // Clear cached data
      field.meta.submission = { ...field.meta.submission, newValue: voidObs };
      return Promise.resolve();
    });
  }
  if (!content) {
    return Promise.resolve();
  }

  const formData = new FormData();
  const fileCaption = field.id;

  formData.append('fileCaption', fileCaption);
  formData.append('patient', patientUuid);

  if (content instanceof File) {
    formData.append('file', content, content.name);
  } else if (typeof content === 'string' && content.startsWith('data:')) {
    // Convert base64 to Blob
    const byteString = atob(content.split(',')[1]);
    const mimeString = content.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    formData.append('file', blob, `camera-upload.${mimeString.split('/')[1]}`);
  } else {
    console.error('Invalid content type:', typeof content);
    return Promise.reject(new Error('Invalid content type'));
  }
  formData.append('encounter', encounterUUID);
  formData.append('obsDatetime', date);
  formData.append('concept', conceptUuid);

  return openmrsFetch(url, {
    method: 'POST',
    signal: abortController.signal,
    body: formData,
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error('Error saving attachment:', error);
      console.error('Error response:', error.responseBody);
      throw error;
    });
}

function voidAttachment(encounterUUID, conceptUuid, abortController) {
  //get the existing observation
  const getObsUrl = `${restBaseUrl}/obs?encounter=${encounterUUID}&concept=${conceptUuid}&v=full`;
  
  return openmrsFetch(getObsUrl, {
    method: 'GET',
    signal: abortController.signal,
  })
    .then((response) => {
      if (response.data.results && response.data.results.length > 0) {
        const obsUuid = response.data.results[0].uuid;
        const voidUrl = `${restBaseUrl}/obs/${obsUuid}`;
        
        //void existing observation
        return openmrsFetch(voidUrl, {
          method: 'DELETE',
          signal: abortController.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            voidReason: 'Voided via form submission'
          }),
        });
      } else {
        throw new Error('No matching observation found to void');
      }
    })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error('Error removing attachment:', error);
      console.error('Error response:', error.responseBody);
      throw error;
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
