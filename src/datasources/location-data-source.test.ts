import { vi, it, describe, beforeEach, expect } from 'vitest';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { LocationDataSource } from './location-data-source';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const locations = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ uuid: `uuid-${from + i}`, display: `Clinic ${from + i}` }));

const backendNextUri = 'https://backend:8443/openmrs/ws/rest/v1/location?tag=Visit+Location&startIndex=50';
const proxiedNextUri = `${window.location.protocol}//${window.location.host}/openmrs/ws/rest/v1/location?tag=Visit+Location&startIndex=50`;

describe('LocationDataSource', () => {
  let ds: LocationDataSource;

  beforeEach(() => {
    mockOpenmrsFetch.mockReset();
    ds = new LocationDataSource();
  });

  describe('fetchData', () => {
    it('returns every tagged location when the server pages the results', async () => {
      mockOpenmrsFetch
        .mockResolvedValueOnce({
          data: { results: locations(0, 50), links: [{ rel: 'next', uri: backendNextUri }] },
        } as any)
        .mockResolvedValueOnce({ data: { results: locations(50, 7), links: [{ rel: 'prev', uri: '' }] } } as any);

      const result = await ds.fetchData(null, { tag: 'Visit Location' });

      expect(result).toEqual(locations(0, 57));
      expect(mockOpenmrsFetch).toHaveBeenCalledTimes(2);
      expect(mockOpenmrsFetch).toHaveBeenNthCalledWith(
        1,
        `${restBaseUrl}/location?tag=Visit Location&v=custom:(uuid,display)`,
      );
      expect(mockOpenmrsFetch).toHaveBeenNthCalledWith(2, proxiedNextUri);
    });

    it('returns a single page as it is when there is no next link', async () => {
      mockOpenmrsFetch.mockResolvedValueOnce({ data: { results: locations(0, 3) } } as any);

      const result = await ds.fetchData('Clinic');

      expect(result).toEqual(locations(0, 3));
      expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
      expect(mockOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/location?v=custom:(uuid,display)&q=Clinic`);
    });
  });
});
