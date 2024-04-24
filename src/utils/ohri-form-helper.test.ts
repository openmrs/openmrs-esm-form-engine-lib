import { findConceptByReference } from './form-helper';

describe('Form Engine Helper', () => {
  describe('findConceptByReference', () => {
    const concepts = [
      {
        uuid: '3cd6f600-26fe-102b-80cb-0017a47871b2',
        display: 'Yes',
        conceptMappings: [
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'SNOMED CT',
              },
              code: '373066001',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'PIH',
              },
              code: 'YES',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'CIEL',
              },
              code: '1065',
            },
          },
        ],
      },
      {
        uuid: '3cd6f86c-26fe-102b-80cb-0017a47871b2',
        display: 'No',
        conceptMappings: [
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'PIH',
              },
              code: 'NO',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'CIEL',
              },
              code: '1066',
            },
          },
          {
            conceptReferenceTerm: {
              conceptSource: {
                name: 'SNOMED CT',
              },
              code: '373067005',
            },
          },
        ],
      },
    ];

    it('should find concept by mapping', () => {
      expect(findConceptByReference('CIEL:1066', concepts).uuid).toBe('3cd6f86c-26fe-102b-80cb-0017a47871b2');
    });
    it('should find concept by uuid', () => {
      expect(findConceptByReference('3cd6f86c-26fe-102b-80cb-0017a47871b2', concepts).uuid).toBe(
        '3cd6f86c-26fe-102b-80cb-0017a47871b2',
      );
    });
    it('should return undefined if no match', () => {
      expect(findConceptByReference('CIEL:9999', concepts)).toBeUndefined();
    });
    it('should return undefined if null input', () => {
      expect(findConceptByReference(null, concepts)).toBeUndefined();
    });
  });
});
