import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, OpenmrsResource, restBaseUrl } from '@openmrs/esm-framework';

const conceptRepresentation =
  'custom:(uuid,display,conceptClass:(uuid,display),answers:(uuid,display),conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';

export function useConcepts(references: Set<string>) {
  // TODO: handle paging (ie when number of concepts greater than default limit per page)
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<OpenmrsResource> } }, Error>(
    `${restBaseUrl}/concept?references=${Array.from(references).join(',')}&v=${conceptRepresentation}`,
    openmrsFetch,
  );
  return { concepts: data?.data.results, error, isLoading };
}
