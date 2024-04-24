import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class ConceptSetMembersDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(`${restBaseUrl}/concept/conceptUuid?v=custom:(uuid,setMembers:(uuid,display))`);
  }

  fetchData(conceptUud: string): Promise<any[]> {
    let apiUrl = this.url;
    let urlParts = apiUrl.split('conceptUuid');
    apiUrl = `${urlParts[0]}/${conceptUud}${urlParts[1]}`;
    return openmrsFetch(apiUrl).then(({ data }) => {
      return data['setMembers'];
    });
  }
}
