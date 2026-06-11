import { describe, it, expect } from 'vitest';
import { getMutableSessionProps } from './encounter-processor-helper';
import { type FormContextProps } from '../../provider/form-provider';
import { type FormField } from '../../types';

describe('getMutableSessionProps', () => {
  const sessionDate = new Date('2026-06-10T17:00:00.000Z');

  const buildContext = (overrides: Record<string, unknown> = {}) =>
    ({
      formFields: [],
      location: { uuid: 'session-location-uuid' },
      currentProvider: { uuid: 'current-provider-uuid' },
      customDependencies: { defaultEncounterRole: { uuid: 'default-role-uuid' } },
      sessionDate,
      domainObjectValue: null,
      ...overrides,
    } as unknown as FormContextProps);

  it('should use the encounterDatetime field submission value when present', () => {
    const explicitDate = new Date('2026-06-10T10:30:00.000Z');
    const context = buildContext({
      formFields: [
        {
          id: 'encDate',
          type: 'encounterDatetime',
          questionOptions: { rendering: 'datetime' },
          meta: { submission: { newValue: explicitDate } },
        } as unknown as FormField,
      ],
    });

    expect(getMutableSessionProps(context).encounterDate).toEqual(explicitDate);
  });

  it('should fall back to the session date for new encounters so the backend does not default to "now"', () => {
    const context = buildContext();

    expect(getMutableSessionProps(context).encounterDate).toEqual(sessionDate);
  });

  it('should preserve the existing encounter datetime when editing without changing the date', () => {
    const context = buildContext({
      domainObjectValue: {
        uuid: 'encounter-uuid',
        encounterDatetime: '2026-06-01T10:00:00.000Z',
        location: { uuid: 'encounter-location-uuid' },
      },
    });

    expect(getMutableSessionProps(context).encounterDate).toEqual(new Date('2026-06-01T10:00:00.000Z'));
  });
});
