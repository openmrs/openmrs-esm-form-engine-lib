import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class ConceptSetMembersDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(`${restBaseUrl}/concept/conceptUuid?v=custom:(uuid,setMembers:(uuid,display))`);
  }

  fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    let apiUrl = this.url;
    let urlParts = apiUrl.split('conceptUuid');
    apiUrl = `${urlParts[0]}${config.concept}${urlParts[1]}`;

    return openmrsFetch(apiUrl).then(({ data }) => {
      return data['setMembers'];
    });
  }
}
