import { useEffect, useState } from 'react';
import { type FormProcessorContextProps } from '../types';
import { type FormProcessor } from '../processors/form-processor';

const useInitialValues = (
  formProcessor: FormProcessor,
  isLoadingContextDependencies: boolean,
  context: FormProcessorContextProps,
) => {
  const [isLoadingInitialValues, setIsLoadingInitialValues] = useState(true);
  const [initialValues, setInitialValues] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (formProcessor && !isLoadingContextDependencies && context.formFieldAdapters && context.formFields?.length) {
      formProcessor
        .getInitialValues(context)
        .then((values) => {
          setInitialValues(values);
          setIsLoadingInitialValues(false);
        })
        .catch((error) => {
          setError(error);
        });
    }
  }, [formProcessor, isLoadingContextDependencies, context]);

  return { isLoadingInitialValues, initialValues, error };
};

export default useInitialValues;
