import React from 'react';
import type { FormField } from '../../types';

export type HandleConfirmDeletionProps = {
  handleConfirmQuestionDeletion: (question: Readonly<FormField>) => Promise<void>;
};

export const HandleDeletionConfirmationContext = React.createContext<HandleConfirmDeletionProps | undefined>(undefined);
