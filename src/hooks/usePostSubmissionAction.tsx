import { useEffect, useState } from 'react';
import { PostSubmissionAction } from '../api/types';
import { getRegisteredPostSubmissionAction } from '../registry/registry';

export function usePostSubmissionAction(actionRefs: Array<{ actionId: string; config?: Record<string, any> }>) {
  const [actions, setActions] = useState<Array<{ postAction: PostSubmissionAction; config: Record<string, any> }>>([]);
  useEffect(() => {
    const actionArray = [];
    if (actionRefs?.length) {
      actionRefs.map(ref => {
        const actionId = typeof ref === 'string' ? ref : ref.actionId;
        getRegisteredPostSubmissionAction(actionId)?.then(action =>
          actionArray.push({ postAction: action, config: ref.config }),
        );
      });
    }
    setActions(actionArray);
  }, [actionRefs]);

  return actions;
}
