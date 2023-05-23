import { FetchResponse, openmrsFetch, openmrsObservableFetch } from '@openmrs/esm-framework';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { encounterRepresentation } from '../constants';
import { OpenmrsForm } from './types';
import { isUuid } from '../utils/boolean-utils';

export function saveEncounter(abortController: AbortController, payload, encounterUuid?: string) {
  const url = !!encounterUuid ? `/ws/rest/v1/encounter/${encounterUuid}?v=full` : `/ws/rest/v1/encounter?v=full`;
  return openmrsFetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: payload,
    signal: abortController.signal,
  });
}

export function getConcept(conceptUuid: string, v: string): Observable<any> {
  return openmrsObservableFetch(`/ws/rest/v1/concept/${conceptUuid}?v=${v}`).pipe(map(response => response['data']));
}

export function getLocationsByTag(tag: string): Observable<{ uuid: string; display: string }[]> {
  return openmrsObservableFetch(`/ws/rest/v1/location?tag=${tag}&v=custom:(uuid,display)`).pipe(
    map(({ data }) => data['results']),
  );
}

export function getPreviousEncounter(patientUuid: string, encounterType) {
  const query = `encounterType=${encounterType}&patient=${patientUuid}`;
  return openmrsFetch(`/ws/rest/v1/encounter?${query}&limit=1&v=${encounterRepresentation}`).then(({ data }) => {
    return data.results.length ? data.results[0] : null;
  });
}

export function fetchConceptNameByUuid(conceptUuid: string) {
  return openmrsFetch(`/ws/rest/v1/concept/${conceptUuid}/name?limit=1`).then(({ data }) => {
    if (data.results.length) {
      const concept = data.results[data.results.length - 1];
      return concept.display;
    }
  });
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
export async function fetchClobData(form: OpenmrsForm): Promise<any | null> {
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

/**
 * Generic fetch function for making HTTP requests.
 * Automatically stringifies JSON body if object is passed.
 *
 * @template T The expected response body type
 * @param {string} url - The URL to make the request to
 * @param {RequestInit} [fetchInit={}] - An options object containing any custom settings to be applied to the request
 * @returns {Promise<FetchResponse<T>>} The response from the server, parsed as JSON if possible
 * @throws {TypeError} When invalid arguments are passed
 * @throws {GenericFetchError} When the request fails
 */
export function genericFetch<T = any>(url: string, fetchInit: RequestInit = {}): Promise<FetchResponse<T>> {
  if (typeof url !== 'string') {
    throw new TypeError('The first argument to this fetch function must be a url string');
  }

  if (typeof fetchInit !== 'object') {
    throw new TypeError('The second argument to this fetch function must be a plain object.');
  }

  // We're going to need some headers
  if (!fetchInit.headers) {
    fetchInit.headers = {};
  }

  /* Automatically stringify javascript objects being sent in the
   * request body.
   */
  if (fetchInit.body && typeof fetchInit.body === 'object' && !(fetchInit.body instanceof FormData)) {
    fetchInit.body = JSON.stringify(fetchInit.body);
    fetchInit.headers = { ...fetchInit.headers, 'Content-Type': 'application/json' };
  }

  const requestStacktrace = new Error();

  return fetch(url, fetchInit).then(async r => {
    const response = r as FetchResponse<T>;

    if (response.ok) {
      if (response.status === 204) {
        response.data = (null as unknown) as T;
        return response;
      } else {
        return response.text().then(responseText => {
          try {
            if (responseText) {
              response.data = JSON.parse(responseText);
            }
          } catch (err) {
            // Server didn't respond with json
          }
          return response;
        });
      }
    } else {
      return response.text().then(
        responseText => {
          let responseBody = responseText;
          try {
            responseBody = JSON.parse(responseText);
          } catch (err) {
            // Server didn't respond with json, so just go with the response text string
          }
          throw new GenericFetchError(url, response, responseBody, requestStacktrace);
        },
        err => {
          throw new GenericFetchError(url, response, null, requestStacktrace);
        },
      );
    }
  });
}

/**
 * Custom error class for generic fetch failures.
 * Includes additional information about the request and response for easier debugging.
 *
 * @extends Error
 */
class GenericFetchError extends Error {
  /**
   * Creates a new instance of GenericFetchError
   * @param {string} url - The URL that the failed request was made to
   * @param {Response} response - The response received from the server
   * @param {any} responseBody - The body of the response, if any
   * @param {Error} requestStacktrace - The stack trace captured before the request was made
   */
  constructor(public url: string, public response: Response, public responseBody: any, requestStacktrace: Error) {
    super(`Request to ${url} failed with status ${response.status}. Response body: ${JSON.stringify(responseBody)}`);
    this.stack = requestStacktrace.stack;
    this.name = 'GenericFetchError';
  }
}
