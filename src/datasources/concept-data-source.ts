import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';
import { isEmpty } from '../validators/form-validator';

export class ConceptDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(`${restBaseUrl}/concept?name=&searchType=fuzzy&v=custom:(uuid,display,conceptClass:(uuid,display))`);
  }

  fetchData(searchTerm: string, config?: Record<string, any>, uuid?: string): Promise<any[]> {
    if (isEmpty(config?.class) && isEmpty(config?.concept) && !config?.useSetMembersByConcept && isEmpty(searchTerm)) {
      return Promise.resolve([]);
    }

    let apiUrl = this.url;
    if (config?.class) {
      if (typeof config.class == 'string') {
        const urlParts = apiUrl.split('searchType=fuzzy');
        apiUrl = `${urlParts[0]}searchType=fuzzy&class=${config.class}&${urlParts[1]}`;
      } else {
        const fetchAllConcepts = (): Promise<any[]> => {
          const fetchConceptsByClass = (classUuid: string) => {
            const urlParts = apiUrl.split('searchType=fuzzy');
            const url = `${urlParts[0]}searchType=fuzzy&class=${classUuid}&${urlParts[1] || ''}`;
            return openmrsFetch(url).then(({ data }) => {
              return data.results;
            });
          };

          return Promise.all(config.class.map(fetchConceptsByClass))
            .then((results) => results.flat())
            .catch((error) => {
              console.error('Error fetching data:', error);
              return [];
            });
        };

        return fetchAllConcepts();
      }
    }

    if (config?.concept && config?.useSetMembersByConcept) {
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
