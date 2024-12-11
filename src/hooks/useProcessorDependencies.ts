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
    let ignore = false;

    if (loadDependencies) {
      setIsLoading(true);
      loadDependencies(context, setContext)
        .then(() => {
          if (!ignore) {
            setIsLoading(false);
          }
        })
        .catch((error) => {
          if (!ignore) {
            setError(error);
            reportError(error, 'Encountered error while loading dependencies');
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [loadDependencies]);

  return { isLoading, error };
};

export default useProcessorDependencies;
