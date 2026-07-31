import { describe, it, expect } from 'vitest';
import { getMutableSessionProps, prepareEncounter } from './encounter-processor-helper';
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
      patient: { id: 'patient-uuid' },
      formJson: { uuid: 'form-uuid', encounterType: 'encounter-type-uuid' },
      deletedFields: [],
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

  it('should not default new active visit encounters to the browser session date', () => {
    const context = buildContext({
      visit: {
        uuid: 'active-visit-uuid',
        startDatetime: '2026-06-10T09:00:00.000Z',
      },
    });

    expect(getMutableSessionProps(context).encounterDate).toBeUndefined();
  });

  it('should not default new encounters without a visit to the browser session date', () => {
    const context = buildContext();

    expect(getMutableSessionProps(context).encounterDate).toBeUndefined();
  });

  it('should use the session date for new stopped visit encounters so the backend does not default outside the visit window', () => {
    const context = buildContext({
      visit: {
        uuid: 'stopped-visit-uuid',
        startDatetime: '2026-06-09T09:00:00.000Z',
        stopDatetime: '2026-06-10T18:00:00.000Z',
      },
    });

    expect(getMutableSessionProps(context).encounterDate).toEqual(sessionDate);
  });

  it('should omit encounterDatetime from new active visit encounter payloads when no encounter date is resolved', () => {
    const context = buildContext({
      visit: {
        uuid: 'active-visit-uuid',
        startDatetime: '2026-06-10T09:00:00.000Z',
      },
    });
    const { encounterDate, encounterRole, encounterProvider, encounterLocation } = getMutableSessionProps(context);

    const encounter = prepareEncounter(context, encounterDate, encounterRole, encounterProvider, encounterLocation);

    expect(encounter).not.toHaveProperty('encounterDatetime');
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
