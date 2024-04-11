import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class LocationDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(`${restBaseUrl}/location?v=custom:(uuid,display)`);
  }

  fetchData(searchTerm: string, config?: Record<string, any>, uuid?: string): Promise<any[]> {
    let apiUrl = this.url;
    const urlParts = apiUrl.split('?');
    if (config?.tag) {
      apiUrl = `${urlParts[0]}?tag=${config.tag}&${urlParts[1]}`;
    }
    //overwrite url if there's a uuid value, meaning we are in edit mode
    if (uuid) {
      apiUrl = `${urlParts[0]}/${uuid}?${urlParts[1]}`;
    }

    return openmrsFetch(searchTerm ? `${apiUrl}&q=${searchTerm}` : apiUrl).then(({ data }) => {
      if (data.results) {
        return data.results;
      }
      return data;
    });
  }
}
