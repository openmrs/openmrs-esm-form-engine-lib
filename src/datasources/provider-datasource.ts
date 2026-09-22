import { openmrsFetch, restBaseUrl, type OpenmrsResource } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class ProviderDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(null);
  }

  async fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    const rep = 'v=custom:(uuid,display)';
    const url = `${restBaseUrl}/provider?${rep}`;
    const { data } = await openmrsFetch(searchTerm ? `${url}&q=${searchTerm}` : url);
    return data?.results;
  }

  async fetchSingleItem(uuid: string): Promise<OpenmrsResource | null> {
    const { data } = await openmrsFetch(`${restBaseUrl}/provider/${uuid}?v=custom:(uuid,display)`);
    return data;
  }
}
