import React from 'react';
import type { FormField } from './types';

export type ExternalFunctionContextProps = {
  handleConfirmQuestionDeletion: (question: Readonly<FormField>) => Promise<void>;
};

export const ExternalFunctionContext = React.createContext<ExternalFunctionContextProps | undefined>(undefined);
