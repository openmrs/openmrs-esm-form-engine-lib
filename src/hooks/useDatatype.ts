import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, OpenmrsResource } from '@openmrs/esm-framework';

const conceptRepresentation =
  'custom:(uuid,display,datatype,conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';

export function useDatatype(references: Set<string>) {
  // TODO: handle paging (ie when number of concepts greater than default limit per page)
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<OpenmrsResource> } }, Error>(
    `/ws/rest/v1/concept?references=${Array.from(references).join(',')}&v=${conceptRepresentation}`,
    openmrsFetch,
  );

  const filteredSet = Array.from(references).filter(
    eachItem => !data?.data.results.some(item => eachItem === item.uuid),
  );

  return { concepts: data?.data.results, error, isLoading, filteredSet };
}
