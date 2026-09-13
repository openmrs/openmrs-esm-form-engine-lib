import { useEffect, useRef, useState } from 'react';
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

  const contextRef = useRef(context);
  contextRef.current = context;

  const hasStartedLoading = useRef(false);
  const hasFormFields = context.formFields?.length > 0;
  const hasFormFieldAdapters = Object.keys(context.formFieldAdapters ?? {}).length > 0;

  useEffect(() => {
    if (
      formProcessor &&
      !isLoadingContextDependencies &&
      hasFormFields &&
      hasFormFieldAdapters &&
      !hasStartedLoading.current
    ) {
      hasStartedLoading.current = true;
      const currentContext = contextRef.current;
      formProcessor
        .getInitialValues(currentContext)
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
  }, [formProcessor, isLoadingContextDependencies, hasFormFields, hasFormFieldAdapters]);

  return { isLoadingInitialValues, initialValues, error };
};

export default useInitialValues;
