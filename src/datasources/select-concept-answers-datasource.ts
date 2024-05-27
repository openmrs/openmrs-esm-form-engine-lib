import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class SelectConceptAnswersDatasource extends BaseOpenMRSDataSource {
  constructor() {
    super(`${restBaseUrl}/concept/conceptUuid?v=custom:(uuid,setMembers:(uuid,display),answers:(uuid,display))`);
  }

  fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    const apiUrl = this.url.replace('conceptUuid', config.referencedValue || config.concept);
    return openmrsFetch(apiUrl).then(({ data }) => {
      return data['setMembers'].length ? data['setMembers'] : data['answers'];
    });
  }
}
