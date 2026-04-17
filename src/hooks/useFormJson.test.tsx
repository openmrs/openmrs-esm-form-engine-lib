import { act, renderHook } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { when } from 'jest-when';
import { useFormJson } from './useFormJson';
import {
  artComponentBody,
  artComponentSkeleton,
  formComponentBody,
  formComponentSkeleton,
  miniFormBody,
  miniFormSkeleton,
  nestedForm1Body,
  nestedForm1Skeleton,
  nestedForm2Body,
  nestedForm2Skeleton,
  preclinicReviewComponentBody,
  preclinicReviewComponentSkeleton,
} from '__mocks__/forms';

const MINI_FORM_NAME = 'Mini Form';
const MINI_FORM_UUID = '112d73b4-79e5-4be8-b9ae-d0840f00d4cf';

const PARENT_FORM_NAME = 'Nested Form One';
const PARENT_FORM_UUID = 'af7c1fe6-d669-414e-b066-e9733f0de7a8';

const SUB_FORM_NAME = 'Nested Form Two';
const SUB_FORM_UUID = '8304e5ff-6324-4863-ac51-8fcbc6812b13';

const COMPONENT_FORM_NAME = 'Form Component';
const COMPONENT_FORM_UUID = 'af7c1fe6-d669-414e-b066-e9733f0de7b8';
const COMPONENT_ART = 'component_art';
const COMPONENT_ART_UUID = '2f063f32-7f8a-11ee-b962-0242ac120002';
const COMPONENT_PRECLINIC_REVIEW = 'component_preclinic-review';
const COMPONENT_PRECLINIC_REVIEW_UUID = '2f063f32-7f8a-11ee-b962-0242ac120004';
const NON_EXISTENT_FORM_NAME = 'non-existent-form';

// Base setup. The form engine now uses /o3/forms/{uuid} for fully resolved
// schemas and only falls back to /form?q={name} for non-UUID name resolution.
const mockOpenmrsFetch = openmrsFetch as jest.Mock;
mockOpenmrsFetch.mockImplementation(jest.fn());

// parent form
when(mockOpenmrsFetch)
  .calledWith(buildPath(`form?q=${PARENT_FORM_NAME}`))
  .mockResolvedValue({ data: { results: [nestedForm1Skeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(`o3/forms/${PARENT_FORM_UUID}`)).mockResolvedValue({ data: nestedForm1Body });

// sub form
when(mockOpenmrsFetch)
  .calledWith(buildPath(`form?q=${SUB_FORM_NAME}`))
  .mockResolvedValue({ data: { results: [nestedForm2Skeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(`o3/forms/${SUB_FORM_UUID}`)).mockResolvedValue({ data: nestedForm2Body });

// mini form
when(mockOpenmrsFetch)
  .calledWith(buildPath(`form?q=${MINI_FORM_NAME}`))
  .mockResolvedValue({ data: { results: [miniFormSkeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(`o3/forms/${MINI_FORM_UUID}`)).mockResolvedValue({ data: miniFormBody });

// form components
when(mockOpenmrsFetch)
  .calledWith(buildPath(`form?q=${COMPONENT_FORM_NAME}`))
  .mockResolvedValue({ data: { results: [formComponentSkeleton] } });
when(mockOpenmrsFetch)
  .calledWith(buildPath(`o3/forms/${COMPONENT_FORM_UUID}`))
  .mockResolvedValue({ data: formComponentBody });

when(mockOpenmrsFetch)
  .calledWith(buildPath(`form?q=${COMPONENT_ART}`))
  .mockResolvedValue({ data: { results: [artComponentSkeleton] } });
when(mockOpenmrsFetch)
  .calledWith(buildPath(`o3/forms/${COMPONENT_ART_UUID}`))
  .mockResolvedValue({ data: artComponentBody });

when(mockOpenmrsFetch)
  .calledWith(buildPath(`form?q=${COMPONENT_PRECLINIC_REVIEW}`))
  .mockResolvedValue({ data: { results: [preclinicReviewComponentSkeleton] } });
when(mockOpenmrsFetch)
  .calledWith(buildPath(`o3/forms/${COMPONENT_PRECLINIC_REVIEW_UUID}`))
  .mockResolvedValue({ data: preclinicReviewComponentBody });

when(mockOpenmrsFetch)
  .calledWith(buildPath(`form?q=${NON_EXISTENT_FORM_NAME}`))
  .mockResolvedValue({ data: { results: [] } });

describe('useFormJson', () => {
  it('should fetch basic form by name', async () => {
    let hook = null;
    await act(async () => {
      hook = renderHook(() => useFormJson(MINI_FORM_NAME, null, null, null));
    });

    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.formError).toBe(undefined);
    expect(hook.result.current.formJson.name).toBe(MINI_FORM_NAME);
  });

  it('should fetch basic form by UUID', async () => {
    let hook = null;
    await act(async () => {
      hook = renderHook(() => useFormJson(MINI_FORM_UUID, null, null, null));
    });

    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.formError).toBe(undefined);
    expect(hook.result.current.formJson.name).toBe(MINI_FORM_NAME);
  });

  it('should load form with nested subforms', async () => {
    let hook = null;
    await act(async () => {
      hook = renderHook(() => useFormJson(PARENT_FORM_NAME, null, null, null));
    });

    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.formError).toBe(undefined);
    expect(hook.result.current.formJson.name).toBe(PARENT_FORM_NAME);

    // verify subforms
    verifyEmbeddedForms(hook.result.current.formJson);
  });

  it('should load subforms for raw form json', async () => {
    let hook = null;
    await act(async () => {
      hook = renderHook(() => useFormJson(null, nestedForm1Body, null, null));
    });

    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.formError).toBe(undefined);
    expect(hook.result.current.formJson.name).toBe(PARENT_FORM_NAME);

    // verify subforms
    verifyEmbeddedForms(hook.result.current.formJson);
  });

  it('should load form components in combined raw form json', async () => {
    let hook = null;
    await act(async () => {
      hook = renderHook(() => useFormJson(null, formComponentBody, null, null));
    });
    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.formError).toBe(undefined);
    expect(hook.result.current.formJson.name).toBe(COMPONENT_FORM_NAME);

    // verify form components have been loaded
    verifyFormComponents(hook.result.current.formJson);
  });

  it('should return an error when the form is not found', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    let hook = null;
    await act(async () => {
      hook = renderHook(() => useFormJson(NON_EXISTENT_FORM_NAME, null, null, null));
    });
    // verify
    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.formError.message).toBe(
      'Error loading form JSON: Form with ID "non-existent-form" was not found',
    );
    expect(hook.result.current.formJson).toBe(null);
    mockConsoleError.mockRestore();
  });

  it('fetches the schema via /o3/forms/{uuid} when given a UUID, with no /form/ or /clobdata/ calls', async () => {
    mockOpenmrsFetch.mockClear();
    await act(async () => {
      renderHook(() => useFormJson(MINI_FORM_UUID, null, null, null));
    });

    const calledUrls = mockOpenmrsFetch.mock.calls.map(([url]) => url);
    expect(calledUrls.some((url) => url.includes(`o3/forms/${MINI_FORM_UUID}`))).toBe(true);
    expect(calledUrls.some((url) => /\/form\/[a-f0-9-]+\?v=full/.test(url))).toBe(false);
    expect(calledUrls.some((url) => url.includes('/clobdata/'))).toBe(false);
  });

  it('does not re-fetch the root schema when rawFormJson is supplied', async () => {
    mockOpenmrsFetch.mockClear();
    await act(async () => {
      renderHook(() => useFormJson(PARENT_FORM_UUID, nestedForm1Body, null, null));
    });

    const calledUrls = mockOpenmrsFetch.mock.calls.map(([url]) => url);
    // The root schema is taken from rawFormJson, so no /o3/forms/{PARENT_FORM_UUID} call
    expect(calledUrls.some((url) => url.includes(`o3/forms/${PARENT_FORM_UUID}`))).toBe(false);
  });

  it('loads subforms via /o3/forms/{uuid}, not via /form/{uuid}?v=full + /clobdata/', async () => {
    mockOpenmrsFetch.mockClear();
    let hook = null;
    await act(async () => {
      hook = renderHook(() => useFormJson(PARENT_FORM_UUID, null, null, null));
    });
    expect(hook.result.current.formError).toBe(undefined);

    const calledUrls = mockOpenmrsFetch.mock.calls.map(([url]) => url);
    // root + subform both go through the bundled endpoint
    expect(calledUrls.some((url) => url.includes(`o3/forms/${PARENT_FORM_UUID}`))).toBe(true);
    expect(calledUrls.some((url) => url.includes(`o3/forms/${SUB_FORM_UUID}`))).toBe(true);
    // legacy paths must not be hit
    expect(calledUrls.some((url) => /\/form\/[a-f0-9-]+\?v=full/.test(url))).toBe(false);
    expect(calledUrls.some((url) => url.includes('/clobdata/'))).toBe(false);
  });

  it('preserves referencedConcepts bundled in the schema', async () => {
    const bundledConcepts = [
      {
        uuid: '164400AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        display: 'Test concept',
        conceptClass: { uuid: 'a82ef63c-e4e4-48d6-988a-fdd74d7541a7', display: 'Question' },
        answers: [],
        conceptMappings: [],
      },
    ];
    const formWithBundledConcepts = { ...miniFormBody, referencedConcepts: bundledConcepts };

    let hook = null;
    await act(async () => {
      hook = renderHook(() => useFormJson(null, formWithBundledConcepts, null, null));
    });

    expect(hook.result.current.formError).toBe(undefined);
    expect(hook.result.current.formJson.referencedConcepts).toEqual(bundledConcepts);
  });
});

function buildPath(path: string) {
  return when((url: string) => url.includes(path));
}

function verifyEmbeddedForms(formJson) {
  // assert that the nestedForm2's (level one subform) pages have been aligned with the parent because they share the same encounterType
  expect(formJson.pages.length).toBe(3);
  // the mini form (it's not flattened into the parent form because it has a different encounterType)
  const nestedSubform = formJson.pages[2].subform.form;
  expect(nestedSubform.name).toBe(MINI_FORM_NAME);
  expect(nestedSubform.pages.length).toBe(1);
}

function verifyFormComponents(formJson) {
  // assert that alias has been replaced with the actual component
  expect(formJson.pages.length).toBe(2);
}
