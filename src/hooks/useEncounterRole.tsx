import { type OpenmrsResource, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWRImmutable from 'swr/immutable';

export function useEncounterRole() {
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<OpenmrsResource> } }, Error>(
    `${restBaseUrl}/encounterrole?v=custom:(uuid,display,name)`,
    openmrsFetch,
  );
  const clinicalEncounterRole = data?.data.results.find((encounterRole) => encounterRole.name === 'Clinician');

  if (clinicalEncounterRole) {
    return { newEncounterRole: clinicalEncounterRole, error, isLoading };
  }
  return { newEncounterRole: data?.data.results[0], error, isLoading };
}
