import { vi, it, describe, beforeEach, expect } from 'vitest';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { ProviderDataSource } from './provider-datasource';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

describe('ProviderDataSource', () => {
  let ds: ProviderDataSource;

  beforeEach(() => {
    ds = new ProviderDataSource();
  });

  describe('fetchSingleItem', () => {
    it('fetches a single provider by UUID at the correct endpoint', async () => {
      const uuid = 'provider-uuid-1';
      const mockProvider = { uuid, display: 'Dr. Test' };
      mockOpenmrsFetch.mockResolvedValueOnce({ data: mockProvider } as any);

      const result = await ds.fetchSingleItem(uuid);

      expect(mockOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/provider/${uuid}?v=custom:(uuid,display)`);
      expect(result).toEqual(mockProvider);
    });
  });

  describe('fetchData', () => {
    it('fetches all providers when no search term is given', async () => {
      const mockProviders = [
        { uuid: 'uuid-1', display: 'Provider 1' },
        { uuid: 'uuid-2', display: 'Provider 2' },
      ];
      mockOpenmrsFetch.mockResolvedValueOnce({ data: { results: mockProviders } } as any);

      const result = await ds.fetchData(null);

      expect(mockOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/provider?v=custom:(uuid,display)`);
      expect(result).toEqual(mockProviders);
    });

    it('appends the search term to the request URL when provided', async () => {
      mockOpenmrsFetch.mockResolvedValueOnce({ data: { results: [] } } as any);

      await ds.fetchData('john');

      expect(mockOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/provider?v=custom:(uuid,display)&q=john`);
    });
  });
});
