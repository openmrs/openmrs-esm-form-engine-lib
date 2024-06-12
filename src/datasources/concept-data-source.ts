import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class ConceptDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(`${restBaseUrl}/concept?name=&searchType=fuzzy&v=custom:(uuid,display,conceptClass:(uuid,display))`);
  }

  fetchData(searchTerm: string, config?: Record<string, any>, uuid?: string): Promise<any[]> {
    if (!config?.class && !config?.useSetMembersByConcept && !searchTerm) {
      return Promise.resolve([]);
    }

    let apiUrl = this.url;
    if (config?.class) {
      if (typeof config.class == 'string') {
        const urlParts = apiUrl.split('searchType=fuzzy');
        apiUrl = `${urlParts[0]}searchType=fuzzy&class=${config.class}&${urlParts[1]}`;
      } else {
        return openmrsFetch(searchTerm ? `${apiUrl}&q=${searchTerm}` : apiUrl).then(({ data }) => {
          return data.results.filter(
            (concept) => concept.conceptClass && config.class.includes(concept.conceptClass.uuid),
          );
        });
      }
    }

    if (config?.useSetMembersByConcept) {
      let urlParts = apiUrl.split('?name=&searchType=fuzzy&v=');
      apiUrl = `${urlParts[0]}/${config.concept}?v=custom:(uuid,setMembers:(uuid,display))`;
      return openmrsFetch(searchTerm ? `${apiUrl}&q=${searchTerm}` : apiUrl).then(({ data }) => {
        // return the setMembers from the retrieved concept object
        return data['setMembers'];
      });
    }

    return openmrsFetch(searchTerm ? `${apiUrl}&q=${searchTerm}` : apiUrl).then(({ data }) => {
      return data.results;
    });
  }
}
