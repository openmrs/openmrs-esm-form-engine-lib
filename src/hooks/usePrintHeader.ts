import { useRef, useMemo, useEffect } from 'react';
import * as ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { formEngineAppName } from '../globals';

interface UsePrintHeaderParams {
  contentRef: React.RefObject<HTMLDivElement>;
  headerComponent: React.ReactNode;
}

/**
 * Hook to manage printing headers with React components
 * Handles the insertion and removal of a React component as a print header
 */
export const usePrintHeader = ({ contentRef, headerComponent }: UsePrintHeaderParams) => {
  // Refs to track the container and React root
  const printHeaderContainerRef = useRef<HTMLDivElement | null>(null);
  const reactRootRef = useRef<ReactDOM.Root | null>(null);

  // Cleanup function to properly unmount React components
  const cleanupPrintHeader = () => {
    if (reactRootRef.current) {
      reactRootRef.current.unmount();
      reactRootRef.current = null;
    }
    printHeaderContainerRef.current = null;
  };

  // Setup cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupPrintHeader();
    };
  }, []);

  // Functions to handle print events
  const handleBeforePrint = async (): Promise<void> => {
    const printNode = contentRef.current;
    if (printNode) {
      // Create a container for the print header if it doesn't exist
      if (!printHeaderContainerRef.current) {
        const headerContainer = document.createElement('div');
        headerContainer.className = 'print-header-container';
        printHeaderContainerRef.current = headerContainer;
      }

      // Insert the container at the beginning of the content
      if (!printNode.contains(printHeaderContainerRef.current)) {
        printNode.insertBefore(printHeaderContainerRef.current, printNode.firstChild);
      }

      // Create a React root and render the component
      if (printHeaderContainerRef.current) {
        reactRootRef.current = ReactDOM.createRoot(printHeaderContainerRef.current);
        reactRootRef.current.render(headerComponent);
      }
    }
  };

  const handleAfterPrint = () => {
    // Remove the print header after printing
    const printNode = contentRef.current;
    if (printNode && printHeaderContainerRef.current && printNode.contains(printHeaderContainerRef.current)) {
      // Unmount the React component
      if (reactRootRef.current) {
        reactRootRef.current.unmount();
        reactRootRef.current = null;
      }
      printNode.removeChild(printHeaderContainerRef.current);
    }
  };

  return {
    handleBeforePrint,
    handleAfterPrint,
    cleanupPrintHeader,
  };
};
