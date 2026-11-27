import { act, renderHook } from '@testing-library/react';
import { useFormJson } from '../useFormJson';

jest.mock('../../api', () => ({
  fetchOpenMRSForm: jest.fn().mockResolvedValue({ uuid: 'mock-uuid' }),
  fetchClobData: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../registry/registry', () => ({
  getRegisteredFormSchemaTransformers: jest.fn().mockResolvedValue([]),
}));

describe('useFormJson translations logic', () => {
  beforeEach(() => {
    // @ts-ignore
    window.i18next = {
      language: 'en',
      addResourceBundle: jest.fn(),
    };
  });

  const runHookWithTranslations = async (translations: any) => {
    const rawFormJson = {
      name: 'Test Form',
      pages: [],
      translations,
    };

    let hook: any;
    await act(async () => {
      hook = renderHook(() => useFormJson(null as any, rawFormJson, null as any, null as any));
    });

    return hook;
  };

  it('Exact match (`en` vs `en`) -> addResourceBundle called', async () => {
    window.i18next.language = 'en';
    await runHookWithTranslations({ language: 'en', key: 'value' });
    expect(window.i18next.addResourceBundle).toHaveBeenCalledWith(
      'en',
      '@openmrs/esm-form-engine-app',
      expect.any(Object),
      true,
      true,
    );
  });

  it('Form has region tag, session is base (`fr-CA` form vs `fr` session) -> called', async () => {
    window.i18next.language = 'fr';
    await runHookWithTranslations({ language: 'fr-CA', key: 'value' });
    expect(window.i18next.addResourceBundle).toHaveBeenCalledWith(
      'fr',
      '@openmrs/esm-form-engine-app',
      expect.any(Object),
      true,
      true,
    );
  });

  it('Session has region tag, form is base (`fr` form vs `fr-CA` session) -> called', async () => {
    window.i18next.language = 'fr-CA';
    await runHookWithTranslations({ language: 'fr', key: 'value' });
    expect(window.i18next.addResourceBundle).toHaveBeenCalledWith(
      'fr-CA',
      '@openmrs/esm-form-engine-app',
      expect.any(Object),
      true,
      true,
    );
  });

  it('Locale mismatch (`en` session vs `fr` form) -> NOT called', async () => {
    window.i18next.language = 'en';
    await runHookWithTranslations({ language: 'fr', key: 'value' });
    expect(window.i18next.addResourceBundle).not.toHaveBeenCalled();
  });

  it('translations object exists but has no language field -> NOT called', async () => {
    window.i18next.language = 'en';
    await runHookWithTranslations({ key: 'value' });
    expect(window.i18next.addResourceBundle).not.toHaveBeenCalled();
  });

  it('formJson.translations is undefined -> NOT called, no crash', async () => {
    window.i18next.language = 'en';
    await runHookWithTranslations(undefined);
    expect(window.i18next.addResourceBundle).not.toHaveBeenCalled();
  });
});
