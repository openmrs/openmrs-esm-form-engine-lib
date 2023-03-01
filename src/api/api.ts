import { openmrsFetch, openmrsObservableFetch } from '@openmrs/esm-framework';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { encounterRepresentation } from '../constants';

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
