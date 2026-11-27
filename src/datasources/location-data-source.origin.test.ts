// @vitest-environment-options {"url": "https://clinic.example/openmrs/spa/home"}
import { vi, it, expect } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import { LocationDataSource } from './location-data-source';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

it('sends a next page to the port-less page origin, not the backend port', async () => {
  expect(window.location.origin).toBe('https://clinic.example');
  mockOpenmrsFetch
    .mockResolvedValueOnce({
      data: {
        results: [{ uuid: 'uuid-0' }],
        links: [{ rel: 'next', uri: 'http://backend:8080/openmrs/ws/rest/v1/location?startIndex=50' }],
      },
    } as any)
    .mockResolvedValueOnce({ data: { results: [{ uuid: 'uuid-50' }] } } as any);

  const result = await new LocationDataSource().fetchData(null);

  expect(result).toEqual([{ uuid: 'uuid-0' }, { uuid: 'uuid-50' }]);
  expect(mockOpenmrsFetch).toHaveBeenNthCalledWith(
    2,
    'https://clinic.example/openmrs/ws/rest/v1/location?startIndex=50',
  );
});
