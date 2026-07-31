import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { usePostSubmissionActions } from './usePostSubmissionActions';
import { getRegisteredPostSubmissionAction } from '../registry/registry';

// Mock the getRegisteredPostSubmissionAction function
vi.mock('../registry/registry', () => ({
  getRegisteredPostSubmissionAction: vi.fn(),
}));

describe('usePostSubmissionActions', () => {
  // Mock the actual post-submission action function
  const mockPostAction = vi.fn();

  // Sample action references
  const actionRefs = [
    { actionId: 'action1', config: { param1: 'value1' } },
    { actionId: 'action2', config: { param2: 'value2' } },
  ];

  // Set up the mock implementation for getRegisteredPostSubmissionAction
  beforeEach(() => {
    vi.mocked(getRegisteredPostSubmissionAction).mockImplementation((actionId) => {
      if (actionId === 'action1') {
        return Promise.resolve(mockPostAction);
      }
      return Promise.resolve(null);
    });
  });

  it('should fetch post-submission actions and return them', async () => {
    const { result } = renderHook(() => usePostSubmissionActions(actionRefs));

    // Wait for the effect to complete
    await act(async () => {});

    expect(result.current).toEqual([
      { postAction: mockPostAction, config: { param1: 'value1' }, actionId: 'action1' },
      { postAction: null, config: { param2: 'value2' }, actionId: 'action2' },
    ]);
  });
});
