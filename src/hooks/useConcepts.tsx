import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, OpenmrsResource } from '@openmrs/esm-framework';

const conceptRepresentation =
  'custom:(uuid,display,conceptMappings:(conceptReferenceTerm:(conceptSource:(name),code)))';

export function useConcepts(references: Set<string>) {
  const pageSize = 10; 
  const pagesToFetch = Math.ceil(references.size / pageSize);

  const fetcher = async (url) => {
    const response = await openmrsFetch(url);
    const data = await response.json();
    return data;
  };

  const pages = Array.from({ length: pagesToFetch }, (_, index) => {
    const offset = index * pageSize;
    const referencesSlice = Array.from(references).slice(offset, offset + pageSize);
    const referenceString = referencesSlice.join(',');
    return `/ws/rest/v1/concept?references=${referenceString}&v=${conceptRepresentation}`;
  });

  const { data, error, isLoading } = useSWRImmutable(pages, fetcher);


  return { concepts: data, error, isLoading };
}