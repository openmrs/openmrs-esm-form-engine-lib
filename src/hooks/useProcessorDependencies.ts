import { useCallback, useEffect, useState } from 'react';
import { type FormProcessorContextProps } from '../types';
import { type FormProcessor, type FormProcessorContextSetters } from '../processors/form-processor';
import { loadZScoreReferences } from '../utils/zscore-service';

const useProcessorDependencies = (
  formProcessor: FormProcessor,
  context: Partial<FormProcessorContextProps>,
  setContext: React.Dispatch<React.SetStateAction<FormProcessorContextProps>>,
  setters: FormProcessorContextSetters,
) => {
  const { loadDependencies } = formProcessor;
  const { formJson } = context;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    loadDependencies: typeof loadDependencies;
    attempt: number;
    error: Error | null;
  }>(null);
  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);
  // A retry is pending on its first render, before the effect runs.
  const currentResult = result?.loadDependencies === loadDependencies && result?.attempt === attempt ? result : null;

  useEffect(() => {
    let ignore = false;

    async function load() {
      // Wait for both operations to finish before allowing a retry, including when one fails.
      const results = await Promise.allSettled([
        Promise.resolve().then(() => loadDependencies?.(context, setContext, setters)),
        loadZScoreReferences(formJson),
      ]);
      if (!ignore) {
        const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        setResult({
          loadDependencies,
          attempt,
          error: failure ? new Error(failure.reason?.message ?? String(failure.reason)) : null,
        });
      }
    }
    load();

    return () => {
      ignore = true;
    };
  }, [loadDependencies, attempt]);

  // Failed dependencies must also keep initial values, expressions and submission blocked.
  return { isLoading: !currentResult || !!currentResult.error, error: currentResult?.error, retry };
};

export default useProcessorDependencies;
