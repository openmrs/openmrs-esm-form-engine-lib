import { openmrsFetch } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class LocationDataSource extends BaseOpenMRSDataSource {
  constructor(){
    super("/ws/rest/v1/location?v=custom:(uuid,display)");
  }

  fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    if (config?.tag) {
      let urlParts = this.url.split('?');
      this.url = `${urlParts[0]}?tag=${config.tag}&${urlParts[1]}`;
    }
    return openmrsFetch(searchTerm ? `${this.url}&q=${searchTerm}` : this.url).then(({ data }) => {
      return data.results;
    });
  }

}
