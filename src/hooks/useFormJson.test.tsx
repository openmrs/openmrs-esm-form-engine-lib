import { act, renderHook } from '@testing-library/react';
import { useFormJson } from './useFormJson';
import { openmrsFetch } from '@openmrs/esm-framework';
import { when } from 'jest-when';
import miniFormSkeleton from '../../__mocks__/forms/omrs-forms/mini-form.json';
import miniFormBody from '../../__mocks__/forms/ohri-forms/mini-form.json';
import nestedForm1Skeleton from '../../__mocks__/forms/omrs-forms/nested-form1.json';
import nestedForm2Skeleton from '../../__mocks__/forms/omrs-forms/nested-form2.json';
import nestedForm1Body from '../../__mocks__/forms/ohri-forms/nested-form1.json';
import nestedForm2Body from '../../__mocks__/forms/ohri-forms/nested-form2.json';

const MINI_FORM_NAME = 'Mini Form';
const MINI_FORM_UUID = '112d73b4-79e5-4be8-b9ae-d0840f00d4cf';
const MINI_FORM_SCHEMA_VALUE_REF = '6bd7ba90-d2d6-4f81-9f09-7d1f23346a1c';

const PARENT_FORM_NAME = 'Nested Form One';
const PARENT_FORM_UUID = 'af7c1fe6-d669-414e-b066-e9733f0de7a8';
const PARENT_FORM_SCHEMA_VALUE_REF = '1ad1fccc-d279-46a0-8980-1d91afd6ba67';

const SUB_FORM_NAME = 'Nested Form Two';
const SUB_FORM_UUID = '8304e5ff-6324-4863-ac51-8fcbc6812b13';
const SUB_FORM_SCHEMA_VALUE_REF = 'ca52a95c-8bb4-4a9f-a0cf-f0df437592da';

// Base setup
const mockOpenmrsFetch = openmrsFetch as jest.Mock;
mockOpenmrsFetch.mockImplementation(jest.fn());

// parent form
when(mockOpenmrsFetch).calledWith(buildPath(PARENT_FORM_NAME)).mockResolvedValue({ data: { results: [nestedForm1Skeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(PARENT_FORM_UUID)).mockResolvedValue({ data:  nestedForm1Skeleton } );
when(mockOpenmrsFetch).calledWith(buildPath(PARENT_FORM_SCHEMA_VALUE_REF)).mockResolvedValue({ data: nestedForm1Body });

// sub form
when(mockOpenmrsFetch).calledWith(buildPath(SUB_FORM_NAME)).mockResolvedValue({ data: { results: [nestedForm2Skeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(SUB_FORM_UUID)).mockResolvedValue({ data: nestedForm2Skeleton  });
when(mockOpenmrsFetch).calledWith(buildPath(SUB_FORM_SCHEMA_VALUE_REF)).mockResolvedValue({ data: nestedForm2Body });

// mini form
when(mockOpenmrsFetch).calledWith(buildPath(MINI_FORM_NAME)).mockResolvedValue({ data: { results: [miniFormSkeleton] } });
when(mockOpenmrsFetch).calledWith(buildPath(MINI_FORM_UUID)).mockResolvedValue({ data: miniFormSkeleton });
when(mockOpenmrsFetch).calledWith(buildPath(MINI_FORM_SCHEMA_VALUE_REF)).mockResolvedValue({ data: miniFormBody });

describe('useFormJson', () => {


  it('should fetch basic form by name', async () => {
    let hook = null;
    await act(async () => {
        hook = renderHook(() => useFormJson(MINI_FORM_NAME, null, null, null));
    });

    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.error).toBe(undefined);
    expect(hook.result.current.formJson.name).toBe(MINI_FORM_NAME)
  });

  it('should fetch basic form by UUID', async () => {
    let hook = null;
    await act(async () => {
        hook = renderHook(() => useFormJson(MINI_FORM_UUID, null, null, null));
    });

    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.error).toBe(undefined);
    expect(hook.result.current.formJson.name).toBe(MINI_FORM_NAME);
  });

  fit('should load form with nested subforms', async () => {
    let hook = null;
    await act(async () => {
        hook = renderHook(() => useFormJson(PARENT_FORM_NAME, null, null, null));
    });
    
    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.error).toBe(undefined);
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
    expect(hook.result.current.error).toBe(undefined);
    expect(hook.result.current.formJson.name).toBe(PARENT_FORM_NAME);
    
    // verify subforms
    verifyEmbeddedForms(hook.result.current.formJson);
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