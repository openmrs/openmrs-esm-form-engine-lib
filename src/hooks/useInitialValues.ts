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
  const [error, setError] = useState(null);

  useEffect(() => {
    if (
      formProcessor &&
      !isLoadingContextDependencies &&
      context.formFields?.length &&
      Object.keys(context.formFieldAdapters).length &&
      !Object.keys(initialValues).length
    ) {
      formProcessor
        .getInitialValues(context)
        .then((values) => {
          setInitialValues(values);
          setIsLoadingInitialValues(false);
        })
        .catch((error) => {
          console.error(error);
          setError(error);
          setIsLoadingInitialValues(false);
        });
    }
  }, [formProcessor, isLoadingContextDependencies, context, initialValues]);

  return { isLoadingInitialValues, initialValues, error };
};

export default useInitialValues;
