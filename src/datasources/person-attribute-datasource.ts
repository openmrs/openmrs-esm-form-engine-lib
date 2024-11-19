import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class PersonAttributeLocationDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(null);
  }

  async fetchData(searchTerm: string, config?: Record<string, any>, uuid?: string): Promise<any[]> {
    const rep = 'v=custom:(uuid,display)';
    const url = `${restBaseUrl}/location?${rep}`;
    const { data } = await openmrsFetch(searchTerm ? `${url}&q=${searchTerm}` : url);

    return data?.results;
  }
}
