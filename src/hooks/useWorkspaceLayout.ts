import { useLayoutType } from '@openmrs/esm-framework';
import { useEffect, useState } from 'react';

export function useWorkspaceLayout(ref): 'minimized' | 'maximized' {
  const [mode, setMode] = useState<'minimized' | 'maximized'>('maximized');
  const layout = useLayoutType();

  useEffect(() => {
    if (ref?.current) {
      const width = ref.current.offsetWidth;
      if (layout.endsWith('desktop') && width < 1000) {
        setMode('minimized');
      } else {
        setMode('maximized');
      }
    }
  }, [ref?.current, ref?.current?.offsetWidth, layout]);

  return mode;
}
