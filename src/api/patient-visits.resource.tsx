import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { LocationResponse, EncounterProviderResponse } from './types';

export function useProviders() {
  const { data, error } = useSWR<{ data: EncounterProviderResponse }>('/ws/rest/v1/provider', openmrsFetch);
  return {
    providers: data?.data?.results,
    isLoadingProviders: !error && !data,
    isError: error,
  };
}

export function useLocations() {
  const { data, error } = useSWR<{ data: LocationResponse }>('/ws/rest/v1/location', openmrsFetch);
  return {
    locations: data?.data?.results,
    isLoadingLocations: !error && !data,
    isError: error,
  };
}
