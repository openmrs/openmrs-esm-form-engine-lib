import { createContext } from 'react';
import type { FormField } from './types';

/**
 * Context to pass callback functions from frontend modules to the form engine.
 * This context allows the form engine to access functions defined in the consuming
 * modules, facilitating interactions such as confirming the deletion of a form question.
 */
export type ExternalFunctionContextType = {
  handleConfirmQuestionDeletion: (question: Readonly<FormField>) => Promise<void>;
};

export const ExternalFunctionContext = createContext<ExternalFunctionContextType | undefined>(undefined);
