import { useEffect } from 'react';
import { type FormProcessorContextProps } from '../../types';

export const CustomHooksRenderer = ({
  context,
  setContext,
  useCustomHooks,
  setIsLoadingCustomHooks,
}: {
  context: FormProcessorContextProps;
  setContext: (context: FormProcessorContextProps) => void;
  useCustomHooks: (context: FormProcessorContextProps) => {
    data: any;
    isLoading: boolean;
    error: any;
    updateContext: (data: any, setContext: (context: FormProcessorContextProps) => void) => void;
  };
  setIsLoadingCustomHooks: (isLoading: boolean) => void;
}) => {
  const { isLoading = false, error = null, data, updateContext } = useCustomHooks(context);

  useEffect(() => {
    if (data && updateContext) {
      updateContext(data, setContext);
      setIsLoadingCustomHooks(false);
    }
  }, [isLoading]);

  return null;
};
