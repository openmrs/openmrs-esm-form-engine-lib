import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { type FormSchema } from '../types';
import { type FormProcessorContextSetters } from '../processors/form-processor';
import { EncounterFormProcessor } from '../processors/encounter/encounter-form-processor';
import { reportError } from '../utils/error-utils';
import { loadZScoreReferences } from '../utils/zscore-service';
import useProcessorDependencies from './useProcessorDependencies';

vi.mock('../utils/zscore-service', () => ({ loadZScoreReferences: vi.fn() }));
vi.mock('../utils/error-utils', () => ({ reportError: vi.fn() }));

const mockLoadZScoreReferences = vi.mocked(loadZScoreReferences);
const mockReportError = vi.mocked(reportError);

const formJson: FormSchema = {
  name: 'Growth',
  processor: 'EncounterFormProcessor',
  uuid: 'growth-form',
  referencedForms: [],
  encounterType: 'encounter-type',
  pages: [],
};

const setters: FormProcessorContextSetters = {
  setDomainObjectValue: vi.fn(),
  setPreviousDomainObjectValue: vi.fn(),
  setCustomDependencies: vi.fn(),
};

function processorLoading(loadDependencies: EncounterFormProcessor['loadDependencies']) {
  const processor = new EncounterFormProcessor(formJson);
  processor.loadDependencies = loadDependencies;
  return processor;
}

function renderDependencies(loadDependencies: EncounterFormProcessor['loadDependencies']) {
  const processor = processorLoading(loadDependencies);
  return renderHook(() => useProcessorDependencies(processor, { formJson }, vi.fn(), setters));
}

describe('useProcessorDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadZScoreReferences.mockResolvedValue(undefined);
  });

  it('is loading from the first render', () => {
    const processor = processorLoading(() => new Promise(() => {}));
    const isLoadingOnEachRender: Array<boolean> = [];

    renderHook(() => {
      const dependencies = useProcessorDependencies(processor, { formJson }, vi.fn(), setters);
      isLoadingOnEachRender.push(dependencies.isLoading);
      return dependencies;
    });

    expect(isLoadingOnEachRender[0]).toBe(true);
  });

  it("waits for the form's z-score tables as well as the processor's dependencies", async () => {
    let finishLoadingTables: () => void;
    mockLoadZScoreReferences.mockReturnValue(new Promise((resolve) => (finishLoadingTables = resolve)));

    const { result } = renderDependencies((context) => Promise.resolve(context));

    await waitFor(() => expect(mockLoadZScoreReferences).toHaveBeenCalledWith(formJson));
    expect(result.current.isLoading).toBe(true);

    finishLoadingTables();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('finishes loading and reports the error when the z-score tables fail to load', async () => {
    const error = new Error('Failed to fetch dynamically imported module');
    mockLoadZScoreReferences.mockRejectedValue(error);

    const { result } = renderDependencies((context) => Promise.resolve(context));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('');
    expect(mockReportError).toHaveBeenCalledWith(error, 'Error loading z-score reference data');
  });
});
