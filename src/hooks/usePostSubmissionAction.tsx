import React, { useEffect, useState } from 'react';
import { PostSubmissionAction } from '../api/types';
import { getPostSubmissionActionById } from '../registry/registry';

export function usePostSubmissionAction(actionId: string) {
  const [action, setAction] = useState<PostSubmissionAction>(null);
  useEffect(() => {
    if (actionId) {
      getPostSubmissionActionById(actionId).then(response => setAction(response.default));
    }
  }, [actionId]);

  return action;
}
