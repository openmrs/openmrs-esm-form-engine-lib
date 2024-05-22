import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class EncounterRoleDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(null);
  }

  async fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    const rep = 'v=custom:(uuid,display,name)';
    const url = `${restBaseUrl}/encounterrole?${rep}`;
    const { data } = await openmrsFetch(searchTerm ? `${url}&q=${searchTerm}` : url);
    return data?.results;
  }
}
