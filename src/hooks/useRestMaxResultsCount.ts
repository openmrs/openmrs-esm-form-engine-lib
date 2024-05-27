import useSystemSetting from './useSystemSetting';

export default function useRestMaxResultsCount() {
  return useSystemSetting('webservices.rest.maxResultsDefault');
}
