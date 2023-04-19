import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { LocationResponse, ProviderResponse } from './types';

export function useProviders() {
  const { data, error } = useSWR<{ data: ProviderResponse }>('/ws/rest/v1/provider', openmrsFetch);
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
