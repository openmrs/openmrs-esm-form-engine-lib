import { useMemo } from 'react';
import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

type GlobalPropertyResponse = FetchResponse<{
  results: Array<{ property: string; value: string }>;
}>;

const DEFAULT_CHUNK_SIZE = 100;

export function useRestApiMaxResults() {
  const { data, error, isLoading } = useSWR<GlobalPropertyResponse, Error>(
    `${restBaseUrl}/systemsetting?q=webservices.rest.maxResultsAbsolute&v=custom:(property,value)`,
    openmrsFetch,
  );

  const maxResults = useMemo(() => {
    try {
      const maxResultsValue = data?.data.results.find(
        (prop) => prop.property === 'webservices.rest.maxResultsAbsolute',
      )?.value;

      const parsedValue = parseInt(maxResultsValue ?? '');
      return !isNaN(parsedValue) && parsedValue > 0 ? parsedValue : DEFAULT_CHUNK_SIZE;
    } catch {
      return DEFAULT_CHUNK_SIZE;
    }
  }, [data]);

  return {
    maxResults,
    error,
    isLoading,
  };
}
