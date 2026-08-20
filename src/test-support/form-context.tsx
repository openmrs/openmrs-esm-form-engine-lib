import React, { useMemo, useReducer } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { vi } from 'vitest';
import { type Visit } from '@openmrs/esm-framework';
import { mockPatient, mockVisit } from '__mocks__';
import { FormProvider, type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormSchema } from '../types';
import { EncounterFormProcessor } from '../processors/encounter/encounter-form-processor';
import { inbuiltFieldValueAdapters } from '../registry/inbuilt-components/inbuiltFieldValueAdapters';
import { inbuiltValidators } from '../registry/inbuilt-components/inbuiltValidators';
import { formStateReducer, initialState } from '../components/renderer/form/state';
import { useFormStateHelpers } from '../hooks/useFormStateHelpers';
import { buildFormSchema } from './builders';

/**
 * A minimal, non-React stand-in for react-hook-form's `UseFormReturn`. `getValues`
 * and `setValue` operate on a plain record; `trigger` always passes. Sufficient for
 * exercising non-component logic that receives `methods` through the form context
 * (e.g. `validateForm`, submission preparation). Component tests should prefer
 * `renderWithFormContext`, which uses the real `useForm`.
 */
export function createFormMethodsStub(initialValues: Record<string, any> = {}): UseFormReturn<any> {
  const values: Record<string, any> = { ...initialValues };
  const stub = {
    getValues: (nameOrNames?: string | string[]) => {
      if (nameOrNames === undefined) {
        return { ...values };
      }
      if (Array.isArray(nameOrNames)) {
        return nameOrNames.map((name) => values[name]);
      }
      return values[nameOrNames];
    },
    setValue: (name: string, value: any) => {
      values[name] = value;
    },
    watch: (name?: string) => (typeof name === 'string' ? values[name] : { ...values }),
    trigger: vi.fn(async () => true),
    getFieldState: vi.fn(() => ({ isDirty: false, isTouched: false, invalid: false, error: undefined })),
    register: vi.fn(),
    unregister: vi.fn(),
    reset: vi.fn(),
    resetField: vi.fn(),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    setFocus: vi.fn(),
    handleSubmit: vi.fn(),
    formState: { isDirty: false, isValid: true, errors: {} },
    control: {},
  };
  return stub as unknown as UseFormReturn<any>;
}

/**
 * Builds a complete `FormContextProps` with sensible defaults, using the REAL
 * inbuilt adapters, validators, and `EncounterFormProcessor` so that tests exercise
 * production logic rather than mock echoes. Everything is overridable.
 *
 * This is the non-React layer; it does not render anything. For component tests use
 * `renderWithFormContext`.
 */
export function createTestFormContext(overrides: Partial<FormContextProps> = {}): FormContextProps {
  const formJson = overrides.formJson ?? buildFormSchema();
  const defaults = {
    patient: mockPatient as fhir.Patient,
    formJson,
    visit: mockVisit as unknown as Visit,
    sessionMode: 'enter' as const,
    sessionDate: new Date('2026-01-01T10:00:00.000Z'),
    location: mockVisit.location,
    currentProvider: { uuid: 'current-provider-uuid', display: 'Current Provider' },
    layoutType: 'small-desktop' as const,
    workspaceLayout: 'minimized' as const,
    processor: new EncounterFormProcessor(formJson),
    formFields: [] as FormField[],
    invalidFields: [] as FormField[],
    deletedFields: [] as FormField[],
    formFieldAdapters: Object.fromEntries(inbuiltFieldValueAdapters.map((entry) => [entry.type, entry.component])),
    formFieldValidators: Object.fromEntries(inbuiltValidators.map((entry) => [entry.name, entry.component])),
    customDependencies: {
      defaultEncounterRole: { uuid: 'clinician-role-uuid', display: 'Clinician' },
      patientPrograms: [],
    },
    methods: createFormMethodsStub(),
    getFormField: vi.fn(),
    addFormField: vi.fn(),
    updateFormField: vi.fn(),
    removeFormField: vi.fn(),
    addInvalidField: vi.fn(),
    removeInvalidField: vi.fn(),
    setInvalidFields: vi.fn(),
    setForm: vi.fn(),
    setDeletedFields: vi.fn(),
  };
  return { ...defaults, ...overrides } as FormContextProps;
}

export interface RenderWithFormContextOptions {
  /** Seeds the form-state reducer's `formFields`. Fields should be built with `buildField`. */
  fields?: FormField[];
  /** Defaults to a one-page/one-section schema wrapping `fields`. */
  formJson?: FormSchema;
  /** react-hook-form `defaultValues`. */
  initialValues?: Record<string, any>;
  /** Merged last over the assembled context. */
  context?: Partial<FormContextProps>;
}

export type RenderWithFormContextResult = RenderResult & {
  /** Latest context snapshot, re-captured on every render of the harness. */
  getContext: () => FormContextProps;
};

/**
 * Renders `ui` inside a real `FormProvider` wired the same way `FormRenderer` wires
 * it: real `useForm`, real `formStateReducer`, real `useFormStateHelpers` — minus
 * expression evaluation, page observation, and form registration. Replaces the
 * mock-the-whole-provider pattern in component tests.
 *
 * Limitation: there is no `FormFactoryProvider` in the tree, so components that
 * call `useFormFactory()` (e.g. the repeat control) will throw. Wrap or extend the
 * harness when testing those.
 */
export function renderWithFormContext(
  ui: React.ReactElement,
  options: RenderWithFormContextOptions = {},
): RenderWithFormContextResult {
  const contextRef: { current: FormContextProps | null } = { current: null };
  const resolvedFormJson = options.formJson ?? buildFormSchema({ questions: options.fields ?? [] });

  const Harness = ({ children }: { children: React.ReactNode }) => {
    const methods = useForm({
      defaultValues: options.initialValues ?? {},
      mode: 'onChange',
      reValidateMode: 'onChange',
      criteriaMode: 'all',
    });
    const [{ formFields, invalidFields, formJson, deletedFields }, dispatch] = useReducer(formStateReducer, {
      ...initialState,
      formFields: options.fields ?? [],
      formJson: resolvedFormJson,
    });
    const helpers = useFormStateHelpers(dispatch, formFields);
    const base = useMemo(() => createTestFormContext({ formJson: resolvedFormJson }), []);
    const context = {
      ...base,
      methods,
      formFields,
      formJson,
      invalidFields,
      deletedFields,
      ...helpers,
      ...options.context,
    } as FormContextProps;
    contextRef.current = context;
    return <FormProvider {...context}>{children}</FormProvider>;
  };

  const result = render(ui, { wrapper: Harness });
  return Object.assign(result, {
    getContext: () => {
      if (!contextRef.current) {
        throw new Error('renderWithFormContext: context has not been rendered yet');
      }
      return contextRef.current;
    },
  });
}
