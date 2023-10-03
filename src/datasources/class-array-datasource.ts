import { openmrsFetch } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class ClassArrayDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super('/ws/rest/v1/concept?v=custom:(uuid,display,conceptClass:(uuid,display))');
  }

  fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    return openmrsFetch(searchTerm ? `${this.url}&q=${searchTerm}` : this.url).then(({ data }) => {
      if(config?.class){
        return data.results.filter(concept => concept.conceptClass && config.class.includes(concept.conceptClass.uuid))
      }
      return data.results;
    });
  }
}
