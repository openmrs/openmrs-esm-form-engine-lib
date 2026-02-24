import { useMemo } from 'react';
import useSWR from 'swr';
import { type Concept, type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

const conceptRepresentation =
  'custom:(units,lowAbsolute,hiAbsolute,uuid,display,conceptClass:(uuid,display),answers:(uuid,display),conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';

type ConceptRepresentation = Pick<Concept, 'uuid' | 'display'> & {
  conceptClass: Pick<Concept['conceptClass'], 'uuid' | 'display'>;
  answers: Array<{
    uuid: string;
    display: string;
  }>;
  conceptMappings: Array<{
    conceptReferenceTerm: {
      conceptSource: {
        name: string;
      };
      code: string;
    };
  }>;
};

type ConceptFetchResponse = FetchResponse<{ [reference: string]: ConceptRepresentation }>;

export function useConcepts(references: Array<string>): {
  concepts: Array<ConceptRepresentation> | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const { data, error, isLoading } = useSWR<ConceptFetchResponse, Error>(
    [`${restBaseUrl}/conceptreferences?v=${conceptRepresentation}`, references],
    ([url, refs]) =>
      openmrsFetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          references: refs,
        },
        method: 'POST',
      }),
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );

  const concepts = useMemo(() => (data?.data ? Object.values(data.data) : undefined), [data]);

  return {
    concepts,
    isLoading,
    error,
  };
}
