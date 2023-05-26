import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, OpenmrsResource } from '@openmrs/esm-framework';

const conceptRepresentation =
  'custom:(uuid,display,conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';

export function useConcepts(references: Array<string>) {
  // TODO: handle paging (ie when number of concepts greater than default limit per page)
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<OpenmrsResource> } }, Error>(
    `/ws/rest/v1/concept?references=${references.join(',')}&v=${conceptRepresentation}`,
    openmrsFetch,
  );
  return { concepts: data?.data.results, error, isLoading };
}
