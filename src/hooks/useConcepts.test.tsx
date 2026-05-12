import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { useConcepts } from './useConcepts';

const mockOpenmrsFetch = openmrsFetch as jest.Mock;

describe('useConcepts', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockReset();
  });

  it('does not call openmrsFetch when references is empty', async () => {
    const { result } = renderHook(() => useConcepts([]));

    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    expect(result.current.concepts).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not call openmrsFetch when references is null', async () => {
    const { result } = renderHook(() => useConcepts(null as unknown as string[]));

    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    expect(result.current.concepts).toBeUndefined();
  });

  it('POSTs to /conceptreferences with the provided references when non-empty', async () => {
    mockOpenmrsFetch.mockResolvedValue({
      data: {
        '164400AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': {
          uuid: '164400AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          display: 'Concept A',
          conceptClass: { uuid: 'cc-uuid', display: 'Question' },
          answers: [],
          conceptMappings: [],
        },
      },
    });

    const refs = ['164400AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'];
    const { result } = renderHook(() => useConcepts(refs));

    await waitFor(() => expect(result.current.concepts).toBeDefined());

    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockOpenmrsFetch.mock.calls[0];
    expect(url).toContain('/conceptreferences');
    expect(options.method).toBe('POST');
    expect(options.body).toEqual({ references: refs });
    expect(result.current.concepts).toHaveLength(1);
  });
});
