import { openmrsFetch, type OpenmrsResource, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class SelectConceptAnswersDatasource extends BaseOpenMRSDataSource {
  constructor() {
    super(
      `${restBaseUrl}/concept/:conceptUuid?v=custom:(uuid,display,setMembers:(uuid,display),answers:(uuid,display))`,
    );
  }

  fetchSingleItem(uuid: string): Promise<OpenmrsResource | null> {
    return openmrsFetch(this.buildUrl(uuid)).then(({ data }) => data);
  }

  fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    const apiUrl = this.buildUrl(config.referencedValue || config.concept);
    return openmrsFetch(apiUrl).then(({ data }) => {
      return data['setMembers'].length ? data['setMembers'] : data['answers'];
    });
  }

  private buildUrl(conceptUuid: string): string {
    return this.url.replace(':conceptUuid', conceptUuid);
  }
}
