import { useLayoutEffect, useState } from 'react';

/**
 * This hook evaluates the layout of the current workspace based on the width of the container element
 */
export function useWorkspaceLayout(rootRef): 'minimized' | 'maximized' {
  const [layout, setLayout] = useState<'minimized' | 'maximized'>('minimized');
  const TABLET_MAX = 1023;

  useLayoutEffect(() => {
    const handleResize = () => {
      const containerWidth = rootRef.current?.parentElement?.offsetWidth;
      containerWidth && setLayout(containerWidth > TABLET_MAX ? 'maximized' : 'minimized');
    };
    handleResize();
    const resizeObserver = new ResizeObserver((entries) => {
      handleResize();
    });

    resizeObserver.observe(rootRef.current?.parentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [rootRef]);

  return layout;
}
