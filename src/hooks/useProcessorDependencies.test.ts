import { act, renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { type FormSchema } from '../types';
import { type FormProcessorContextSetters } from '../processors/form-processor';
import { EncounterFormProcessor } from '../processors/encounter/encounter-form-processor';
import { loadZScoreReferences } from '../utils/zscore-service';
import useProcessorDependencies from './useProcessorDependencies';

vi.mock('../utils/zscore-service', () => ({ loadZScoreReferences: vi.fn() }));

const mockLoadZScoreReferences = vi.mocked(loadZScoreReferences);

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

  it('blocks evaluation after a failed table load and retries', async () => {
    mockLoadZScoreReferences.mockRejectedValueOnce(new Error('Download failed'));
    const { result } = renderDependencies((context) => Promise.resolve(context));
    await waitFor(() => expect(result.current.error?.message).toBe('Download failed'));
    expect(result.current.isLoading).toBe(true);
    act(() => result.current.retry());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeUndefined();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockLoadZScoreReferences).toHaveBeenCalledTimes(2);
  });

  it('keeps its result when the form passes an equal schema object again', async () => {
    const processor = processorLoading((context) => Promise.resolve(context));
    const { result, rerender } = renderHook(
      ({ schema }) => useProcessorDependencies(processor, { formJson: schema }, vi.fn(), setters),
      { initialProps: { schema: formJson } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ schema: structuredClone(formJson) });

    expect(result.current.isLoading).toBe(false);
    expect(mockLoadZScoreReferences).toHaveBeenCalledOnce();
  });
});
