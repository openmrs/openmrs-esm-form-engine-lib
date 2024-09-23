import { act, renderHook } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { when } from 'jest-when';
import { useFormJson } from './useFormJson';
import artComponentBody from '__mocks__/forms/rfe-forms/component_art.json';
import artComponentSkeleton from '__mocks__/forms/afe-forms/component_art.json';
import formComponentBody from '__mocks__/forms/rfe-forms/form-component.json';
import formComponentSkeleton from '__mocks__/forms/afe-forms/form-component.json';
import miniFormBody from '__mocks__/forms/rfe-forms/mini-form.json';
import miniFormSkeleton from '__mocks__/forms/afe-forms/mini-form.json';
import nestedForm1Body from '__mocks__/forms/rfe-forms/nested-form1.json';
import nestedForm1Skeleton from '__mocks__/forms/afe-forms/nested-form1.json';
import nestedForm2Body from '__mocks__/forms/rfe-forms/nested-form2.json';
import nestedForm2Skeleton from '__mocks__/forms/afe-forms/nested-form2.json';
import preclinicReviewComponentBody from '__mocks__/forms/rfe-forms/component_preclinic-review.json';
import preclinicReviewComponentSkeleton from '__mocks__/forms/afe-forms/component_preclinic-review.json';

const MINI_FORM_NAME = 'Mini Form';
const MINI_FORM_UUID = '112d73b4-79e5-4be8-b9ae-d0840f00d4cf';
const MINI_FORM_SCHEMA_VALUE_REF = '6bd7ba90-d2d6-4f81-9f09-7d1f23346a1c';

const PARENT_FORM_NAME = 'Nested Form One';
const PARENT_FORM_UUID = 'af7c1fe6-d669-414e-b066-e9733f0de7a8';
const PARENT_FORM_SCHEMA_VALUE_REF = '1ad1fccc-d279-46a0-8980-1d91afd6ba67';

const SUB_FORM_NAME = 'Nested Form Two';
const SUB_FORM_UUID = '8304e5ff-6324-4863-ac51-8fcbc6812b13';
const SUB_FORM_SCHEMA_VALUE_REF = 'ca52a95c-8bb4-4a9f-a0cf-f0df437592da';

const COMPONENT_FORM_NAME = 'Form Component';
const COMPONENT_FORM_UUID = 'af7c1fe6-d669-414e-b066-e9733f0de7b8';
const COMPONENT_FORM_SCHEMA_VALUE_REF = '74d06044-850f-11ee-b9d1-0242ac120002';
const COMPONENT_ART = 'component_art';
const COMPONENT_ART_UUID = '2f063f32-7f8a-11ee-b962-0242ac120002';
const COMPONENT_ART_SCHEMA_VALUE_REF = '74d06044-850f-11ee-b9d1-0242ac120003';
const COMPONENT_PRECLINIC_REVIEW = 'component_preclinic-review';
const COMPONENT_PRECLINIC_REVIEW_UUID = '2f063f32-7f8a-11ee-b962-0242ac120004';
const COMPONENT_PRECLINIC_REVIEW_SCHEMA_VALUE_REF = '74d06044-850f-11ee-b9d1-0242ac120004';
const NON_EXISTENT_FORM_NAME = 'non-existent-form';

// Base setup
const mockOpenmrsFetch = openmrsFetch as jest.Mock;
mockOpenmrsFetch.mockImplementation(jest.fn());

// parent form
when(mockOpenmrsFetch)
  .calledWith(buildPath(PARENT_FORM_NAME))
  .mockResolvedValue({ data: { results: [nestedForm1Skeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(PARENT_FORM_UUID)).mockResolvedValue({ data: nestedForm1Skeleton });
when(mockOpenmrsFetch).calledWith(buildPath(PARENT_FORM_SCHEMA_VALUE_REF)).mockResolvedValue({ data: nestedForm1Body });

// sub form
when(mockOpenmrsFetch)
  .calledWith(buildPath(SUB_FORM_NAME))
  .mockResolvedValue({ data: { results: [nestedForm2Skeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(SUB_FORM_UUID)).mockResolvedValue({ data: nestedForm2Skeleton });
when(mockOpenmrsFetch).calledWith(buildPath(SUB_FORM_SCHEMA_VALUE_REF)).mockResolvedValue({ data: nestedForm2Body });

// mini form
when(mockOpenmrsFetch)
  .calledWith(buildPath(MINI_FORM_NAME))
  .mockResolvedValue({ data: { results: [miniFormSkeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(MINI_FORM_UUID)).mockResolvedValue({ data: miniFormSkeleton });
when(mockOpenmrsFetch).calledWith(buildPath(MINI_FORM_SCHEMA_VALUE_REF)).mockResolvedValue({ data: miniFormBody });

// form components
when(mockOpenmrsFetch)
  .calledWith(buildPath(COMPONENT_FORM_NAME))
  .mockResolvedValue({ data: { results: [formComponentSkeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(COMPONENT_FORM_UUID)).mockResolvedValue({ data: formComponentSkeleton });
when(mockOpenmrsFetch)
  .calledWith(buildPath(COMPONENT_FORM_SCHEMA_VALUE_REF))
  .mockResolvedValue({ data: formComponentBody });

when(mockOpenmrsFetch)
  .calledWith(buildPath(COMPONENT_ART))
  .mockResolvedValue({ data: { results: [artComponentSkeleton] } });

when(mockOpenmrsFetch).calledWith(buildPath(COMPONENT_ART_UUID)).mockResolvedValue({ data: artComponentSkeleton });
when(mockOpenmrsFetch)
  .calledWith(buildPath(COMPONENT_ART_SCHEMA_VALUE_REF))
  .mockResolvedValue({ data: artComponentBody });

when(mockOpenmrsFetch)
  .calledWith(buildPath(COMPONENT_PRECLINIC_REVIEW))
  .mockResolvedValue({ data: { results: [preclinicReviewComponentSkeleton] } });

when(mockOpenmrsFetch)
  .calledWith(buildPath(COMPONENT_PRECLINIC_REVIEW_UUID))
  .mockResolvedValue({ data: preclinicReviewComponentSkeleton });
when(mockOpenmrsFetch)
  .calledWith(buildPath(COMPONENT_PRECLINIC_REVIEW_SCHEMA_VALUE_REF))
  .mockResolvedValue({ data: preclinicReviewComponentBody });

when(mockOpenmrsFetch)
  .calledWith(buildPath(NON_EXISTENT_FORM_NAME))
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
    // setup and execute
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
