import { useEffect, useState } from 'react';
import { type FormProcessorContextProps } from '../types';
import { type FormProcessor } from '../processors/form-processor';
import { reportError } from '../utils/error-utils';

const useProcessorDependencies = (
  formProcessor: FormProcessor,
  context: Partial<FormProcessorContextProps>,
  setContext: (context: FormProcessorContextProps) => void,
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { loadDependencies } = formProcessor;

  useEffect(() => {
    if (loadDependencies) {
      setIsLoading(true);
      loadDependencies(context, setContext)
        .then((results) => {
          setIsLoading(false);
        })
        .catch((error) => {
          setError(error);
          reportError(error, 'Load processor dependencies failed');
        });
    }
  }, [loadDependencies]);

  return { isLoading, error };
};

export default useProcessorDependencies;
