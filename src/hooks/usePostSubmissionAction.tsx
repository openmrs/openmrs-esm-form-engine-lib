import { useEffect, useState } from 'react';
import { PostSubmissionAction } from '../api/types';
import { getPostSubmissionActionById } from '../registry/registry';

export function usePostSubmissionAction(actionIds: Array<string>) {
  const [actions, setActions] = useState<Array<PostSubmissionAction>>([]);
  useEffect(() => {
    let actionArray = [];
    if (actionIds) {
      actionIds.map(actionId => {
        getPostSubmissionActionById(actionId).then(response => actionArray.push(response.default));
      });
    }
    setActions(actionArray);
  }, [actionIds]);

  return actions;
}
