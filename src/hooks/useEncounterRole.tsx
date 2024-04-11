import { OpenmrsResource, openmrsFetch } from '@openmrs/esm-framework';
import useSWRImmutable from 'swr/immutable';

export function useEncounterRole() {
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<OpenmrsResource> } }, Error>(
    '/ws/rest/v1/encounterrole?v=custom:(uuid,display,name)',
    openmrsFetch,
  );
  const clinicalEncounterRole = data?.data.results.find((encounterRole) => encounterRole.name === 'Clinician');

  if (clinicalEncounterRole) {
    return { encounterRole: clinicalEncounterRole, error, isLoading };
  }
  return { encounterRole: data?.data.results[0], error, isLoading };
}
