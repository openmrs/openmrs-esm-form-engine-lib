import { useEffect, useState } from 'react';
import { getRegisteredPostSubmissionAction } from '../registry/registry';
import { type PostSubmissionAction } from '../types';

export interface PostSubmissionActionMeta {
  postAction: PostSubmissionAction;
  actionId: string;
  config: Record<string, any>;
  enabled?: string;
}

export function usePostSubmissionActions(
  actionRefs: Array<{ actionId: string; enabled?: string; config?: Record<string, any> }>,
): Array<PostSubmissionActionMeta> {
  const [actions, setActions] = useState<Array<PostSubmissionActionMeta>>([]);

  useEffect(() => {
    const actionArray: Array<PostSubmissionActionMeta> = [];
    if (actionRefs?.length) {
      actionRefs.map((ref) => {
        const actionId = typeof ref === 'string' ? ref : ref.actionId;
        getRegisteredPostSubmissionAction(actionId)?.then((action) =>
          actionArray.push({ postAction: action, config: ref.config, actionId: actionId, enabled: ref.enabled }),
        );
      });
    }
    setActions(actionArray);
  }, [actionRefs]);

  return actions;
}
