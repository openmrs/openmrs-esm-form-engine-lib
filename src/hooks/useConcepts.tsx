import useSWRImmutable,  {mutate}  from 'swr/immutable';
import { openmrsFetch, OpenmrsResource } from '@openmrs/esm-framework';

const conceptRepresentation =
  'custom:(uuid,display,conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';
const defaultPageSize = 50; // Modify this value based on your backend configuration

export function useConcepts(references: Set<string>) {
  const fetcher = async (url: string) => {
    const response = await openmrsFetch(url);
    const data = await response.json();
    return data.results;
  };

  const queryKey = `/ws/rest/v1/concept?references=${Array.from(references).join(',')}&v=${conceptRepresentation}&limit=${defaultPageSize}`;

  const { data, error, isValidating, mutate: mutateData } = useSWRImmutable(queryKey, fetcher);

  async function fetchNextPage(startIndex: number) {
    const url = `${queryKey}&startIndex=${startIndex}`;
    const newData = await fetcher(url);
    mutateData([...data, ...newData], false);
  }

  return {
    concepts: data,
    error,
    isLoading: !data && !error,
    isValidating,
    fetchNextPage,
  };
}
