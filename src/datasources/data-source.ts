import { openmrsFetch, OpenmrsResource } from '@openmrs/esm-framework';
import { DataSource } from '../api/types';

export class BaseOpenMRSDataSource implements DataSource<OpenmrsResource> {
  private initialUrl: string;
  private url: string;

  constructor(url: string) {
    this.initialUrl = url;
    this.url = url;
  }

  fetchData(searchTerm: string): Promise<any[]> {
    this.url = this.initialUrl;
    return openmrsFetch(searchTerm ? `${this.url}&q=${searchTerm}` : this.url).then(({ data }) => {
      return data.results;
    });
  }

  toUuidAndDisplay(data: OpenmrsResource): OpenmrsResource {
    if (typeof data.uuid === 'undefined' || typeof data.display === 'undefined') {
      throw new Error();
    }
    return data;
  }
}
