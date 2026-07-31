import { type FormField, type FormProcessorContextProps } from '../types';
import { EncounterProviderAdapter } from './encounter-provider-adapter';
import { it, describe, expect } from 'vitest';

const field: FormField = {
  label: 'Provider',
  type: 'encounterProvider',
  questionOptions: { rendering: 'encounter-provider' },
  id: 'encounter-provider',
};

const baseContext = {
  currentProvider: { uuid: 'session-provider-uuid' },
} as unknown as FormProcessorContextProps;

const encounterWithProvider = {
  uuid: 'encounter-uuid',
  encounterProviders: [{ provider: { uuid: 'saved-provider-uuid', display: 'Saved Provider' } }],
};

describe('EncounterProviderAdapter - getInitialValue', () => {
  it('returns the saved provider UUID when an encounter with providers exists', () => {
    const result = EncounterProviderAdapter.getInitialValue(field, encounterWithProvider as any, baseContext);
    expect(result).toBe('saved-provider-uuid');
  });

  it('returns the last provider UUID when the encounter has multiple providers', () => {
    const encounter = {
      uuid: 'encounter-uuid',
      encounterProviders: [{ provider: { uuid: 'first-provider-uuid' } }, { provider: { uuid: 'last-provider-uuid' } }],
    };
    const result = EncounterProviderAdapter.getInitialValue(field, encounter as any, baseContext);
    expect(result).toBe('last-provider-uuid');
  });

  it('falls back to the current session provider UUID when there is no encounter', () => {
    const result = EncounterProviderAdapter.getInitialValue(field, null, baseContext);
    expect(result).toBe('session-provider-uuid');
  });

  it('falls back to the current session provider UUID when the encounter has no providers', () => {
    const encounter = { uuid: 'encounter-uuid', encounterProviders: [] };
    const result = EncounterProviderAdapter.getInitialValue(field, encounter as any, baseContext);
    expect(result).toBe('session-provider-uuid');
  });

  it('returns undefined when there is no encounter and no session provider', () => {
    const context = { ...baseContext, currentProvider: null } as unknown as FormProcessorContextProps;
    const result = EncounterProviderAdapter.getInitialValue(field, null, context);
    expect(result).toBeUndefined();
  });
});
