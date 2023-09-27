import { useEffect, useState } from 'react';
import { getControlTemplate } from '../registry/inbuilt-components/control-templates';
import { OHRIFormField } from '../api/types';
import { useTranslation } from 'react-i18next';

export function useDataSourceConfig(field: OHRIFormField) {
  const [config, setConfig] = useState({});
  const { t } = useTranslation();

  useEffect(() => {
    if (field.questionOptions.datasource?.name) {
      setConfig(field.questionOptions.datasource.config);
    } else {
      const template = getControlTemplate(field.questionOptions.rendering);
      setConfig(template.datasource.config);
    }
  }, [field]);

  return {
    config,
  };
}
