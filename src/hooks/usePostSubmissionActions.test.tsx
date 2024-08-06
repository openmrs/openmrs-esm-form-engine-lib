import { renderHook, act } from '@testing-library/react';
import { usePostSubmissionActions } from './usePostSubmissionActions';

// Mock the getRegisteredPostSubmissionAction function
jest.mock('../registry/registry', () => ({
  getRegisteredPostSubmissionAction: jest.fn(),
}));

describe('usePostSubmissionActions', () => {
  // Mock the actual post-submission action function
  const mockPostAction = jest.fn();

  // Sample action references
  const actionRefs = [
    { actionId: 'action1', config: { param1: 'value1' } },
    { actionId: 'action2', config: { param2: 'value2' } },
  ];

  // Set up the mock implementation for getRegisteredPostSubmissionAction
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global.console, 'error').mockImplementation(() => {});
    jest.requireMock('../registry/registry').getRegisteredPostSubmissionAction.mockImplementation((actionId) => {
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
