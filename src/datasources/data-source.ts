import { openmrsFetch, type OpenmrsResource } from '@openmrs/esm-framework';
import { type DataSource } from '../types';

export class BaseOpenMRSDataSource implements DataSource<OpenmrsResource> {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  fetchData(searchTerm: string): Promise<any[]> {
    return openmrsFetch(searchTerm ? `${this.url}&q=${searchTerm}` : this.url).then(({ data }) => {
      return data.results;
    });
  }

  fetchSingleItem(uuid: string): Promise<OpenmrsResource | null> {
    let apiUrl = this.url;
    if (apiUrl.includes('?')) {
      const urlParts = apiUrl.split('?');
      apiUrl = `${urlParts[0]}/${uuid}?${urlParts[1]}`;
    } else {
      apiUrl = `${apiUrl}/${uuid}`;
    }
    return openmrsFetch(apiUrl).then(({ data }) => data);
  }

  toUuidAndDisplay(data: OpenmrsResource): OpenmrsResource {
    if (typeof data.uuid === 'undefined' || typeof data.display === 'undefined') {
      throw new Error("'uuid' or 'display' not found in the OpenMRS object.");
    }
    return data;
  }
}
