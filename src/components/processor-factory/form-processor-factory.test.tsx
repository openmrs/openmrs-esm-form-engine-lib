import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { mockPatient, mockVisit } from '__mocks__';
import { buildField, buildFormSchema } from '../../test-support';
import { type FormProcessorContextProps } from '../../types';
import {
  FormProcessor,
  type FormProcessorContextSetters,
  type GetCustomHooksResponse,
} from '../../processors/form-processor';
import FormProcessorFactory from './form-processor-factory.component';

const capturedContexts: FormProcessorContextProps[] = [];

vi.mock('../renderer/form/form-renderer.component', () => ({
  FormRenderer: ({ processorContext }: { processorContext: FormProcessorContextProps }) => {
    capturedContexts.push(processorContext);
    return <div data-testid="form-renderer" />;
  },
}));

vi.mock('../../hooks/useConcepts', () => ({
  useConcepts: vi.fn().mockReturnValue({ concepts: undefined, isLoading: false, error: undefined }),
}));

vi.mock('../../hooks/useInitialValues', () => ({
  default: vi.fn().mockReturnValue({ isLoadingInitialValues: false, initialValues: {}, error: undefined }),
}));

const mockUseFormFactory = vi.fn();
vi.mock('../../provider/form-factory-provider', () => ({
  useFormFactory: () => mockUseFormFactory(),
}));

function buildProcessor({
  loadDependencies,
  updateContext,
}: {
  loadDependencies?: FormProcessor['loadDependencies'];
  updateContext?: ReturnType<GetCustomHooksResponse['useCustomHooks']>['updateContext'];
} = {}) {
  return class TestProcessor extends FormProcessor {
    loadDependencies = loadDependencies ?? (async () => ({}));

    getCustomHooks(): GetCustomHooksResponse {
      return {
        useCustomHooks: () => ({
          data: null,
          isLoading: false,
          error: null,
          updateContext: updateContext ?? (() => {}),
        }),
      };
    }

    prepareFormSchema = (schema) => schema;
    getHistoricalValue = vi.fn();
    processSubmission = vi.fn();
    getInitialValues = vi.fn(async () => ({}));
  };
}

function renderFactory(ProcessorClass: ReturnType<typeof buildProcessor>) {
  const formJson = buildFormSchema({
    questions: [buildField({ id: 'cough', questionOptions: { concept: 'PIH:COUGH' } })],
  });
  formJson.processor = 'TestProcessor';

  mockUseFormFactory.mockReturnValue({
    patient: mockPatient,
    sessionMode: 'enter',
    sessionDate: new Date('2026-01-01T00:00:00Z'),
    layoutType: 'small-desktop',
    location: { uuid: 'location-uuid' },
    provider: { uuid: 'provider-uuid' },
    visit: mockVisit,
    formProcessors: { TestProcessor: ProcessorClass },
  });

  return render(<FormProcessorFactory formJson={formJson} setIsLoadingFormDependencies={vi.fn()} />);
}

const latestContext = () => capturedContexts[capturedContexts.length - 1];

describe('FormProcessorFactory', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    capturedContexts.length = 0;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('applies previousDomainObjectValue set through the setters passed to loadDependencies', async () => {
    const previousEncounter = { uuid: 'previous-encounter-uuid' };
    const ProcessorClass = buildProcessor({
      loadDependencies: async (_context, _setContext, { setPreviousDomainObjectValue }) => {
        setPreviousDomainObjectValue(previousEncounter);
        return {};
      },
    });

    renderFactory(ProcessorClass);

    await waitFor(() => expect(latestContext()?.previousDomainObjectValue).toEqual(previousEncounter));
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('merges customDependencies contributed by both loadDependencies and a custom hook', async () => {
    // Both use the updater form: a custom hook's updateContext runs on mount while
    // loadDependencies resolves asynchronously, so the two arrive in no guaranteed order.
    const ProcessorClass = buildProcessor({
      loadDependencies: async (_context, _setContext, { setCustomDependencies }) => {
        setCustomDependencies((previous) => ({ ...previous, first: 1 }));
        return {};
      },
      updateContext: (_setContext, { setCustomDependencies }) => {
        setCustomDependencies((previous) => ({ ...previous, second: 2 }));
      },
    });

    renderFactory(ProcessorClass);

    await waitFor(() => expect(latestContext()?.customDependencies).toEqual({ first: 1, second: 2 }));
  });

  it('replaces customDependencies wholesale when given a plain object', async () => {
    const ProcessorClass = buildProcessor({
      loadDependencies: async (_context, _setContext, { setCustomDependencies }) => {
        setCustomDependencies((previous) => ({ ...previous, first: 1 }));
        setCustomDependencies({ second: 2 });
        return {};
      },
    });

    renderFactory(ProcessorClass);

    await waitFor(() => expect(latestContext()?.customDependencies).toEqual({ second: 2 }));
  });

  it('still applies the mutable properties a processor sets through the deprecated setContext', async () => {
    const domainObject = { uuid: 'encounter-uuid' };
    const ProcessorClass = buildProcessor({
      loadDependencies: async (_context, setContext) => {
        setContext((context) => ({ ...context, domainObjectValue: domainObject }));
        return {};
      },
    });

    renderFactory(ProcessorClass);

    await waitFor(() => expect(latestContext()?.domainObjectValue).toEqual(domainObject));
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns and ignores factory-owned properties a processor sets through setContext', async () => {
    const ProcessorClass = buildProcessor({
      loadDependencies: async (_context, setContext) => {
        setContext((context) => ({ ...context, formFields: [], sessionMode: 'view' }));
        return {};
      },
    });

    renderFactory(ProcessorClass);

    await screen.findByTestId('form-renderer');
    await waitFor(() => expect(warnSpy).toHaveBeenCalled());

    const message = warnSpy.mock.calls[0][0] as string;
    expect(message).toContain('sessionMode');
    expect(message).toContain('formFields');

    expect(latestContext()?.sessionMode).toBe('enter');
    expect(latestContext()?.formFields.map((field) => field.id)).toEqual(['cough']);
  });
});
