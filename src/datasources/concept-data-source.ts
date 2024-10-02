import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';
import { isEmpty } from '../validators/form-validator';

export class ConceptDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(`${restBaseUrl}/concept?v=custom:(uuid,display,conceptClass:(uuid,display))`);
  }

  fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    if (isEmpty(config?.class) && isEmpty(config?.concept) && !config?.useSetMembersByConcept && isEmpty(searchTerm)) {
      return Promise.resolve([]);
    }

    let searchUrl = `${restBaseUrl}/concept?name=&searchType=fuzzy&v=custom:(uuid,display,conceptClass:(uuid,display))`;
    if (config?.class) {
      if (typeof config.class == 'string') {
        const urlParts = searchUrl.split('searchType=fuzzy');
        searchUrl = `${urlParts[0]}searchType=fuzzy&class=${config.class}&${urlParts[1]}`;
      } else {
        return openmrsFetch(searchTerm ? `${searchUrl}&q=${searchTerm}` : searchUrl).then(({ data }) => {
          return data.results.filter(
            (concept) => concept.conceptClass && config.class.includes(concept.conceptClass.uuid),
          );
        });
      }
    }

    if (config?.concept && config?.useSetMembersByConcept) {
      let urlParts = searchUrl.split('?name=&searchType=fuzzy&v=');
      searchUrl = `${urlParts[0]}/${config.concept}?v=custom:(uuid,setMembers:(uuid,display))`;
      return openmrsFetch(searchTerm ? `${searchUrl}&q=${searchTerm}` : searchUrl).then(({ data }) => {
        // return the setMembers from the retrieved concept object
        return data['setMembers'];
      });
    }

    return openmrsFetch(searchTerm ? `${searchUrl}&q=${searchTerm}` : searchUrl).then(({ data }) => {
      return data.results;
    });
  }
}
