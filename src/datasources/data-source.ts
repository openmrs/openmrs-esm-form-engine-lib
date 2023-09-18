import { openmrsFetch, OpenmrsResource } from '@openmrs/esm-framework';
import { DataSource } from '../api/types';

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

  toUuidAndDisplay(data: OpenmrsResource): OpenmrsResource {
    if (typeof data.uuid === 'undefined' || typeof data.display === 'undefined') {
      throw new Error("'uuid' or 'display' not found in the OpenMRS object.");
    }
    return data;
  }
}
