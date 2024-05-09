import { useMemo } from 'react';
import { type FetchResponse, type OpenmrsResource, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWRInfinite from 'swr/infinite';

const conceptRepresentation =
  'custom:(uuid,display,conceptClass:(uuid,display),answers:(uuid,display),datatype:(uuid,display,name),conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';

const chunkSize = 100;

export function useConcepts(references: Set<string>): {
  concepts: Array<OpenmrsResource> | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const totalCount = references.size;
  const totalPages = Math.ceil(totalCount / chunkSize);

  const getUrl = (index) => {
    if (index >= totalPages) {
      return null;
    }

    const start = index * chunkSize;
    const end = start + chunkSize;
    const chunk = Array.from(references).slice(start, end);
    return `${restBaseUrl}/concept?references=${chunk.join(',')}&v=${conceptRepresentation}&limit=${chunkSize}`;
  };

  const { data, error, isLoading } = useSWRInfinite<FetchResponse<{ results: Array<OpenmrsResource> }>, Error>(
    getUrl,
    openmrsFetch,
    {
      initialSize: totalPages,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const results = useMemo(
    () => ({
      concepts: data ? [].concat(data?.map((res) => res?.data?.results).flat()) : undefined,
      error,
      isLoading,
    }),
    [data, error, isLoading],
  );

  return results;
}
