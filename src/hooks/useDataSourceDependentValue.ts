import { useWatch } from 'react-hook-form';
import { type FormField } from '../types';
import { useFormProviderContext } from '../provider/form-provider';

const useDataSourceDependentValue = (field: FormField) => {
  const dependentField = field.questionOptions['config']?.referencedField;
  const {
    methods: { control },
  } = useFormProviderContext();

  const dependentValue = useWatch({ control, name: dependentField, exact: true, disabled: !dependentField });

  return dependentValue;
};

export default useDataSourceDependentValue;
