import { useMemo } from 'react';
import { type FetchResponse, type OpenmrsResource, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWRInfinite from 'swr/infinite';

type ConceptFetchResponse = FetchResponse<{ results: Array<OpenmrsResource> }>;

const conceptRepresentation =
  'custom:(uuid,display,conceptClass:(uuid,display),answers:(uuid,display),conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';

export function useConcepts(references: Set<string>): {
  concepts: Array<OpenmrsResource> | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {

  const chunkSize = 100;
  const totalCount = references.size;
  const totalPages = Math.ceil(totalCount / chunkSize);

  const getUrl = (index, prevPageData: ConceptFetchResponse) => {
    if (index >= totalPages) {
      return null;
    }

    if (!chunkSize) {
      return null;
    }

    const start = index * chunkSize;
    const end = start + chunkSize;
    const referenceChunk = Array.from(references).slice(start, end);
    return `${restBaseUrl}/concept?references=${referenceChunk.join(',')}&v=${conceptRepresentation}`;
  };

  const { data, error, isLoading } = useSWRInfinite<ConceptFetchResponse, Error>(getUrl, openmrsFetch, {
    initialSize: totalPages,
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const results = useMemo(
    () => ({
      // data?.[0] check is added for tests, as response is undefined in tests
      // hence the returned concepts are [undefined], which breaks the form-helper.ts
      // As it cannot read `uuid` of `undefined`
      concepts: data && data?.[0] ? [].concat(...data.map((res) => res?.data?.results)) : undefined,
      error,
      isLoading,
    }),
    [data, error, isLoading],
  );

  return results;
}
