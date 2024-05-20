import { AngularFormEngineSchemaTransformer } from './angular-fe-schema-transformer';
import testForm from '__mocks__/forms/afe-forms/afe-schema-trasformer-form.json';

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
              label: 'Encounter Role',
              id: 'dem_encounter_role',
              type: 'encounterRole',
              questionOptions: {
                rendering: 'encounter-role',
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
            {
              id: 'labOrder',
              type: 'testOrder',
              label: 'Add Lab Order',
              questionOptions: {
                rendering: 'repeating',
                concept: 'f1742346-cf43-4a17-8c98-720e3f487fc0',
                orderType: 'testorder',
                orderSettingUuid: 'INPATIENT',
                repeatOptions: {
                  limit: 2,
                },
                answers: [
                  {
                    concept: '30e2da8f-34ca-4c93-94c8-d429f22d381c',
                    label: 'Option 1',
                  },
                  {
                    concept: '143264AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                    label: 'Option 2',
                  },
                ],
              },
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
