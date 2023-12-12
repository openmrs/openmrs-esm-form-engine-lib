import { PostSubmissionAction } from '../../api/types';
import { ComponentRegistration } from '../registry';

export const inbuiltPostSubmissionActions: Array<ComponentRegistration<PostSubmissionAction>> = [
  {
    name: 'ProgramEnrollmentSubmissionAction',
    load: () => import('../../post-submission-actions/program-enrollment-action'),
  },
];
