import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { ConceptDataSource } from './concept-data-source';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const codedConceptRepresentation =
  'custom:(uuid,display,conceptClass:(uuid,display),mappings:(conceptMapType:(uuid,display),conceptReferenceTerm:(code,conceptSource:(uuid))))';
const codedSetMemberRepresentation =
  'custom:(uuid,setMembers:(uuid,display,mappings:(conceptMapType:(uuid,display),conceptReferenceTerm:(code,conceptSource:(uuid)))))';
const sameAsConceptMapTypeUuid = '35543629-7d8c-11e1-909d-c80aa9edcf4e';

describe('ConceptDataSource', () => {
  let dataSource: ConceptDataSource;

  beforeEach(() => {
    dataSource = new ConceptDataSource();
  });

  it('preserves search results without a mapping to the configured source', async () => {
    const sourceUuid = 'icd-11-source';
    const matchingConcept = {
      uuid: 'matching-concept',
      display: 'Cholera',
      conceptClass: { uuid: 'diagnosis-class' },
      mappings: [
        {
          conceptReferenceTerm: {
            code: '1A00',
            conceptSource: { uuid: sourceUuid },
          },
        },
      ],
    };
    const otherConcept = {
      uuid: 'other-concept',
      display: 'Other diagnosis',
      conceptClass: { uuid: 'diagnosis-class' },
      mappings: [
        {
          conceptReferenceTerm: {
            code: 'OTHER',
            conceptSource: { uuid: 'other-source' },
          },
        },
      ],
    };
    mockOpenmrsFetch.mockResolvedValueOnce({ data: { results: [matchingConcept, otherConcept] } } as any);

    const results = await dataSource.fetchData('cholera', {
      class: ['diagnosis-class'],
      conceptSourceUuid: sourceUuid,
    });

    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/concept?name=&searchType=fuzzy&v=${codedConceptRepresentation}&q=cholera`,
    );
    expect(results).toEqual([matchingConcept, otherConcept]);
  });

  it('prefers the SAME-AS terminology code without changing the persisted UUID or display', () => {
    const sourceUuid = 'icd-11-source';
    const concept = {
      uuid: 'diagnosis-uuid',
      display: 'Cholera',
      mappings: [
        {
          conceptMapType: {
            uuid: 'narrower-than-map-type',
            display: 'NARROWER-THAN',
          },
          conceptReferenceTerm: {
            code: '1A0Z',
            conceptSource: { uuid: sourceUuid },
          },
        },
        {
          conceptMapType: {
            uuid: sameAsConceptMapTypeUuid,
            display: 'SAME-AS',
          },
          conceptReferenceTerm: {
            code: '1A00',
            conceptSource: { uuid: sourceUuid },
          },
        },
      ],
    };

    expect(dataSource.toUuidAndDisplay(concept, { conceptSourceUuid: sourceUuid })).toEqual({
      ...concept,
      code: '1A00',
    });
  });

  it('falls back to the first mapping from the configured source', () => {
    const sourceUuid = 'icd-11-source';
    const concept = {
      uuid: 'diagnosis-uuid',
      display: 'Cholera',
      mappings: [
        {
          conceptMapType: {
            uuid: 'narrower-than-map-type',
            display: 'NARROWER-THAN',
          },
          conceptReferenceTerm: {
            code: '1A0Z',
            conceptSource: { uuid: sourceUuid },
          },
        },
      ],
    };

    expect(dataSource.toUuidAndDisplay(concept, { conceptSourceUuid: sourceUuid })).toEqual({
      ...concept,
      code: '1A0Z',
    });
  });

  it('omits the code when the concept has no mapping to the configured source', () => {
    const concept = {
      uuid: 'diagnosis-uuid',
      display: 'Typhoid arthritis',
      mappings: [],
    };

    expect(dataSource.toUuidAndDisplay(concept, { conceptSourceUuid: 'icd-11-source' })).toEqual(concept);
  });

  it('requests mappings when resolving a selected value for a configured source', async () => {
    const concept = { uuid: 'diagnosis-uuid', display: 'Cholera', mappings: [] };
    mockOpenmrsFetch.mockResolvedValueOnce({ data: concept } as any);

    const result = await dataSource.fetchSingleItem(concept.uuid, { conceptSourceUuid: 'icd-11-source' });

    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/concept/${concept.uuid}?v=${codedConceptRepresentation}`,
    );
    expect(result).toEqual(concept);
  });

  it('requests mapped members from the configured concept set', async () => {
    const setMember = { uuid: 'diagnosis-uuid', display: 'Cholera', mappings: [] };
    mockOpenmrsFetch.mockResolvedValueOnce({ data: { setMembers: [setMember] } } as any);

    const result = await dataSource.fetchData('cholera', {
      concept: 'diagnosis-concept-set',
      conceptSourceUuid: 'icd-11-source',
      useSetMembersByConcept: true,
    });

    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/concept/diagnosis-concept-set?v=${codedSetMemberRepresentation}&q=cholera`,
    );
    expect(result).toEqual([setMember]);
  });
});
