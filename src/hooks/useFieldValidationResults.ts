import { useEffect, useState } from 'react';
import { type FormField } from '../types';

export function useFieldValidationResults(field: FormField) {
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (field.meta?.submission) {
      setErrors((previousErrors) => [...previousErrors, field.meta.submission.errors || []]);
      setWarnings((previousWarnings) => [...previousWarnings, field.meta.submission.warnings || []]);
    }
  }, [field.meta?.submission]);

  return { errors, warnings, setErrors, setWarnings };
}
