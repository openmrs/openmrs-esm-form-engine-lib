import { openmrsFetch, restBaseUrl, type OpenmrsResource } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';
import { isEmpty } from '../validators/form-validator';

const baseConceptRepresentation = 'custom:(uuid,display,conceptClass:(uuid,display))';
const codedConceptRepresentation =
  'custom:(uuid,display,conceptClass:(uuid,display),mappings:(conceptMapType:(uuid,display),conceptReferenceTerm:(code,conceptSource:(uuid))))';
const sameAsConceptMapTypeUuid = '35543629-7d8c-11e1-909d-c80aa9edcf4e';

interface ConceptMapping {
  conceptMapType?: {
    uuid?: string;
    display?: string;
  };
  conceptReferenceTerm?: {
    code?: string;
    conceptSource?: {
      uuid?: string;
    };
  };
}

interface ConceptResource extends OpenmrsResource {
  mappings?: Array<ConceptMapping>;
}

export class ConceptDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(`${restBaseUrl}/concept?v=${baseConceptRepresentation}`);
  }

  fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    if (isEmpty(config?.class) && isEmpty(config?.concept) && !config?.useSetMembersByConcept && isEmpty(searchTerm)) {
      return Promise.resolve([]);
    }

    const representation = config?.conceptSourceUuid ? codedConceptRepresentation : baseConceptRepresentation;
    let searchUrl = `${restBaseUrl}/concept?name=&searchType=fuzzy&v=${representation}`;
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
      const setMemberRepresentation = config?.conceptSourceUuid
        ? 'custom:(uuid,setMembers:(uuid,display,mappings:(conceptMapType:(uuid,display),conceptReferenceTerm:(code,conceptSource:(uuid)))))'
        : 'custom:(uuid,setMembers:(uuid,display))';
      searchUrl = `${urlParts[0]}/${config.concept}?v=${setMemberRepresentation}`;
      return openmrsFetch(searchTerm ? `${searchUrl}&q=${searchTerm}` : searchUrl).then(({ data }) => {
        // return the setMembers from the retrieved concept object
        return data['setMembers'];
      });
    }

    return openmrsFetch(searchTerm ? `${searchUrl}&q=${searchTerm}` : searchUrl).then(({ data }) => {
      return data.results;
    });
  }

  fetchSingleItem(uuid: string, config?: Record<string, any>): Promise<ConceptResource | null> {
    const representation = config?.conceptSourceUuid ? codedConceptRepresentation : baseConceptRepresentation;
    return openmrsFetch(`${restBaseUrl}/concept/${uuid}?v=${representation}`).then(({ data }) => data);
  }

  toUuidAndDisplay(data: ConceptResource, config?: Record<string, any>): OpenmrsResource {
    const item = super.toUuidAndDisplay(data);
    const code = this.getConceptSourceMapping(data, config?.conceptSourceUuid)?.conceptReferenceTerm?.code;
    return code ? { ...item, code } : item;
  }

  private getConceptSourceMapping(concept: ConceptResource, conceptSourceUuid?: string): ConceptMapping | undefined {
    if (!conceptSourceUuid) {
      return undefined;
    }

    const mappingsToSource =
      concept.mappings?.filter((mapping) => mapping.conceptReferenceTerm?.conceptSource?.uuid === conceptSourceUuid) ??
      [];
    return (
      mappingsToSource.find(
        (mapping) =>
          mapping.conceptMapType?.uuid === sameAsConceptMapTypeUuid ||
          mapping.conceptMapType?.display?.toUpperCase() === 'SAME-AS',
      ) ?? mappingsToSource[0]
    );
  }
}
