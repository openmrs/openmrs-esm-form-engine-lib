import { openmrsFetch } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class ConceptDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super('/ws/rest/v1/concept?name=&searchType=fuzzy&v=custom:(uuid,display)');
  }

  fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    if (config?.class) {
      let urlParts = this.url.split('name=');
      this.url = `${urlParts[0]}&name=&class=${config.class}&${urlParts[1]}`;
    }
    return openmrsFetch(searchTerm ? `${this.url}&q=${searchTerm}` : this.url).then(({ data }) => {
      return data.results;
    });
  }
}
