import { openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useSWRImmutable from 'swr/immutable';

export interface SystemSetting {
  uuid: string;
  property: string;
  value: string;
}

export function useSystemSetting(setting: string) {
  const { t } = useTranslation();
  const apiUrl = `${restBaseUrl}/systemsetting/${setting}?v=custom:(value)`;
  const { data, error, isLoading } = useSWRImmutable<{ data: SystemSetting }, Error>(apiUrl, openmrsFetch);

  useEffect(() => {
    if (error) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: error?.message,
        kind: 'error',
        isLowContrast: false,
      });
    }
  }, [error]);

  return {
    systemSetting: data?.data,
    error: error,
    isLoading: isLoading,
    isValueUuid:
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data?.data?.value) ||
      /^[0-9a-f]{36}$/i.test(data?.data?.value),
  };
}
