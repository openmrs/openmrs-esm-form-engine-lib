import { useEffect, useState } from 'react';
import { type FormField } from '../types';

export function useFieldValidationResults(field: FormField) {
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (field.meta.submission?.errors) {
      setErrors(field.meta.submission.errors);
    }
    if (field.meta?.submission?.warnings) {
      setWarnings(field.meta.submission.warnings);
    }
  }, [field.meta?.submission]);

  return { errors, warnings, setErrors, setWarnings };
}
