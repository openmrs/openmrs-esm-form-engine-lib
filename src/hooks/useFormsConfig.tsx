import { useEffect, useState } from 'react';
import get from 'lodash-es/get';
import { getConfig } from '@openmrs/esm-framework';
import { ConceptTrue, ConceptFalse } from '../constants';

export interface FormsConfig {
  conceptTrue: string;
  conceptFalse: string;
}
const defaultOptions: FormsConfig = {
  conceptTrue: ConceptTrue,
  conceptFalse: ConceptFalse,
};

export function useFormsConfig(moduleName: string, configPath: string) {
  const [config, setConfig] = useState<FormsConfig>(defaultOptions);

  useEffect(() => {
    if (moduleName && configPath) {
      getConfig(moduleName).then((c) => {
        setConfig({ config, ...get(c, configPath, config) });
      });
    }
  }, [moduleName, configPath, config]);

  return config;
}
