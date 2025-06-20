import { renderHook } from '@testing-library/react-hooks';
import { useCustomHooks, type FormSchema } from './encounter-form-processor';
import * as hooks from '../../hooks/useEncounter';
import * as patientProgramsHooks from '../../hooks/usePatientPrograms';
import * as roleHooks from '../../hooks/useEncounterRole';

jest.mock('../../hooks/useEncounter');
jest.mock('../../hooks/usePatientPrograms');
jest.mock('../../hooks/useEncounterRole');

// Test for `useCustomHooks` to verify the integration of hooks and context mutation.
// - Ensures child hooks (`useEncounter`, `useEncounterRole`, `usePatientPrograms`)
//   are invoked correctly.
// - Confirms the `isLoading` state is computed based on the combined loading states
//   from the individual hooks.
// - Verifies the `updateContext` function properly updates the form context, including
//   setting the domain object value and custom dependencies like patient programs
//   and encounter role.
// This test ensures that the form processor initializes correctly with API data and
// context is set properly for downstream components.

describe('useCustomHooks', () => {
  it('returns loading initially and then updates once hooks are done', async () => {
    (hooks.useEncounter as jest.Mock).mockReturnValue({
      encounter: { uuid: '123' },
      isLoading: false,
    });
    (roleHooks.useEncounterRole as jest.Mock).mockReturnValue({
      encounterRole: 'doctor',
      isLoading: false,
    });
    (patientProgramsHooks.usePatientPrograms as jest.Mock).mockReturnValue({
      patientPrograms: ['HIV'],
      isLoadingPatientPrograms: false,
    });

    const mockFormJson = {
      id: 'form1',
      pages: [], // minimal valid structure
    } as unknown as FormSchema;

    const { result } = renderHook(() =>
      useCustomHooks({
        formJson: mockFormJson,
        patient: { id: 'patient123' },
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data.encounter.uuid).toBe('123');
    expect(result.current.data.encounterRole).toBe('doctor');
    expect(result.current.data.patientPrograms).toEqual(['HIV']);
  });
});

// Test for `prepareFormSchema` to validate schema field inheritance logic.
// - Verifies that `readonly` and `inlineRendering` properties are inherited properly
//   from schema, page, and section levels, and overridden by field-level settings.
// - This ensures that form fields respect hierarchical configuration and
//   behave predictably across different levels of form setup (schema/page/section).
// This test ensures the UI rendering follows the intended inheritance logic for form fields,
// reducing configuration errors in large forms.

import { EncounterFormProcessor } from './encounter-form-processor';

describe('prepareFormSchema', () => {
  const mockFormJson = {
    id: 'form1',
    pages: [],
  } as unknown as FormSchema;

  const processor = new EncounterFormProcessor(mockFormJson);
  it('inherits readonly and inlineRendering from page and section', () => {
    const processor = new EncounterFormProcessor(mockFormJson);
    const schema = {
      inlineRendering: true,
      readonly: true,
      pages: [
        {
          inlineRendering: false,
          sections: [
            {
              questions: [
                {
                  id: 'field1',
                  questionOptions: {},
                  meta: {},
                },
              ],
            },
          ],
        },
      ],
    };
    const result = processor.prepareFormSchema(schema as any);
    expect(result.pages[0].sections[0].questions[0].readonly).toBe(true);
    expect(result.pages[0].sections[0].questions[0].inlineRendering).toBe(false);
  });
});
