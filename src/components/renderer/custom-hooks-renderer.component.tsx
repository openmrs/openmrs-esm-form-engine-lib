import { useEffect } from 'react';
import { type FormProcessorContextProps } from '../../types';
import { type FormProcessorContextSetters, type GetCustomHooksResponse } from '../../processors/form-processor';

export const CustomHooksRenderer = ({
  context,
  setContext,
  setters,
  useCustomHooks,
  setIsLoadingCustomHooks,
}: {
  context: FormProcessorContextProps;
  setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>;
  setters: FormProcessorContextSetters;
  useCustomHooks: GetCustomHooksResponse['useCustomHooks'];
  setIsLoadingCustomHooks: (isLoading: boolean) => void;
}) => {
  const { isLoading = false, error = null, data, updateContext } = useCustomHooks(context);

  useEffect(() => {
    if (!isLoading && updateContext) {
      updateContext(setContext, setters);
      setIsLoadingCustomHooks(false);
    }
  }, [isLoading]);

  return null;
};
