import { getConfig } from '@openmrs/esm-framework';
import { useEffect, useState } from 'react';
import { ConceptTrue, ConceptFalse } from '../constants';
import { get } from 'lodash-es';

export interface OHRIFormsConfig {
  conceptTrue: string;
  conceptFalse: string;
}
const defaultOptions: OHRIFormsConfig = {
  conceptTrue: ConceptTrue,
  conceptFalse: ConceptFalse,
};

export function useFormsConfig(moduleName: string, configPath: string) {
  const [config, setConfig] = useState<OHRIFormsConfig>(defaultOptions);

  useEffect(() => {
    if (moduleName && configPath) {
      getConfig(moduleName).then(c => {
        setConfig({ config, ...get(c, configPath, config) });
      });
    }
  }, [moduleName, configPath]);

  return config;
}
