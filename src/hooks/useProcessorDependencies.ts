import { useEffect, useState } from 'react';
import { type FormProcessorContextProps } from '../types';
import { type FormProcessor, type FormProcessorContextSetters } from '../processors/form-processor';
import { reportError } from '../utils/error-utils';
import { loadZScoreReferences } from '../utils/zscore-service';

const useProcessorDependencies = (
  formProcessor: FormProcessor,
  context: Partial<FormProcessorContextProps>,
  setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>,
  setters: FormProcessorContextSetters,
) => {
  const { loadDependencies } = formProcessor;
  // Loading from the first render: once a form has opened, its field adapters and concepts are cached, so
  // initial values would otherwise be computed before this effect had started loading the dependencies
  const [isLoading, setIsLoading] = useState(Boolean(loadDependencies));
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    if (loadDependencies) {
      setIsLoading(true);
      Promise.all([
        loadDependencies(context, setContext, setters),
        // A form whose z-score tables fail to load still opens, and its z-score helpers return null
        loadZScoreReferences(context.formJson).catch((error) =>
          reportError(error, 'Error loading z-score reference data'),
        ),
      ])
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
