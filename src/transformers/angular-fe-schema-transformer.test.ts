import { AngularFormEngineSchemaTransformer } from './angular-fe-schema-transformer';
import testForm from '__mocks__/forms/omrs-forms/afe-schema-trasformer-form.json';

const expectedTransformedSchema = {
  name: 'AFE form with aliased questions',
  pages: [
    {
      label: 'Page 1',
      sections: [
        {
          label: 'Section 1',
          questions: [
            {
              label: 'Multi Checkbox',
              type: 'obs',
              id: 'dem_multi_checkbox',
              questionOptions: {
                rendering: 'checkbox',
              },
            },
            {
              label: 'Numeric',
              id: 'dem_numeric',
              type: 'obs',
              questionOptions: {
                rendering: 'number',
              },
            },
            {
              label: 'Encounter Provider',
              id: 'dem_encounter_provider',
              type: 'encounterProvider',
              questionOptions: {
                rendering: 'encounter-provider',
              },
            },
            {
              id: 'dem_encounter_location',
              type: 'obsGroup',
              questionOptions: {
                rendering: 'group',
              },
              questions: [
                {
                  label: 'Encounter Location',
                  type: 'encounterLocation',
                  questionOptions: {
                    rendering: 'encounter-location',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe('AFE form schema transformer', () => {
  it('should transform AFE schema to be compatible with RFE', () => {
    expect(AngularFormEngineSchemaTransformer.transform(testForm as any)).toEqual(expectedTransformedSchema);
  });
});
