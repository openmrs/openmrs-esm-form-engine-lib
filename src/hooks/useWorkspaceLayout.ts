import { useLayoutEffect, useState } from 'react';

/**
 * This hook evaluates the layout of the current workspace based on the width of the container element
 */
export function useWorkspaceLayout(rootRef): 'minimized' | 'maximized' {
  const [layout, setLayout] = useState<'minimized' | 'maximized'>('minimized');

  useLayoutEffect(() => {
    const handleResize = () => {
      const containerWidth = rootRef.current?.parentElement?.offsetWidth;
      setLayout(containerWidth >= 1000 ? 'maximized' : 'minimized');
    };
    handleResize();
    const resizeObserver = new ResizeObserver(entries => {
      handleResize();
    });

    resizeObserver.observe(rootRef.current?.parentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [rootRef]);

  return layout;
}
