import { useEffect, useState } from 'react';
import { useField } from 'formik';
import { type FormField } from '../types';

const useDatasourceDependentValue = (question: FormField) => {
  const dependentField = question.questionOptions['config']?.referencedField;
  const [field] = useField(dependentField);
  const [dependentValue, setDependentValue] = useState();

  useEffect(() => {
    if (dependentField) {
      setDependentValue(field.value);
    }
  }, [field]);

  return dependentValue;
};

export default useDatasourceDependentValue;
